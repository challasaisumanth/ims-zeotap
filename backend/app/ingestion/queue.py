import asyncio
from collections import deque
from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)

class InMemoryQueue:
    """
    Lock-free in-memory buffer. Signals land here instantly.
    A background worker drains them into the DB asynchronously.
    This means DB slowness NEVER causes the ingestion API to crash.
    That's the backpressure solution.
    """
    def __init__(self, maxsize: int = 100_000):
        self._queue: deque = deque(maxlen=maxsize)
        self._processed = 0
        self._received = 0
        self._start = time.time()

    def push(self, signal: dict):
        self._queue.append(signal)
        self._received += 1

    def pop_batch(self, size: int = 500) -> list:
        batch = []
        for _ in range(min(size, len(self._queue))):
            batch.append(self._queue.popleft())
        self._processed += len(batch)
        return batch

    def size(self) -> int:
        return len(self._queue)

    def throughput(self) -> dict:
        elapsed = time.time() - self._start
        return {
            "received": self._received,
            "processed": self._processed,
            "queue_size": self.size(),
            "signals_per_sec": round(self._received / elapsed, 2) if elapsed > 0 else 0
        }

# Singleton
signal_queue = InMemoryQueue()