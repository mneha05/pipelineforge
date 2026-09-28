-- Hive analytics over synthetic CDR/network events.

CREATE EXTERNAL TABLE IF NOT EXISTS telecom_cdr (
  event_id STRING,
  event_ts STRING,
  event_date STRING,
  subscriber_id STRING,
  tower_id STRING,
  region STRING,
  event_type STRING,
  duration_sec BIGINT,
  bytes_up BIGINT,
  bytes_down BIGINT,
  signal_dbm DOUBLE,
  latency_ms DOUBLE,
  jitter_ms DOUBLE,
  packet_loss_pct DOUBLE,
  dropped INT,
  handover_failures INT,
  plan_tier STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ("separatorChar"=",","quoteChar"="\"")
STORED AS TEXTFILE
LOCATION '/telecom/raw/'
TBLPROPERTIES ("skip.header.line.count"="1");

-- Daily tower-health mart.
CREATE TABLE IF NOT EXISTS telecom_tower_daily
STORED AS PARQUET AS
SELECT
  event_date,
  tower_id,
  region,
  COUNT(*) AS event_count,
  SUM(CASE WHEN event_type='voice' THEN 1 ELSE 0 END) AS voice_events,
  SUM(dropped) AS dropped_calls,
  AVG(latency_ms) AS avg_latency_ms,
  percentile_approx(latency_ms, 0.95) AS p95_latency_ms,
  AVG(jitter_ms) AS avg_jitter_ms,
  AVG(packet_loss_pct) AS avg_packet_loss_pct,
  SUM(handover_failures) AS handover_failures,
  SUM(bytes_up + bytes_down) / POWER(1024, 3) AS traffic_gb
FROM telecom_cdr
GROUP BY event_date, tower_id, region;

-- Towers with elevated reliability risk.
SELECT *
FROM telecom_tower_daily
WHERE (voice_events > 0 AND dropped_calls / voice_events > 0.02)
   OR p95_latency_ms > 120
   OR avg_packet_loss_pct > 2.0
ORDER BY event_date DESC, p95_latency_ms DESC;
