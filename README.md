<div align="center">

# PipelineForge Atlas

### A visual ETL engine extended into a distributed-data systems lab

**Flink streaming · TensorFlow anomaly detection · Hadoop/HDFS/Hive/Pig · Raft consensus · AWS/Azure/GCP · SwiftUI/Objective-C · AngularJS/SproutCore**

[Live Pipeline Builder](https://pipelineforge-rosy.vercel.app/) · [Atlas Control Plane](https://pipelineforge-rosy.vercel.app/atlas)

</div>

---

PipelineForge started as a visual ETL builder whose graphs actually execute. **Atlas** extends that execution model outward: a streaming lane processes telemetry with Apache Flink, TensorFlow learns normal pipeline behavior, Hadoop-era tools handle batch compatibility, a small Raft core coordinates replicated metadata, three Terraform modules express the same storage boundary across AWS/Azure/GCP, and native/legacy clients consume the same status surface.

The project is deliberately split between what belongs in a public single-service demo and what belongs in real distributed or platform-specific environments. The web control plane is deployable on Vercel/Railway. HDFS, Hive, Flink, Xcode, and cloud IaC stay as runnable source modules rather than being misrepresented as a fake one-container cluster.

## Architecture

```text
                          ┌──────────────────────────────────────┐
                          │          PipelineForge UI            │
                          │ visual DAG builder + execution view  │
                          └──────────────────┬───────────────────┘
                                             │
                                      pipeline events
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             │                               │                               │
             ▼                               ▼                               ▼
   ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
   │  Apache Flink    │            │  Hadoop / HDFS   │            │  Raft metadata   │
   │ event-time       │            │ Hive + Pig +     │            │ leader election  │
   │ windows + state  │            │ streaming jobs   │            │ replicated log   │
   └────────┬─────────┘            └────────┬─────────┘            └────────┬─────────┘
            │                               │                               │
            ▼                               ▼                               ▼
   ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
   │ TensorFlow model │            │ batch analytics  │            │ committed state  │
   │ anomaly features │            │ + compatibility  │            │ transitions      │
   └────────┬─────────┘            └──────────────────┘            └──────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                     Atlas status/control surface                        │
   │                    /atlas  +  /api/atlas/status                         │
   └──────────────┬───────────────────────┬───────────────────────┬───────────┘
                  │                       │                       │
                  ▼                       ▼                       ▼
          SwiftUI + Objective-C      AngularJS console      SproutCore lab

                         infrastructure definitions
                         AWS · Azure · GCP Terraform
```

## What is implemented

| Area | Implementation | Where |
| --- | --- | --- |
| **TensorFlow** | Compact autoencoder trained on pipeline telemetry; exports a SavedModel plus normalization metadata and an anomaly threshold | `atlas/ml/train_anomaly_model.py` |
| **Apache Flink** | PyFlink Kafka source/sink pipeline with event-time watermarks, keyed 10-second windows, checkpointing and feature aggregation | `atlas/streaming/flink_anomaly_job.py` |
| **Hadoop / HDFS** | Dockerized NameNode/DataNode lab plus Hadoop Streaming mapper/reducer | `atlas/hadoop/` |
| **Hive** | External Parquet table over HDFS with daily pipeline analytics | `atlas/hadoop/hive/events.sql` |
| **Pig** | Legacy batch rollup for pipeline throughput, latency and backpressure | `atlas/hadoop/pig/session_rollup.pig` |
| **Consensus** | Small Raft core with term changes, RequestVote, AppendEntries, leader election, majority replication and commit-index propagation | `atlas/consensus/raft.py` |
| **AWS** | Terraform for versioned S3 data lake + CloudWatch log group | `atlas/cloud/aws/main.tf` |
| **Azure** | Terraform for resource group + private Blob Storage data lake | `atlas/cloud/azure/main.tf` |
| **GCP** | Terraform for versioned Google Cloud Storage data lake | `atlas/cloud/gcp/main.tf` |
| **Swift / Xcode** | SwiftUI monitoring client using async URLSession/Codable | `atlas/ios/PipelineForgeMobile/` |
| **Objective-C** | Native Objective-C bridge compiled into the Swift target through a bridging header | `PFHeartbeatBridge.h/.m` |
| **AngularJS** | 1.x compatibility status console using DI, controller-as and `$http` | `atlas/legacy/angularjs/` |
| **SproutCore** | Minimal application/controller/page hierarchy showing the older framework model | `atlas/legacy/sproutcore/` |

## Live control plane

The Atlas page is a real deployed Next.js route, not a screenshot.

```text
GET /api/atlas/status
        │
        ├── ingest rate
        ├── p95 latency
        ├── active workers
        ├── Raft term
        └── anomaly score
```

The dashboard intentionally labels its telemetry as **synthetic demo telemetry**. The distributed implementations themselves are in the repository, but the public web service does not pretend that a multi-node HDFS/Flink cluster is running inside a single PaaS container.

## Flink streaming path

```text
Kafka: pipeline-telemetry
        │
        ▼
 parse JSON + event timestamp
        │
        ▼
 bounded-out-of-orderness watermark
        │
        ▼
 keyBy(pipeline_id)
        │
        ▼
 10-second event-time window
        │
        ▼
 aggregate throughput / p95 / errors / CPU / backpressure
        │
        ▼
Kafka: pipeline-features
```

Run with a local Flink installation:

```bash
flink run -py atlas/streaming/flink_anomaly_job.py
```

## TensorFlow anomaly model

The trainer generates or accepts telemetry features, normalizes them, trains an autoencoder, measures reconstruction error and exports the 99.5th-percentile training error as the initial anomaly threshold.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r atlas/requirements.txt
python atlas/ml/train_anomaly_model.py --epochs 12
```

Artifacts:

```text
artifacts/atlas-anomaly/
├── saved_model/
├── normalization.npz
└── metadata.txt
```

## Raft: the coordination layer

The consensus module is intentionally small enough to reason through line-by-line.

It implements:

- follower → candidate → leader role transitions
- monotonically increasing terms
- one vote per term
- log freshness checks during RequestVote
- AppendEntries consistency checks
- conflicting-log truncation
- replication acknowledgements
- majority-based commit advancement
- commit-index propagation to followers

Run the tests:

```bash
cd atlas/consensus
python -m pip install pytest
pytest -q
```

The CI workflow runs these tests on every Atlas change.

## Hadoop compatibility lane

```text
JSON events
   │
   ├── Hadoop Streaming ── mapper ── shuffle/sort ── reducer
   │
   ├── HDFS /warehouse/pipeline_events
   │       └── Hive external table + analytics
   │
   └── Pig batch rollup
```

Start the local HDFS/Hive lab:

```bash
cd atlas/hadoop
docker compose up -d
```

The NameNode UI is exposed on port `9870`; HiveServer2 is exposed on `10000`.

## Multi-cloud definitions

The three cloud modules express the same logical boundary using provider-native primitives rather than forcing a fake abstraction.

```text
                  pipeline event lake
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
     AWS S3        Azure Blob         GCS bucket
   versioning        private           versioning
       +               │
 CloudWatch logs       │
```

Each module can be initialized independently:

```bash
cd atlas/cloud/aws    && terraform init
cd atlas/cloud/azure  && terraform init
cd atlas/cloud/gcp    && terraform init
```

No cloud resource is claimed as provisioned from this repository unless credentials are supplied and `terraform apply` is actually run.

## iOS client: SwiftUI + Objective-C

The iOS target is not a web wrapper.

```text
ContentView.swift
      │
      ├── AtlasAPI.swift ── URLSession/Codable ──► /api/atlas/status
      │
      └── Bridging Header ──► PFHeartbeatBridge.m
```

Generate and open the Xcode project:

```bash
brew install xcodegen
cd atlas/ios
xcodegen generate
open PipelineForgeMobile.xcodeproj
```

The Objective-C bridge returns a native machine signature, which the SwiftUI view displays alongside the live Atlas telemetry.

## Legacy web compatibility

Older stacks are isolated from the modern product code.

```text
atlas/legacy/
├── angularjs/
│   ├── index.html
│   └── app.js
└── sproutcore/
    └── apps/cluster_dashboard/
        ├── core.js
        └── main_page.js
```

The AngularJS example performs a real `$http` request against the Atlas API. The SproutCore example shows the framework's application namespace, controller and page/view model.

## Original PipelineForge engine

Atlas sits on top of the existing visual ETL engine rather than replacing it.

```text
orders ─▶ filter ─▶ derive ─▶ aggregate
                                  │
targets ───────────────────────▶ join
                                  │
                              validate
```

Supported engine operations include:

- filter
- derive with a hand-written expression parser
- aggregate
- join
- sort
- validate
- topological execution
- row-level previews
- server-side execution through the same engine

## Repository map

```text
pipelineforge/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # visual ETL builder
│   │   ├── atlas/page.tsx              # Atlas control plane
│   │   └── api/
│   │       ├── run/                     # ETL execution API
│   │       ├── ai/                      # optional NL → pipeline graph
│   │       └── atlas/status/route.ts    # live Atlas JSON status
│   └── lib/                             # shared ETL execution engine
│
├── atlas/
│   ├── streaming/                       # PyFlink
│   ├── ml/                              # TensorFlow
│   ├── consensus/                       # Raft
│   ├── hadoop/                          # HDFS / Hive / Pig / Streaming
│   ├── cloud/
│   │   ├── aws/
│   │   ├── azure/
│   │   └── gcp/
│   ├── ios/                             # SwiftUI + Objective-C
│   └── legacy/
│       ├── angularjs/
│       └── sproutcore/
│
└── .github/workflows/atlas-ci.yml
```

## CI

`.github/workflows/atlas-ci.yml` currently gates two things:

1. the Raft unit tests;
2. the complete Next.js production build.

That keeps the systems code explainable while making sure the public control plane still builds after Atlas changes.

## Local web development

```bash
git clone https://github.com/mneha05/pipelineforge.git
cd pipelineforge
npm install
npm run dev
```

Open:

- `http://localhost:3000/` — original PipelineForge builder
- `http://localhost:3000/atlas` — Atlas control plane
- `http://localhost:3000/api/atlas/status` — JSON status endpoint

---

Built by **Neha Mahesh** · Computer Science, Purdue University
