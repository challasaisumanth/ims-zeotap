from fastapi import APIRouter, Request, HTTPException
from app.models.signal import Signal
from app.ingestion.queue import signal_queue
from app.middleware.rate_limiter import limiter
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/signals", tags=["signals"])

@router.post("/ingest")
@limiter.limit("500/minute")
async def ingest_signal(request: Request, signal: Signal):
    """
    High-throughput ingestion endpoint.
    Writes to in-memory queue INSTANTLY — never blocks on DB.
    Returns 202 Accepted immediately.
    """
    payload = signal.model_dump()
    payload["_id"] = str(uuid.uuid4())
    payload["timestamp"] = payload["timestamp"].isoformat()
    signal_queue.push(payload)
    return {"accepted": True, "queue_size": signal_queue.size()}

@router.post("/ingest/batch")
@limiter.limit("100/minute")
async def ingest_batch(request: Request, signals: list[Signal]):
    """Batch ingestion for higher throughput."""
    if len(signals) > 1000:
        raise HTTPException(400, "Max 1000 signals per batch")
    for signal in signals:
        payload = signal.model_dump()
        payload["_id"] = str(uuid.uuid4())
        payload["timestamp"] = payload["timestamp"].isoformat()
        signal_queue.push(payload)
    return {"accepted": len(signals), "queue_size": signal_queue.size()}