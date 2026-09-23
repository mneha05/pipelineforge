import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const components = [
  { name: "Flink stream job", tech: "Apache Flink", mode: "source module" },
  { name: "Anomaly trainer", tech: "TensorFlow", mode: "source module" },
  { name: "Batch lake", tech: "HDFS + Hive + Pig", mode: "docker/local" },
  { name: "Metadata quorum", tech: "Raft", mode: "tested simulator" },
  { name: "iOS observer", tech: "SwiftUI + Objective-C", mode: "Xcode client" },
  { name: "Legacy console", tech: "AngularJS + SproutCore", mode: "compatibility lab" },
];

export async function GET() {
  const now = Date.now();
  const wave = (offset: number, span: number) =>
    Math.round((Math.sin(now / span + offset) + 1) * 50);

  return NextResponse.json(
    {
      service: "PipelineForge Atlas",
      generatedAt: new Date(now).toISOString(),
      liveDemo: "Railway-hosted Next.js control plane",
      telemetry: {
        ingestPerSec: 8400 + wave(1, 3300) * 37,
        p95Ms: 18 + (wave(2, 5100) % 19),
        activeWorkers: 8 + (wave(3, 7900) % 5),
        raftTerm: 42 + Math.floor(now / 60000) % 7,
        anomalyScore: Number((0.07 + (wave(4, 4200) % 20) / 100).toFixed(2)),
      },
      components,
      note:
        "Telemetry above is synthetic demo data. The repository contains the real Flink, TensorFlow, Hadoop, Hive/Pig, Raft, cloud IaC, iOS, AngularJS and SproutCore modules.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
