#!/usr/bin/env python3
import sys


def emit(key, rows):
    if not rows:
        return
    count = len(rows)
    rps = sum(r[0] for r in rows) / count
    p95 = max(r[1] for r in rows)
    err = sum(r[2] for r in rows) / count
    print(f"{key}\tcount={count},avg_rps={rps:.2f},max_p95={p95:.2f},avg_error={err:.6f}")


current = None
bucket = []

for line in sys.stdin:
    key, payload = line.rstrip().split("\t", 1)
    row = tuple(float(x) for x in payload.split(","))
    if current is not None and key != current:
        emit(current, bucket)
        bucket = []
    current = key
    bucket.append(row)

if current is not None:
    emit(current, bucket)
