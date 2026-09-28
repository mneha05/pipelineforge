#!/usr/bin/env python3
"""Hadoop Streaming mapper: emit tower/day network observations."""

import csv
import json
import sys

reader = csv.DictReader(sys.stdin)
for row in reader:
    key = f"{row['tower_id']}|{row['event_date']}"
    value = {
        "event_type": row["event_type"],
        "latency_ms": float(row["latency_ms"]),
        "jitter_ms": float(row["jitter_ms"]),
        "packet_loss_pct": float(row["packet_loss_pct"]),
        "dropped": int(row["dropped"]),
        "handover_failures": int(row["handover_failures"]),
        "bytes": int(row["bytes_up"]) + int(row["bytes_down"]),
    }
    print(f"{key}\t{json.dumps(value, separators=(',', ':'))}")
