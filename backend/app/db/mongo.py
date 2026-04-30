from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)
client = None
db = None

async def init_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client["ims"]
    await db["signals"].create_index([("component_id", 1), ("timestamp", -1)])
    await db["signals"].create_index([("work_item_id", 1)])
    logger.info("MongoDB connected")

def get_signals_collection():
    return db["signals"]