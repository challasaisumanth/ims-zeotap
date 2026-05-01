# Architecture Planning & Prompts

## Assignment Analysis

### Key Requirements Identified
1. High-throughput ingestion: 10,000 signals/sec without crashes
2. Debounce: 100 signals for same component_id in 10s → 1 work item
3. Three storage layers: NoSQL (raw), RDBMS (work items), Cache (hot path)
4. Two design patterns: Strategy (alerting) + State (lifecycle)
5. Mandatory RCA before CLOSED state
6. MTTR calculation
7. Responsive React UI with live feed + RCA form

### Architecture Decisions Made

**Why FastAPI over Flask/Django?**
- Native asyncio support — critical for 10K signals/sec
- Auto-generates OpenAPI docs — bonus points
- Pydantic models — type-safe, built-in validation

**Why in-memory deque for ingestion?**
- O(1) push — ingestion endpoint returns in microseconds
- DB is never on the critical path
- maxlen=100K acts as circuit breaker — prevents OOM
- This is the textbook solution to backpressure

**Why asyncpg over SQLAlchemy?**
- Raw async PostgreSQL driver — no ORM overhead
- 3-5x faster than SQLAlchemy async for simple queries
- Direct control over transactions

**Why Motor over PyMongo?**
- Native async MongoDB driver
- Non-blocking — fits the async architecture

**Why Redis for hot cache?**
- Assignment explicitly asked for it
- 10s TTL on dashboard state
- Invalidated on every state transition — always consistent

**Debounce Implementation Decision**
Used asyncio.Lock (not threading.Lock) because:
- All code is async — threading primitives cause deadlocks in async context
- asyncio.Lock is coroutine-safe
- Single lock per DebounceEngine instance — no race conditions

**State Machine Implementation**
Chose dictionary-based transition map over class hierarchy because:
- Simpler to read and modify
- Validation logic in one place
- Easy to add new states

**Strategy Pattern Implementation**
Chose instance-per-strategy over class-per-call because:
- No object creation on hot path
- Strategies are stateless — safe to reuse
- STRATEGY_MAP dict makes adding new component types trivial

## Tech Stack Final Choices
| Component | Technology | Alternative Considered | Why Chosen |
|-----------|-----------|----------------------|------------|
| API | FastAPI | Flask, Django | Native async |
| Buffer | deque | asyncio.Queue | Lock-free, O(1) |
| Raw signals | MongoDB | Elasticsearch | Schema-free, simpler |
| Work items | PostgreSQL | MySQL | ACID, UUID support |
| Cache | Redis | Memcached | Data structures, TTL |
| Frontend | React + Vite | Vue, Next.js | Fastest HMR, Vite proxy |
| Containers | Docker Compose | K8s | Assignment scope |

## Bonus Features Added
1. WebSocket live push — real-time updates without polling
2. Signal injector in UI — inject test signals from browser
3. Metrics dashboard — P0 count, MTTR, throughput bars
4. Batch ingestion endpoint — 1000 signals per request
5. Auto-generated Swagger docs at /docs
6. Exponential backoff retry on all DB writes
7. Cascade failure simulation in mock script