import asyncpg
from app.config import settings
import logging

logger = logging.getLogger(__name__)
pool = None

async def init_db():
    global pool
    pool = await asyncpg.create_pool(settings.POSTGRES_URL, min_size=5, max_size=20)
    await _create_tables()
    logger.info("PostgreSQL connected")

async def _create_tables():
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS work_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                component_id TEXT NOT NULL,
                component_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT 'OPEN',
                signal_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                rca JSONB,
                mttr_minutes FLOAT
            );

            CREATE INDEX IF NOT EXISTS idx_wi_state ON work_items(state);
            CREATE INDEX IF NOT EXISTS idx_wi_component ON work_items(component_id);
        """)

async def get_pool():
    return pool