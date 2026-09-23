# Hadoop compatibility lane

Atlas keeps a deliberately small **old-school Hadoop lane** because a surprising amount of enterprise data infrastructure still exposes these interfaces.

```text
JSON events
   │
   ├── Hadoop Streaming ── mapper.py ── shuffle/sort ── reducer.py
   │
   ├── HDFS /warehouse/pipeline_events
   │        └── Hive external table + daily analytics
   │
   └── Pig legacy rollup for organizations with existing .pig jobs
```

## Run the HDFS/Hive lab

```bash
cd atlas/hadoop
docker compose up -d
# NameNode UI: http://localhost:9870
# HiveServer2: jdbc:hive2://localhost:10000
```

The stack is separate from the Railway demo on purpose: a single-container PaaS deployment would be a dishonest representation of a distributed HDFS deployment. The public demo visualizes the control plane; this folder contains the distributed-system workload definitions.
