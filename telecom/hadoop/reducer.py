#!/usr/bin/env python3
"""Hadoop Streaming reducer: aggregate daily network KPIs per tower."""

import json
import sys

def emit(key, rows):
    if not rows:
        return
    lats = sorted(r["latency_ms"] for r in rows)
    idx = min(len(lats) - 1, max(0, int(0.95 * len(lats)) - 1))
    voice = sum(r["event_type"] == "voice" for r in rows)
    drops = sum(r["dropped"] for r in rows)
    out = {
        "events": len(rows),
        "voice_events": voice,
        "drop_rate": round(drops / voice, 6) if voice else 0.0,
        "p95_latency_ms": round(lats[idx], 2),
        "avg_jitter_ms": round(sum(r["jitter_ms"] for r in rows) / len(rows), 2),
        "avg_packet_loss_pct": round(sum(r["packet_loss_pct"] for r in rows) / len(rows), 3),
        "handover_failures": sum(r["handover_failures"] for r in rows),
        "traffic_gb": round(sum(r["bytes"] for r in rows) / (1024 ** 3), 4),
    }
    print(f"{key}\t{json.dumps(out, sort_keys=True)}")

current = None
bucket = []
for line in sys.stdin:
    line = line.rstrip("\n")
    if not line:
        continue
    key, payload = line.split("\t", 1)
    if current is not None and key != current:
        emit(current, bucket)
        bucket = []
    current = key
    bucket.append(json.loads(payload))

if current is not None:
    emit(current, bucket)
