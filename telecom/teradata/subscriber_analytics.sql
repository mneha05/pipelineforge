-- Teradata SQL: subscriber behavior + network-quality analysis.

-- Build a daily subscriber KPI mart.
INSERT INTO telecom.subscriber_daily_kpi
SELECT
    event_date,
    subscriber_id,
    MAX(plan_tier) AS plan_tier,
    SUM(CASE WHEN event_type='voice' THEN duration_sec ELSE 0 END) / 60.0 AS voice_minutes,
    SUM(bytes_up + bytes_down) / 1073741824.0 AS data_gb,
    SUM(CASE WHEN event_type='sms' THEN 1 ELSE 0 END) AS sms_count,
    AVG(latency_ms) AS avg_latency_ms,
    AVG(packet_loss_pct) AS avg_packet_loss_pct,
    SUM(dropped) AS dropped_calls,
    SUM(handover_failures) AS handover_failures
FROM telecom.fact_cdr
GROUP BY 1,2;

-- 30-day subscriber behavior features.
WITH usage_30d AS (
    SELECT
        subscriber_id,
        MAX(plan_tier) AS plan_tier,
        SUM(data_gb) AS data_gb_30d,
        SUM(voice_minutes) AS voice_minutes_30d,
        SUM(sms_count) AS sms_30d,
        AVG(avg_latency_ms) AS avg_latency_ms_30d,
        AVG(avg_packet_loss_pct) AS avg_packet_loss_pct_30d,
        SUM(dropped_calls) AS dropped_calls_30d,
        SUM(handover_failures) AS handover_failures_30d,
        COUNT(DISTINCT event_date) AS active_days_30d
    FROM telecom.subscriber_daily_kpi
    WHERE event_date >= CURRENT_DATE - INTERVAL '30' DAY
    GROUP BY subscriber_id
)
SELECT
    subscriber_id,
    plan_tier,
    data_gb_30d,
    voice_minutes_30d,
    active_days_30d,
    CASE
      WHEN data_gb_30d >= 25 THEN 'heavy_data'
      WHEN voice_minutes_30d >= 300 THEN 'voice_centric'
      ELSE 'balanced'
    END AS usage_segment,
    CASE
      WHEN dropped_calls_30d >= 3
        OR avg_packet_loss_pct_30d >= 2
        OR avg_latency_ms_30d >= 120
        OR handover_failures_30d >= 4
      THEN 'reliability_risk'
      ELSE 'normal'
    END AS experience_segment
FROM usage_30d;

-- Highest-latency day per subscriber using Teradata QUALIFY.
SELECT
    subscriber_id,
    event_date,
    avg_latency_ms,
    avg_packet_loss_pct,
    dropped_calls
FROM telecom.subscriber_daily_kpi
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY subscriber_id
    ORDER BY avg_latency_ms DESC, event_date DESC
) = 1;

-- Rank towers by daily latency inside each region.
SELECT
    event_date,
    region,
    tower_id,
    AVG(latency_ms) AS avg_latency_ms,
    SUM(dropped) AS dropped_calls,
    RANK() OVER (
      PARTITION BY event_date, region
      ORDER BY AVG(latency_ms) DESC
    ) AS regional_latency_rank
FROM telecom.fact_cdr
GROUP BY event_date, region, tower_id
QUALIFY regional_latency_rank <= 10;
