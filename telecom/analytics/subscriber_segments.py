#!/usr/bin/env python3
"""Subscriber behavior segmentation over synthetic CDR/network data."""

import sys
import pandas as pd

path = sys.argv[1] if len(sys.argv) > 1 else "data/cdr.csv"
df = pd.read_csv(path)

df["data_gb"] = (df["bytes_up"] + df["bytes_down"]) / (1024 ** 3)
df["voice_minutes"] = df["duration_sec"].where(df["event_type"].eq("voice"), 0) / 60
df["sms"] = df["event_type"].eq("sms").astype(int)

sub = (
    df.groupby(["subscriber_id", "plan_tier"], as_index=False)
      .agg(
          data_gb=("data_gb", "sum"),
          voice_minutes=("voice_minutes", "sum"),
          sms_count=("sms", "sum"),
          active_days=("event_date", "nunique"),
          avg_latency_ms=("latency_ms", "mean"),
          avg_packet_loss_pct=("packet_loss_pct", "mean"),
          dropped_calls=("dropped", "sum"),
          handover_failures=("handover_failures", "sum"),
      )
)

sub["usage_segment"] = "balanced"
sub.loc[sub["data_gb"] >= sub["data_gb"].quantile(0.80), "usage_segment"] = "heavy_data"
sub.loc[sub["voice_minutes"] >= sub["voice_minutes"].quantile(0.80), "usage_segment"] = "voice_centric"

sub["experience_segment"] = "normal"
risk = (
    (sub["dropped_calls"] >= 2)
    | (sub["avg_packet_loss_pct"] >= 2.0)
    | (sub["avg_latency_ms"] >= 100)
    | (sub["handover_failures"] >= 3)
)
sub.loc[risk, "experience_segment"] = "reliability_risk"

print("\nUsage segments")
print(sub["usage_segment"].value_counts().to_string())
print("\nExperience segments")
print(sub["experience_segment"].value_counts().to_string())

print("\nSubscribers with highest experience-risk signal")
cols = [
    "subscriber_id","plan_tier","usage_segment","avg_latency_ms",
    "avg_packet_loss_pct","dropped_calls","handover_failures"
]
print(
    sub.sort_values(
        ["dropped_calls","handover_failures","avg_latency_ms"],
        ascending=False
    )[cols].head(15).to_string(index=False)
)
