#!/usr/bin/env python3
"""Generate deterministic synthetic CDR/network telemetry for telecom analytics."""

import argparse
import csv
import math
import random
from datetime import datetime, timedelta

FIELDS = [
    "event_id","event_ts","event_date","subscriber_id","tower_id","region",
    "event_type","duration_sec","bytes_up","bytes_down","signal_dbm",
    "latency_ms","jitter_ms","packet_loss_pct","dropped","handover_failures","plan_tier"
]

REGIONS = ["midwest", "northeast", "south", "west"]
PLANS = ["prepaid", "value", "unlimited", "premium"]
EVENT_TYPES = ["voice", "sms", "data"]

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def generate(rows, subscribers, towers, seed):
    rng = random.Random(seed)
    start = datetime(2026, 8, 1)
    troubled = set(range(max(1, towers // 12)))

    for i in range(rows):
        sid = rng.randrange(subscribers)
        tid = rng.randrange(towers)
        region = REGIONS[tid % len(REGIONS)]
        ts = start + timedelta(seconds=rng.randrange(60 * 60 * 24 * 45))
        event_type = rng.choices(EVENT_TYPES, weights=[0.22, 0.08, 0.70], k=1)[0]
        plan = PLANS[sid % len(PLANS)]

        congestion = 1.65 if tid in troubled and 17 <= ts.hour <= 22 else 1.0
        signal = clamp(rng.gauss(-82 - (8 if tid in troubled else 0), 9), -125, -48)
        latency = max(5.0, rng.lognormvariate(math.log(38 * congestion), 0.45))
        jitter = max(0.2, rng.lognormvariate(math.log(5.5 * congestion), 0.50))
        packet_loss = clamp(rng.gammavariate(1.4, 0.45 * congestion), 0, 12)

        duration = 0
        up = down = 0
        if event_type == "voice":
            duration = int(max(5, rng.expovariate(1/180)))
            up = int(duration * rng.uniform(800, 1800))
            down = int(duration * rng.uniform(900, 2000))
        elif event_type == "sms":
            up = rng.randint(200, 1200)
            down = rng.randint(200, 1200)
        else:
            duration = int(max(1, rng.expovariate(1/240)))
            up = int(rng.lognormvariate(12.0, 1.0))
            down = int(rng.lognormvariate(14.1, 1.0))

        drop_prob = 0.003 + (0.02 if signal < -105 else 0) + (0.015 if packet_loss > 3 else 0)
        drop_prob += 0.012 if tid in troubled else 0
        dropped = int(event_type == "voice" and rng.random() < drop_prob)

        hf_lambda = 0.04 * congestion + (0.12 if signal < -105 else 0)
        handover_failures = int(rng.random() < hf_lambda)

        yield {
            "event_id": f"evt_{i:09d}",
            "event_ts": ts.isoformat(timespec="seconds"),
            "event_date": ts.date().isoformat(),
            "subscriber_id": f"sub_{sid:07d}",
            "tower_id": f"tower_{tid:04d}",
            "region": region,
            "event_type": event_type,
            "duration_sec": duration,
            "bytes_up": up,
            "bytes_down": down,
            "signal_dbm": round(signal, 2),
            "latency_ms": round(latency, 2),
            "jitter_ms": round(jitter, 2),
            "packet_loss_pct": round(packet_loss, 3),
            "dropped": dropped,
            "handover_failures": handover_failures,
            "plan_tier": plan,
        }

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--rows", type=int, default=50_000)
    p.add_argument("--subscribers", type=int, default=5_000)
    p.add_argument("--towers", type=int, default=120)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", default="data/cdr.csv")
    args = p.parse_args()

    import os
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(generate(args.rows, args.subscribers, args.towers, args.seed))

    print(f"wrote {args.rows:,} synthetic telecom events to {args.out}")

if __name__ == "__main__":
    main()
