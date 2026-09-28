-- Teradata-dialect warehouse schema for the synthetic telecom lab.
-- This project does not claim access to a production Teradata appliance.

DATABASE telecom;

CREATE MULTISET TABLE telecom.fact_cdr (
    event_id            VARCHAR(32) NOT NULL,
    event_ts            TIMESTAMP(0) NOT NULL,
    event_date          DATE NOT NULL,
    subscriber_id       VARCHAR(32) NOT NULL,
    tower_id            VARCHAR(24) NOT NULL,
    region              VARCHAR(24),
    event_type          VARCHAR(12),
    duration_sec        INTEGER,
    bytes_up            BIGINT,
    bytes_down          BIGINT,
    signal_dbm          DECIMAL(7,2),
    latency_ms          DECIMAL(10,2),
    jitter_ms           DECIMAL(10,2),
    packet_loss_pct     DECIMAL(8,3),
    dropped             BYTEINT,
    handover_failures   SMALLINT,
    plan_tier           VARCHAR(20)
)
PRIMARY INDEX (subscriber_id)
PARTITION BY RANGE_N(
    event_date BETWEEN DATE '2026-01-01' AND DATE '2027-12-31'
    EACH INTERVAL '1' DAY
);

CREATE MULTISET TABLE telecom.subscriber_daily_kpi (
    event_date              DATE NOT NULL,
    subscriber_id           VARCHAR(32) NOT NULL,
    plan_tier               VARCHAR(20),
    voice_minutes           DECIMAL(14,2),
    data_gb                 DECIMAL(14,4),
    sms_count               INTEGER,
    avg_latency_ms          DECIMAL(10,2),
    avg_packet_loss_pct     DECIMAL(8,3),
    dropped_calls           INTEGER,
    handover_failures       INTEGER
)
PRIMARY INDEX (subscriber_id)
PARTITION BY RANGE_N(
    event_date BETWEEN DATE '2026-01-01' AND DATE '2027-12-31'
    EACH INTERVAL '1' DAY
);

COLLECT STATISTICS COLUMN (subscriber_id) ON telecom.fact_cdr;
COLLECT STATISTICS COLUMN (tower_id) ON telecom.fact_cdr;
COLLECT STATISTICS COLUMN (event_date) ON telecom.fact_cdr;
