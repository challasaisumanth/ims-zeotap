from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.ingestion.queue import signal_queue
from app.db.postgres import get_pool
from app.db.redis_client import get_redis
import asyncio
import json

router = APIRouter(tags=["metrics"])

# Store active websocket connections
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

@router.get("/api/metrics/summary")
async def get_metrics():
    pool = await get_pool()
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT COUNT(*) FROM work_items")
        open_count = await conn.fetchval("SELECT COUNT(*) FROM work_items WHERE state='OPEN'")
        investigating = await conn.fetchval("SELECT COUNT(*) FROM work_items WHERE state='INVESTIGATING'")
        resolved = await conn.fetchval("SELECT COUNT(*) FROM work_items WHERE state='RESOLVED'")
        closed = await conn.fetchval("SELECT COUNT(*) FROM work_items WHERE state='CLOSED'")
        avg_mttr = await conn.fetchval("SELECT AVG(mttr_minutes) FROM work_items WHERE mttr_minutes IS NOT NULL")
        p0_count = await conn.fetchval("SELECT COUNT(*) FROM work_items WHERE severity='P0' AND state != 'CLOSED'")
        by_type = await conn.fetch("SELECT component_type, COUNT(*) as cnt FROM work_items GROUP BY component_type ORDER BY cnt DESC")

    throughput = signal_queue.throughput()

    return {
        "total_incidents": total,
        "open": open_count,
        "investigating": investigating,
        "resolved": resolved,
        "closed": closed,
        "avg_mttr_minutes": round(float(avg_mttr), 1) if avg_mttr else None,
        "active_p0": p0_count,
        "signals_per_sec": throughput["signals_per_sec"],
        "total_signals_received": throughput["received"],
        "queue_size": throughput["queue_size"],
        "by_component_type": [{"type": r["component_type"], "count": r["cnt"]} for r in by_type],
    }

@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            pool = await get_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT id::text, component_id, severity, state, signal_count, "
                    "created_at, updated_at FROM work_items "
                    "ORDER BY CASE state WHEN 'OPEN' THEN 1 WHEN 'INVESTIGATING' THEN 2 "
                    "WHEN 'RESOLVED' THEN 3 ELSE 4 END, created_at DESC LIMIT 50"
                )
                items = []
                for r in rows:
                    item = dict(r)
                    for k, v in item.items():
                        if hasattr(v, 'isoformat'):
                            item[k] = v.isoformat()
                    items.append(item)

            throughput = signal_queue.throughput()
            await websocket.send_json({
                "type": "update",
                "items": items,
                "throughput": throughput,
            })
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)