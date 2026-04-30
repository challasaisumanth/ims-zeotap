import asyncio
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)

DEBOUNCE_WINDOW_SECONDS = 10
DEBOUNCE_THRESHOLD = 100

class DebounceEngine:
    """
    Strategy Pattern: if 100 signals for the same component_id
    arrive within 10 seconds, only ONE work item is created.
    All signals are still stored individually (linked to the work item).
    """
    def __init__(self):
        # component_id -> (work_item_id, window_start, count)
        self._windows: Dict[str, Tuple[str, datetime, int]] = {}
        self._lock = asyncio.Lock()

    async def should_create_work_item(
        self, component_id: str
    ) -> Tuple[bool, str]:
        """
        Returns (should_create_new, existing_work_item_id_or_none)
        """
        async with self._lock:
            now = datetime.utcnow()
            if component_id in self._windows:
                wi_id, window_start, count = self._windows[component_id]
                window_age = (now - window_start).total_seconds()

                if window_age <= DEBOUNCE_WINDOW_SECONDS:
                    # Still inside the window
                    self._windows[component_id] = (wi_id, window_start, count + 1)
                    if count + 1 >= DEBOUNCE_THRESHOLD and wi_id:
                        return False, wi_id  # Deduplicate — link to existing
                    return True, wi_id  # Under threshold — still create
                else:
                    # Window expired — start fresh
                    del self._windows[component_id]

            # New window, no existing work item yet
            self._windows[component_id] = (None, now, 1)
            return True, None

    async def set_work_item_id(self, component_id: str, work_item_id: str):
        async with self._lock:
            if component_id in self._windows:
                wi_id, start, count = self._windows[component_id]
                self._windows[component_id] = (work_item_id, start, count)

debounce_engine = DebounceEngine()