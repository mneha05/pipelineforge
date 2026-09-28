#!/usr/bin/env python3
"""Local network-performance analysis for the synthetic telecom dataset."""

import sys
import pandas as pd

path = sys.argv[1] if len(sys.argv) > 1 else "data/cdr.csv"
df = pd.read_csv(path)

df["traffic_gb"] = (df["bytes_up"] + df["bytes_down"]) / (1024 ** 3)
df["voice"] = (df["event_type"] == "voice").astype(int)

tower = (
    df.groupby(["region", "tower_id"], as_index=False)
      .agg(
          events=("event_id", "count"),
          voice_events=("voice", "sum"),
          dropped_calls=("dropped", "sum"),
          p95_latency_ms=("latency_ms", lambda s: s.quantile(0.95)),
          avg_jitter_ms=("jitter_ms", "mean"),
          avg_packet_loss_pct=("packet_loss_pct", "mean"),
          handover_failures=("handover_failures", "sum"),
          traffic_gb=("traffic_gb", "sum"),
      )
)

tower["drop_rate"] = tower["dropped_calls"] / tower["voice_events"].clip(lower=1)
tower["risk_score"] = (
    100 * tower["drop_rate"]
    + tower["p95_latency_ms"] / 50
    + tower["avg_packet_loss_pct"] * 2
    + tower["handover_failures"] / tower["events"].clip(lower=1) * 20
)

print("\nTop network-risk towers")
print(
    tower.sort_values("risk_score", ascending=False)
         .head(15)
         .to_string(index=False, formatters={
             "drop_rate": "{:.2%}".format,
             "p95_latency_ms": "{:.1f}".format,
             "avg_packet_loss_pct": "{:.2f}".format,
             "traffic_gb": "{:.2f}".format,
             "risk_score": "{:.2f}".format,
         })
)
