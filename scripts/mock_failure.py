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
        "metadata": {"host": "prod-01"},
    }
    try:
        r = requests.post(f"{BASE}/api/signals/ingest", json=payload, timeout=5)
        print(f"  → {r.status_code} {component_id} [{severity}]")
        if r.status_code != 200:
            print(f"     ERROR: {r.text}")
    except Exception as e:
        print(f"  → FAILED: {e}")

print("=== Testing connection first ===")
try:
    r = requests.get(f"{BASE}/health", timeout=5)
    print(f"Health check: {r.status_code} - {r.json()}")
except Exception as e:
    print(f"Cannot reach backend: {e}")
    exit(1)

print("\n=== Simulating RDBMS Outage ===")
for i in range(20):
    send("POSTGRES_PRIMARY_01", "RDBMS",
         f"Connection refused: too many clients (error {i})", "P0")
    time.sleep(0.05)

print("\n=== Simulating Cache Degradation ===")
for i in range(10):
    send("REDIS_CLUSTER_01", "CACHE",
         f"Cache miss rate 94% latency spike {random.randint(200,800)}ms", "P2")
    time.sleep(0.05)

print("\n=== Simulating MCP Host Failure ===")
for i in range(10):
    send("MCP_HOST_01", "MCP",
         f"Health check failed no response in 30s attempt {i}", "P1")
    time.sleep(0.05)

print("\nDone! Open http://localhost:3000 to see incidents")