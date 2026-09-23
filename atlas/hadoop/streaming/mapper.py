#!/usr/bin/env python3
import json
import sys

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    event = json.loads(line)
    key = event["pipeline_id"]
    value = (
        float(event["rows_per_sec"]),
        float(event["p95_ms"]),
        float(event["error_rate"]),
    )
    print(f"{key}\t{value[0]},{value[1]},{value[2]}")
