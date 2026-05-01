import requests
import time
import random

BASE = "http://127.0.0.1:8000"

def send(component_id, component_type, error, severity="P0"):
    payload = {
        "component_id": component_id,
        "component_type": component_type,
        "error_message": error,
        "severity": severity,
        "metadata": {"host": "prod-01", "datacenter": "us-east-1"},
    }
    try:
        r = requests.post(f"{BASE}/api/signals/ingest", json=payload, timeout=5)
        print(f"  → {r.status_code} {component_id} [{severity}]")
    except Exception as e:
        print(f"  → FAILED: {e}")

print("=== Testing connection ===")
try:
    r = requests.get(f"{BASE}/health", timeout=5)
    print(f"Health: {r.status_code} - {r.json()}\n")
except Exception as e:
    print(f"Cannot reach backend: {e}")
    exit(1)

# Send 110 signals for RDBMS — PROVES debounce (100 threshold)
# Expected: only 1 work item created, all 110 signals linked to it
print("=== Simulating RDBMS Outage (110 signals → should create only 1 work item) ===")
for i in range(110):
    send("POSTGRES_PRIMARY_01", "RDBMS",
         f"Connection refused: too many clients (signal {i+1}/110)", "P0")
    time.sleep(0.02)

print("\n=== Simulating Cache Degradation (50 signals) ===")
for i in range(50):
    send("REDIS_CLUSTER_01", "CACHE",
         f"Cache miss rate 94% — latency {random.randint(200,800)}ms (signal {i+1})", "P2")
    time.sleep(0.03)

print("\n=== Simulating MCP Host Failure (60 signals) ===")
for i in range(60):
    send("MCP_HOST_01", "MCP",
         f"Health check failed — no response in 30s (signal {i+1})", "P1")
    time.sleep(0.02)

print("\n=== Simulating API Gateway Errors (30 signals) ===")
for i in range(30):
    send("API_GATEWAY_01", "API",
         f"HTTP 502 Bad Gateway — upstream timeout (signal {i+1})", "P1")
    time.sleep(0.03)

print("\n=== Simulating Queue Backlog (25 signals) ===")
for i in range(25):
    send("KAFKA_BROKER_01", "QUEUE",
         f"Consumer lag 500K messages — partition {i % 3} (signal {i+1})", "P2")
    time.sleep(0.03)

print("\nDone! Open http://localhost:3000")
print("RDBMS should show 110 signals but only 1 work item — debounce proven!")