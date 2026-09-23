"use client";

import { useEffect, useState } from "react";

type Snapshot = {
  generatedAt: string;
  telemetry: {
    ingestPerSec: number;
    p95Ms: number;
    activeWorkers: number;
    raftTerm: number;
    anomalyScore: number;
  };
  components: { name: string; tech: string; mode: string }[];
  note: string;
};

const stack = [
  ["STREAM", "Apache Flink", "event-time windows + keyed state"],
  ["ML", "TensorFlow", "anomaly model training + SavedModel export"],
  ["LAKE", "HDFS / Hive / Pig", "batch storage + SQL + legacy ETL"],
  ["CONSENSUS", "Raft", "leader election + replicated metadata log"],
  ["CLOUD", "AWS / Azure / GCP", "provider-specific Terraform modules"],
  ["MOBILE", "SwiftUI / Objective-C", "native observer + interoperability bridge"],
  ["LEGACY", "AngularJS / SproutCore", "compatibility-console examples"],
];

export default function AtlasPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/atlas/status", { cache: "no-store" });
      const next = (await response.json()) as Snapshot;
      if (!cancelled) setData(next);
    };
    load();
    const timer = setInterval(load, 2200);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [paused]);

  const t = data?.telemetry;

  return (
    <main className="min-h-screen bg-[#07090d] text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="mb-10 flex flex-col gap-6 border-b border-zinc-800 pb-9 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 font-mono text-xs tracking-[0.3em] text-emerald-400">
              PIPELINEFORGE / ATLAS
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
              One control plane for streaming, batch, ML, consensus, cloud and native clients.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-400">
              The live page is intentionally lightweight. The heavyweight systems live as runnable
              modules in the repository: PyFlink, TensorFlow, HDFS/Hive/Pig, a tested Raft core,
              Terraform for three clouds, SwiftUI + Objective-C, and legacy web compatibility code.
            </p>
          </div>
          <button
            onClick={() => setPaused((v) => !v)}
            className="w-fit rounded-full border border-zinc-700 px-4 py-2 font-mono text-xs text-zinc-300 hover:border-emerald-500 hover:text-emerald-300"
          >
            {paused ? "RESUME TELEMETRY" : "PAUSE TELEMETRY"}
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-5">
          {[
            ["INGEST / SEC", t ? t.ingestPerSec.toLocaleString() : "—"],
            ["P95 LATENCY", t ? `${t.p95Ms} ms` : "—"],
            ["WORKERS", t ? String(t.activeWorkers) : "—"],
            ["RAFT TERM", t ? String(t.raftTerm) : "—"],
            ["ANOMALY", t ? t.anomalyScore.toFixed(2) : "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="font-mono text-[10px] tracking-[0.2em] text-zinc-500">{label}</div>
              <div className="mt-3 text-2xl font-medium text-zinc-100">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-medium">System topology</h2>
              <span className="font-mono text-[10px] text-emerald-400">CONTROL PLANE ONLINE</span>
            </div>
            <div className="space-y-3">
              {stack.map(([tag, tech, detail], i) => (
                <div key={tech} className="grid grid-cols-[90px_1fr] gap-3 md:grid-cols-[110px_200px_1fr]">
                  <div className="rounded-lg bg-zinc-900 px-3 py-3 font-mono text-[10px] text-emerald-400">
                    {String(i + 1).padStart(2, "0")} / {tag}
                  </div>
                  <div className="rounded-lg border border-zinc-800 px-3 py-3 text-sm">{tech}</div>
                  <div className="hidden rounded-lg border border-zinc-900 px-3 py-3 text-sm text-zinc-500 md:block">
                    {detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-medium">What is real here?</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-400">
              <p>
                <span className="text-zinc-100">Real source:</span> the repository contains each
                framework-specific implementation, not badges or placeholder imports.
              </p>
              <p>
                <span className="text-zinc-100">Real deployment:</span> this Next.js control plane is
                deployed independently from ChatGPT and exposes a public JSON status endpoint.
              </p>
              <p>
                <span className="text-zinc-100">Honest boundary:</span> the displayed telemetry is
                synthetic; Railway is not pretending to run a multi-node Hadoop/Flink cluster.
              </p>
            </div>
            <a
              href="/api/atlas/status"
              className="mt-6 block rounded-xl bg-emerald-400 px-4 py-3 text-center font-mono text-xs font-semibold text-black"
            >
              OPEN LIVE JSON STATUS →
            </a>
          </div>
        </section>

        <div className="mt-6 font-mono text-[10px] text-zinc-600">
          last snapshot: {data?.generatedAt ?? "loading"} · {data?.note ?? ""}
        </div>
      </div>
    </main>
  );
}
