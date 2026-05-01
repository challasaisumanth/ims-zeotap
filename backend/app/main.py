import asyncio
import logging
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.postgres import init_db, get_pool
from app.db.mongo import init_mongo, get_signals_collection
from app.db.redis_client import init_redis
from app.ingestion.queue import signal_queue
from app.ingestion.debounce import debounce_engine
from app.workflow.alerting import get_alert_strategy
from app.middleware.rate_limiter import limiter
from app.api import signals, workitems, health
from app.api.metrics import router as metrics_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def process_signals_worker():
    while True:
        batch = signal_queue.pop_batch(500)
        if not batch:
            await asyncio.sleep(0.05)
            continue

        mongo = get_signals_collection()
        pool = await get_pool()

        for signal in batch:
            component_id = signal["component_id"]
            should_create, existing_id = await debounce_engine.should_create_work_item(component_id)
            work_item_id = existing_id

            if should_create and not existing_id:
                strategy = get_alert_strategy(signal["component_type"])
                severity = strategy.get_severity(signal).value
                msg = strategy.get_message(signal)
                logger.info(f"ALERT: {msg}")

                for attempt in range(3):
                    try:
                        async with pool.acquire() as conn:
                            row = await conn.fetchrow(
                                """INSERT INTO work_items (component_id, component_type, severity, signal_count)
                                   VALUES ($1, $2, $3, 1) RETURNING id""",
                                component_id, signal["component_type"], severity
                            )
                            work_item_id = str(row["id"])
                        await debounce_engine.set_work_item_id(component_id, work_item_id)
                        break
                    except Exception as e:
                        logger.warning(f"DB write attempt {attempt+1} failed: {e}")
                        await asyncio.sleep(0.1 * (attempt + 1))

            elif work_item_id:
                for attempt in range(3):
                    try:
                        async with pool.acquire() as conn:
                            await conn.execute(
                                "UPDATE work_items SET signal_count = signal_count + 1, updated_at=NOW() WHERE id=$1",
                                work_item_id
                            )
                        break
                    except Exception as e:
                        logger.warning(f"DB update attempt {attempt+1} failed: {e}")
                        await asyncio.sleep(0.1 * (attempt + 1))

            signal["work_item_id"] = work_item_id
            try:
                await mongo.insert_one(signal)
            except Exception as e:
                logger.error(f"MongoDB insert failed: {e}")


async def throughput_logger():
    while True:
        await asyncio.sleep(5)
        stats = signal_queue.throughput()
        logger.info(
            f"[THROUGHPUT] Signals/sec: {stats['signals_per_sec']} | "
            f"Received: {stats['received']} | Processed: {stats['processed']} | "
            f"Queue: {stats['queue_size']}"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_mongo()
    await init_redis()
    asyncio.create_task(process_signals_worker())
    asyncio.create_task(throughput_logger())
    logger.info("IMS Backend started")
    yield
    logger.info("IMS Backend shutting down")


app = FastAPI(title="Incident Management System", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(signals.router)
app.include_router(workitems.router)
app.include_router(health.router)
app.include_router(metrics_router)