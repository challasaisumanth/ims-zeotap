from fastapi import APIRouter
from app.ingestion.queue import signal_queue
from app.db.postgres import get_pool
from app.db.redis_client import get_redis

router = APIRouter(tags=["health"])

@router.get("/health")
async def health():
    pool = await get_pool()
    redis = get_redis()

    pg_ok = False
    try:
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        pg_ok = True
    except:
        pass

    redis_ok = False
    try:
        await redis.ping()
        redis_ok = True
    except:
        pass

    throughput = signal_queue.throughput()

    return {
        "status": "healthy" if (pg_ok and redis_ok) else "degraded",
        "postgres": pg_ok,
        "redis": redis_ok,
        "queue_size": throughput["queue_size"],
        "signals_per_sec": throughput["signals_per_sec"],
    }