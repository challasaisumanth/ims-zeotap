import redis.asyncio as aioredis
from app.config import settings
import logging

logger = logging.getLogger(__name__)
redis = None

async def init_redis():
    global redis
    redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    logger.info("Redis connected")

def get_redis():
    return redis