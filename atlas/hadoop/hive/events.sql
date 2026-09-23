CREATE EXTERNAL TABLE IF NOT EXISTS pipeline_events (
  pipeline_id STRING,
  event_ts TIMESTAMP,
  rows_per_sec DOUBLE,
  p95_ms DOUBLE,
  error_rate DOUBLE,
  cpu_pct DOUBLE,
  backpressure_ms DOUBLE
)
PARTITIONED BY (event_date STRING)
STORED AS PARQUET
LOCATION '/warehouse/pipeline_events';

MSCK REPAIR TABLE pipeline_events;

SELECT
  pipeline_id,
  event_date,
  AVG(rows_per_sec) AS avg_rows_per_sec,
  PERCENTILE_APPROX(p95_ms, 0.95) AS p95_latency_ms,
  AVG(error_rate) AS avg_error_rate
FROM pipeline_events
GROUP BY pipeline_id, event_date
ORDER BY event_date DESC, avg_error_rate DESC;
