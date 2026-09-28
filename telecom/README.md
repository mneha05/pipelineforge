# CarrierPulse — Telecom Network & Subscriber Analytics

A reproducible telecom analytics lab built on **synthetic CDR / network-event data**. It demonstrates the data-engineering and analytics patterns used for carrier-scale questions without claiming access to AT&T production data or infrastructure.

## What it covers

- **CDR-style event modeling:** voice, SMS, and data-session records
- **Network performance analytics:** drop rate, p95 latency, jitter, packet loss, handover failures, throughput
- **Subscriber behavior:** usage mix, heavy-data users, voice-centric users, reliability-sensitive users, churn-risk proxies
- **Hadoop / HDFS:** Hadoop Streaming mapper/reducer for daily tower KPIs
- **Hive:** external-table and KPI SQL for data-lake analysis
- **Teradata:** warehouse DDL + SQL using Primary Indexes, COLLECT STATISTICS, QUALIFY, and window functions
- **Privacy:** all data is generated locally and is synthetic

## Architecture

```text
synthetic CDR + network events
            |
            v
      raw CSV / HDFS
            |
     +------+------+
     |             |
     v             v
Hadoop Streaming   Hive
tower/day KPIs     ad-hoc SQL
     |             |
     +------+------+
            |
            v
  Teradata-style warehouse
  subscriber + network marts
            |
      +-----+------+
      |            |
      v            v
network quality   subscriber
analytics         segmentation
```

## Quick start

```bash
cd telecom
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python data/generate_synthetic_cdr.py --rows 50000 --out data/cdr.csv
python analytics/network_quality.py data/cdr.csv
python analytics/subscriber_segments.py data/cdr.csv
```

## Hadoop Streaming

The mapper emits tower/day observations and the reducer aggregates carrier KPIs.

```bash
hdfs dfs -mkdir -p /telecom/raw
hdfs dfs -put -f data/cdr.csv /telecom/raw/

mapred streaming \
  -input /telecom/raw/cdr.csv \
  -output /telecom/kpi_by_tower_day \
  -mapper "python3 mapper.py" \
  -reducer "python3 reducer.py" \
  -file hadoop/mapper.py \
  -file hadoop/reducer.py
```

The output includes event count, dropped-call rate, p95 latency, average jitter, packet loss, handover failures, and traffic volume per tower/day.

## Teradata artifacts

`teradata/schema.sql` defines CDR and subscriber KPI tables with a **Primary Index** and date partitioning.  
`teradata/subscriber_analytics.sql` demonstrates:

- `QUALIFY ROW_NUMBER()`
- window functions
- subscriber usage rollups
- network-quality joins
- simple churn-risk proxy logic
- `COLLECT STATISTICS`

These files are **Teradata-dialect SQL artifacts**; this public project does not claim access to a production Teradata appliance.

## Resume-safe description

> Built a synthetic telecom analytics pipeline over CDR-style event data, using Hadoop Streaming/Hive for network KPI aggregation and Teradata-dialect SQL for subscriber behavior analysis; computed dropped-call, p95 latency, packet-loss, handover-failure, and usage-segmentation metrics.

That statement is defensible from the code in this directory.
