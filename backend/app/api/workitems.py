from fastapi import APIRouter, HTTPException, Depends
from app.db.postgres import get_pool
from app.db.mongo import get_signals_collection
from app.db.redis_client import get_redis
from app.models.workitem import WorkItemState, RCA
from app.workflow.state_machine import WorkItemStateMachine
from datetime import datetime
import json
import uuid

router = APIRouter(prefix="/api/workitems", tags=["workitems"])
@router.get("/")
async def list_work_items():
    redis = get_redis()
    cached = await redis.get("dashboard:workitems")
    if cached:
        return json.loads(cached)

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM work_items ORDER BY "
            "CASE state WHEN 'OPEN' THEN 1 WHEN 'INVESTIGATING' THEN 2 "
            "WHEN 'RESOLVED' THEN 3 ELSE 4 END, created_at DESC"
        )
        items = []
        for r in rows:
            item = dict(r)
            for k, v in item.items():
                if isinstance(v, datetime):
                    item[k] = v.isoformat()
                elif hasattr(v, '__str__') and 'UUID' in type(v).__name__:
                    item[k] = str(v)
            items.append(item)

    await redis.setex("dashboard:workitems", 10, json.dumps(items))
    return items

@router.get("/{item_id}")
async def get_work_item(item_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM work_items WHERE id=$1", item_id)
    if not row:
        raise HTTPException(404, "Work item not found")

    item = dict(row)
    for k, v in item.items():
        if isinstance(v, datetime):
            item[k] = v.isoformat()

    signals = get_signals_collection()
    raw_signals = await signals.find(
        {"work_item_id": item_id}, {"_id": 1, "component_id": 1, "error_message": 1, "timestamp": 1, "severity": 1}
    ).sort("timestamp", -1).limit(100).to_list(100)
    for s in raw_signals:
        s["_id"] = str(s["_id"])

    item["raw_signals"] = raw_signals
    return item

@router.patch("/{item_id}/transition")
async def transition_work_item(item_id: str, new_state: WorkItemState, rca: RCA = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM work_items WHERE id=$1", item_id)
        if not row:
            raise HTTPException(404, "Work item not found")

        sm = WorkItemStateMachine(WorkItemState(row["state"]))
        ok, reason = sm.can_transition(new_state, rca)
        if not ok:
            raise HTTPException(400, reason)

        mttr = None
        if new_state == WorkItemState.CLOSED and rca:
            delta = rca.incident_end - rca.incident_start
            mttr = delta.total_seconds() / 60

        rca_dict = rca.model_dump() if rca else None
        if rca_dict:
            for k, v in rca_dict.items():
                if isinstance(v, datetime):
                    rca_dict[k] = v.isoformat()

        await conn.execute(
            "UPDATE work_items SET state=$1, rca=$2, mttr_minutes=$3, updated_at=NOW() WHERE id=$4",
            new_state.value,
            json.dumps(rca_dict) if rca_dict else None,
            mttr,
            item_id
        )

    # Invalidate cache
    redis = get_redis()
    await redis.delete("dashboard:workitems")
    return {"success": True, "new_state": new_state, "mttr_minutes": mttr}