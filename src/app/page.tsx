"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  runPipeline, type Pipeline, type PNode, type NodeType, type RunResult, type Row,
} from "@/lib/engine";
import { SAMPLE_DATA, DATASET_META } from "@/lib/sampleData";
import { NODE_CATALOG, STARTER_PIPELINE } from "@/lib/defaults";

let idSeq = 100;
const newId = () => `n${++idSeq}`;

const NODE_W = 188;
const NODE_H = 74;

export default function Builder() {
  const [pipeline, setPipeline] = useState<Pipeline>(() => JSON.parse(JSON.stringify(STARTER_PIPELINE)));
  const [selected, setSelected] = useState<string | null>("n8");
  const [run, setRun] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"config" | "preview" | "log" | "quality">("config");
  const [serverMs, setServerMs] = useState<number | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const byId = useMemo(() => new Map(pipeline.nodes.map((n) => [n.id, n])), [pipeline]);

  const columnsOf = useCallback(
    (nodeId: string | undefined): string[] => {
      if (!nodeId) return [];
      if (run?.outputs[nodeId]?.length) return Object.keys(run.outputs[nodeId][0]);
      const n = byId.get(nodeId);
      if (n?.type === "source") return DATASET_META[n.config.dataset]?.columns || [];
      // fall back to first input's columns
      if (n?.inputs[0]) return columnsOf(n.inputs[0]);
      return [];
    },
    [run, byId]
  );

  function doRun() {
    setRunning(true);
    setServerMs(null);
    setTimeout(() => {
      const r = runPipeline(pipeline, SAMPLE_DATA);
      setRun(r);
      setRunning(false);
      if (r.quality.some((q) => !q.passed)) setTab("quality");
    }, 220);
  }

  async function runOnServer() {
    setServerMs(null);
    const t0 = performance.now();
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pipeline }),
      }).then((x) => x.json());
      if (r.totalMs != null) {
        setRun(r);
        setServerMs(Math.round(performance.now() - t0));
      }
    } catch {/* ignore */}
  }

  function addNode(type: NodeType) {
    const anchor = selected ? byId.get(selected) : pipeline.nodes[pipeline.nodes.length - 1];
    const id = newId();
    const cat = NODE_CATALOG[type];
    const node: PNode = {
      id, type, title: cat.label.toLowerCase(),
      config: defaultConfig(type, anchor ? columnsOf(anchor.id) : []),
      inputs: type === "source" ? [] : anchor ? [anchor.id] : [],
      x: anchor ? anchor.x + 250 : 80, y: anchor ? anchor.y + (type === "source" ? 180 : 0) : 80,
    };
    setPipeline((p) => ({ nodes: [...p.nodes, node] }));
    setSelected(id);
    setTab("config");
  }

  function deleteNode(id: string) {
    setPipeline((p) => ({
      nodes: p.nodes.filter((n) => n.id !== id).map((n) => ({ ...n, inputs: n.inputs.filter((i) => i !== id) })),
    }));
    if (selected === id) setSelected(null);
  }

  function updateNode(id: string, patch: Partial<PNode>) {
    setPipeline((p) => ({ nodes: p.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }
  function updateConfig(id: string, cfg: any) {
    setPipeline((p) => ({ nodes: p.nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...cfg } } : n)) }));
  }

  // ---- node dragging ----
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  function onNodePointerDown(e: React.PointerEvent, n: PNode) {
    setSelected(n.id);
    drag.current = { id: n.id, dx: e.clientX - n.x, dy: e.clientY - n.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { id, dx, dy } = drag.current;
    updateNode(id, { x: Math.max(0, e.clientX - dx), y: Math.max(0, e.clientY - dy) });
  }
  function onPointerUp() { drag.current = null; }

  const sel = selected ? byId.get(selected) : null;

  function exportJson() {
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pipeline.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar
        run={run} running={running} serverMs={serverMs}
        onRun={doRun} onServer={runOnServer} onExport={exportJson} onAi={() => setAiOpen(true)}
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* PALETTE */}
        <aside style={{ width: 184, borderRight: "1.5px solid var(--ink)", background: "#fbf9f4", padding: 14, overflowY: "auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: 1.5, color: "#8a8270", marginBottom: 12 }}>
            ADD STEP
          </div>
          {(Object.keys(NODE_CATALOG) as NodeType[]).map((t) => {
            const c = NODE_CATALOG[t];
            return (
              <button
                key={t}
                onClick={() => addNode(t)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, marginBottom: 7,
                  padding: "9px 10px", border: "1.5px solid var(--ink)", background: "#fff",
                  borderRadius: 2, cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ width: 22, height: 22, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 2, background: c.color, color: "#fff", fontWeight: 700, fontSize: 13 }}>{c.glyph}</span>
                <span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "#8a8270" }}>{c.desc}</span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* CANVAS */}
        <div
          className="blueprint"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{ flex: 1, position: "relative", overflow: "auto" }}
        >
          <div style={{ position: "relative", width: 2200, height: 1100 }}>
            <Edges pipeline={pipeline} byId={byId} running={running} />
            {pipeline.nodes.map((n) => (
              <NodeCard
                key={n.id} node={n} selected={selected === n.id} running={running}
                rows={run?.outputs[n.id]?.length} log={run?.log.find((l) => l.nodeId === n.id)}
                onDown={(e: React.PointerEvent) => onNodePointerDown(e, n)}
              />
            ))}
          </div>
        </div>

        {/* INSPECTOR */}
        <aside style={{ width: 410, borderLeft: "1.5px solid var(--ink)", background: "#fbf9f4", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", borderBottom: "1.5px solid var(--ink)" }}>
            {(["config", "preview", "log", "quality"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "11px 6px", border: "none", cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase",
                  background: tab === t ? "var(--ink)" : "transparent", color: tab === t ? "#fff" : "#8a8270",
                  fontWeight: 600,
                }}
              >
                {t}{t === "quality" && run?.quality.some((q) => !q.passed) ? " ⚠" : ""}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {tab === "config" && (sel ? (
              <Inspector node={sel} cols={columnsOf(sel.inputs[0])} allNodes={pipeline.nodes}
                onConfig={(c: any) => updateConfig(sel.id, c)} onTitle={(t: string) => updateNode(sel.id, { title: t })}
                onInputs={(inp: string[]) => updateNode(sel.id, { inputs: inp })} onDelete={() => deleteNode(sel.id)} />
            ) : <Empty msg="Select a step to configure it, or add one from the left." />)}
            {tab === "preview" && (sel ? (
              <Preview rows={run?.outputs[sel.id]} ran={!!run} />
            ) : <Empty msg="Select a step to preview its output rows." />)}
            {tab === "log" && <RunLogView run={run} serverMs={serverMs} />}
            {tab === "quality" && <QualityView run={run} />}
          </div>
        </aside>
      </div>

      {aiOpen && <AiPanel onClose={() => setAiOpen(false)} onApply={(p) => { setPipeline(p); setSelected(null); setRun(null); setAiOpen(false); }} />}
    </div>
  );
}

/* ============================== components ============================== */

function TopBar({ run, running, serverMs, onRun, onServer, onExport, onAi }: any) {
  return (
    <header style={{ borderBottom: "1.5px solid var(--ink)", background: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 30, height: 30, background: "var(--ink)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 900, fontStyle: "italic", fontSize: 18, borderRadius: 2 }}>P</div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, lineHeight: 1, letterSpacing: -0.3 }}>PipelineForge</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 1.5, color: "#8a8270" }}>VISUAL ETL · DATA INTEGRATION</div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      {run && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#5a5446", display: "flex", gap: 16 }}>
          <span><b style={{ color: "#1b3a8f" }}>{run.outputs[run.finalNodeId]?.length ?? 0}</b> rows out</span>
          <span><b style={{ color: "#1b3a8f" }}>{run.totalMs}ms</b> {serverMs != null ? `· server ${serverMs}ms` : "· local"}</span>
        </div>
      )}
      <button className="btn" onClick={onAi}>✦ AI Assist</button>
      <button className="btn" onClick={onExport}>↓ Export JSON</button>
      <button className="btn btn-go" onClick={onServer}>Run on Server</button>
      <button className="btn btn-run" onClick={onRun} disabled={running}>{running ? "Running…" : "▶ Run Pipeline"}</button>
    </header>
  );
}

function Edges({ pipeline, byId, running }: { pipeline: Pipeline; byId: Map<string, PNode>; running: boolean }) {
  const paths: { d: string; key: string }[] = [];
  for (const n of pipeline.nodes) {
    n.inputs.forEach((inpId, idx) => {
      const p = byId.get(inpId);
      if (!p) return;
      const x1 = p.x + NODE_W, y1 = p.y + NODE_H / 2;
      const x2 = n.x, y2 = n.y + NODE_H / 2 + (n.inputs.length > 1 ? (idx - 0.5) * 24 : 0);
      const mx = (x1 + x2) / 2;
      paths.push({ key: `${inpId}-${n.id}-${idx}`, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` });
    });
  }
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
      {paths.map((p) => (
        <path key={p.key} d={p.d} fill="none" stroke={running ? "#e8582c" : "#1b3a8f"} strokeWidth={2}
          className={running ? "edge-live" : ""} opacity={0.85} />
      ))}
      {paths.map((p) => {
        const m = p.d.match(/C .* (\d+\.?\d*) (\d+\.?\d*)$/);
        return null;
      })}
    </svg>
  );
}

function NodeCard({ node, selected, running, rows, log, onDown }: any) {
  const c = NODE_CATALOG[node.type as NodeType];
  const statusColor = log?.status === "error" ? "#be123c" : log?.status === "warn" ? "#e8582c" : "#0f766e";
  return (
    <div
      className={running ? "running" : "pop"}
      onPointerDown={onDown}
      style={{
        position: "absolute", left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H,
        background: "#fff", border: `1.5px solid ${selected ? "#e8582c" : "var(--ink)"}`,
        borderRadius: 3, boxShadow: selected ? "4px 4px 0 #e8582c" : "3px 3px 0 var(--ink)",
        cursor: "grab", userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1.5px solid var(--line)" }}>
        <span style={{ width: 20, height: 20, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 2, background: c.color, color: "#fff", fontWeight: 700, fontSize: 12 }}>{c.glyph}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "#8a8270", letterSpacing: 1, textTransform: "uppercase" }}>{c.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.title}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: rows != null ? statusColor : "#b8ad96" }} className="tnum">
          {rows != null ? `${rows} rows` : "—"}
        </span>
        {log && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#b8ad96" }}>{log.ms}ms</span>}
      </div>
      {/* ports */}
      {node.inputs.length > 0 && <Port side="in" />}
      <Port side="out" />
    </div>
  );
}

function Port({ side }: { side: "in" | "out" }) {
  return (
    <span style={{
      position: "absolute", top: NODE_H / 2 - 5, [side === "in" ? "left" : "right"]: -6,
      width: 11, height: 11, borderRadius: 11, background: "#fff", border: "1.5px solid var(--ink)",
    } as any} />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: 0.5, color: "#8a8270", textTransform: "uppercase", marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1.5px solid var(--ink)", borderRadius: 2,
  background: "#fff", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)", outline: "none",
};

function Inspector({ node, cols, allNodes, onConfig, onTitle, onInputs, onDelete }: any) {
  const cat = NODE_CATALOG[node.type as NodeType];
  const otherNodes = allNodes.filter((n: PNode) => n.id !== node.id);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <span style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: 2, background: cat.color, color: "#fff", fontWeight: 700 }}>{cat.glyph}</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800 }}>{cat.label}</span>
      </div>

      <Field label="Step name">
        <input style={inputStyle} value={node.title} onChange={(e) => onTitle(e.target.value)} />
      </Field>

      {node.type !== "source" && node.type !== "join" && (
        <Field label="Input">
          <select style={inputStyle} value={node.inputs[0] || ""} onChange={(e) => onInputs([e.target.value])}>
            <option value="">— none —</option>
            {otherNodes.map((n: PNode) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
        </Field>
      )}

      {node.type === "source" && (
        <Field label="Dataset">
          <select style={inputStyle} value={node.config.dataset} onChange={(e) => onConfig({ dataset: e.target.value })}>
            {Object.keys(DATASET_META).map((d) => <option key={d} value={d}>{DATASET_META[d].label} ({DATASET_META[d].rows} rows)</option>)}
          </select>
        </Field>
      )}

      {node.type === "filter" && (<>
        <Field label="Column"><ColSelect cols={cols} value={node.config.column} onChange={(v) => onConfig({ column: v })} /></Field>
        <Field label="Operator">
          <select style={inputStyle} value={node.config.op} onChange={(e) => onConfig({ op: e.target.value })}>
            {["==", "!=", ">", "<", ">=", "<=", "contains"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Value"><input style={inputStyle} value={node.config.value} onChange={(e) => onConfig({ value: e.target.value })} /></Field>
      </>)}

      {node.type === "derive" && (<>
        <Field label="New column name"><input style={inputStyle} value={node.config.target} onChange={(e) => onConfig({ target: e.target.value })} /></Field>
        <Field label="Expression (e.g. revenue / units)"><input style={inputStyle} value={node.config.expression} onChange={(e) => onConfig({ expression: e.target.value })} /></Field>
        <div style={{ fontSize: 11, color: "#8a8270", marginTop: -4 }}>Supports + − × ÷, parentheses, and column names: {cols.slice(0, 4).join(", ")}…</div>
      </>)}

      {node.type === "aggregate" && (<>
        <Field label="Group by (comma-separated)">
          <input style={inputStyle} value={(node.config.groupBy || []).join(", ")} onChange={(e) => onConfig({ groupBy: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
        </Field>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#8a8270", margin: "6px 0" }}>AGGREGATIONS</div>
        {(node.config.aggregations || []).map((a: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select style={{ ...inputStyle, flex: "0 0 78px" }} value={a.fn} onChange={(e) => updateAgg(node, onConfig, i, { fn: e.target.value })}>
              {["sum", "avg", "count", "min", "max"].map((f) => <option key={f}>{f}</option>)}
            </select>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="column" value={a.column} onChange={(e) => updateAgg(node, onConfig, i, { column: e.target.value })} />
            <input style={{ ...inputStyle, flex: 1 }} placeholder="as" value={a.as} onChange={(e) => updateAgg(node, onConfig, i, { as: e.target.value })} />
          </div>
        ))}
        <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => onConfig({ aggregations: [...(node.config.aggregations || []), { fn: "sum", column: cols[0] || "", as: "" }] })}>+ aggregation</button>
      </>)}

      {node.type === "join" && (<>
        <Field label="Inputs (left, right)">
          <div style={{ display: "flex", gap: 6 }}>
            <select style={inputStyle} value={node.inputs[0] || ""} onChange={(e) => onInputs([e.target.value, node.inputs[1] || ""])}>
              <option value="">left…</option>{otherNodes.map((n: PNode) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
            <select style={inputStyle} value={node.inputs[1] || ""} onChange={(e) => onInputs([node.inputs[0] || "", e.target.value])}>
              <option value="">right…</option>{otherNodes.map((n: PNode) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Kind"><select style={inputStyle} value={node.config.kind} onChange={(e) => onConfig({ kind: e.target.value })}><option value="inner">inner</option><option value="left">left</option></select></Field>
        <Field label="Left key"><input style={inputStyle} value={node.config.leftKey} onChange={(e) => onConfig({ leftKey: e.target.value })} /></Field>
        <Field label="Right key"><input style={inputStyle} value={node.config.rightKey} onChange={(e) => onConfig({ rightKey: e.target.value })} /></Field>
      </>)}

      {node.type === "sort" && (<>
        <Field label="Column"><ColSelect cols={cols} value={node.config.column} onChange={(v) => onConfig({ column: v })} /></Field>
        <Field label="Direction"><select style={inputStyle} value={node.config.dir} onChange={(e) => onConfig({ dir: e.target.value })}><option value="asc">ascending</option><option value="desc">descending</option></select></Field>
      </>)}

      {node.type === "limit" && (
        <Field label="Keep first N rows"><input style={inputStyle} type="number" value={node.config.n} onChange={(e) => onConfig({ n: Number(e.target.value) })} /></Field>
      )}

      {node.type === "select" && (
        <Field label="Columns to keep (comma-separated)">
          <input style={inputStyle} value={(node.config.columns || []).join(", ")} onChange={(e) => onConfig({ columns: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
        </Field>
      )}

      {node.type === "validate" && (<>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#8a8270", marginBottom: 6 }}>DATA-QUALITY CONTRACTS</div>
        {(node.config.assertions || []).map((a: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="column" value={a.column} onChange={(e) => updateAssert(node, onConfig, i, { column: e.target.value })} />
            <select style={{ ...inputStyle, flex: "0 0 96px" }} value={a.rule} onChange={(e) => updateAssert(node, onConfig, i, { rule: e.target.value })}>
              {["not_null", "unique", "min", "max", "in_set"].map((r) => <option key={r}>{r}</option>)}
            </select>
            {(a.rule === "min" || a.rule === "max" || a.rule === "in_set") && (
              <input style={{ ...inputStyle, flex: "0 0 70px" }} placeholder="val" value={a.value || ""} onChange={(e) => updateAssert(node, onConfig, i, { value: e.target.value })} />
            )}
          </div>
        ))}
        <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => onConfig({ assertions: [...(node.config.assertions || []), { column: cols[0] || "", rule: "not_null" }] })}>+ assertion</button>
      </>)}

      <button onClick={onDelete} style={{ marginTop: 22, width: "100%", padding: "8px", border: "1.5px solid #be123c", color: "#be123c", background: "#fff", borderRadius: 2, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
        Delete step
      </button>
    </div>
  );
}

function updateAgg(node: PNode, onConfig: any, i: number, patch: any) {
  const aggs = [...(node.config.aggregations || [])];
  aggs[i] = { ...aggs[i], ...patch };
  onConfig({ aggregations: aggs });
}
function updateAssert(node: PNode, onConfig: any, i: number, patch: any) {
  const a = [...(node.config.assertions || [])];
  a[i] = { ...a[i], ...patch };
  onConfig({ assertions: a });
}

function ColSelect({ cols, value, onChange }: { cols: string[]; value: string; onChange: (v: string) => void }) {
  if (!cols.length) return <input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder="column" />;
  return (
    <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      {!cols.includes(value) && <option value={value}>{value || "—"}</option>}
      {cols.map((c) => <option key={c}>{c}</option>)}
    </select>
  );
}

function Preview({ rows, ran }: { rows?: Row[]; ran: boolean }) {
  if (!ran) return <Empty msg="Run the pipeline to see this step's output." />;
  if (!rows || !rows.length) return <Empty msg="This step produced 0 rows." />;
  const cols = Object.keys(rows[0]);
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8270", marginBottom: 8 }}>{rows.length} rows · showing first 50</div>
      <div style={{ overflow: "auto", border: "1.5px solid var(--ink)", borderRadius: 2 }}>
        <table style={{ borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11.5, width: "100%" }}>
          <thead>
            <tr>{cols.map((c) => <th key={c} style={{ position: "sticky", top: 0, background: "var(--ink)", color: "#fff", padding: "6px 9px", textAlign: "left", whiteSpace: "nowrap" }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? "#f4f1ea" : "#fff" }}>
                {cols.map((c) => <td key={c} className="tnum" style={{ padding: "5px 9px", borderTop: "1px solid var(--line)", whiteSpace: "nowrap" }}>{fmtCell(r[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RunLogView({ run, serverMs }: { run: RunResult | null; serverMs: number | null }) {
  if (!run) return <Empty msg="Run the pipeline to see the execution log." />;
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, marginBottom: 12, padding: "8px 10px", background: "#fff", border: "1.5px solid var(--ink)", borderRadius: 2 }}>
        ✓ run complete · {run.log.length} stages · {run.totalMs}ms {serverMs != null ? `· executed server-side (${serverMs}ms round-trip)` : "· executed in-browser"}
      </div>
      {run.log.map((l, i) => {
        const c = l.status === "error" ? "#be123c" : l.status === "warn" ? "#e8582c" : "#0f766e";
        return (
          <div key={l.nodeId} className="pop" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#b8ad96", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: c, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{l.title} <span style={{ color: "#b8ad96", fontWeight: 400, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{l.type}</span></div>
              {l.message && <div style={{ fontSize: 11, color: c }}>{l.message}</div>}
            </div>
            <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "#5a5446" }} className="tnum">
              {l.rowsIn}→{l.rowsOut}<br /><span style={{ color: "#b8ad96", fontSize: 10 }}>{l.ms}ms</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QualityView({ run }: { run: RunResult | null }) {
  if (!run) return <Empty msg="Run the pipeline to evaluate data-quality contracts." />;
  if (!run.quality.length) return <Empty msg="No Validate step in this pipeline. Add one to enforce data-quality contracts." />;
  const passed = run.quality.filter((q) => q.passed).length;
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
        {passed}/{run.quality.length} contracts passed
      </div>
      {run.quality.map((q, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 7, border: `1.5px solid ${q.passed ? "#0f766e" : "#e8582c"}`, borderRadius: 2, background: q.passed ? "#f0f7f5" : "#fdf2ee" }}>
          <span style={{ color: q.passed ? "#0f766e" : "#e8582c", fontWeight: 800, fontSize: 15 }}>{q.passed ? "✓" : "✗"}</span>
          <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{q.assertion}</span>
          {!q.passed && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#e8582c" }}>{q.failures} bad</span>}
        </div>
      ))}
    </div>
  );
}

function AiPanel({ onClose, onApply }: { onClose: () => void; onApply: (p: Pipeline) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) }).then((x) => x.json());
      if (r.keyless) { setMsg(r.message); return; }
      if (r.error) { setMsg(r.error); return; }
      if (r.pipeline?.nodes?.length) onApply(r.pipeline);
      else setMsg("The assistant couldn't produce a valid pipeline. Try rephrasing.");
    } catch (e: any) { setMsg(String(e)); } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.45)", display: "grid", placeItems: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="pop" style={{ width: 540, maxWidth: "90vw", background: "var(--paper)", border: "1.5px solid var(--ink)", borderRadius: 4, boxShadow: "8px 8px 0 var(--ink)", padding: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>✦ AI Pipeline Assistant</div>
        <p style={{ fontSize: 13.5, color: "#5a5446", marginTop: 0 }}>Describe the pipeline you want in plain English. The assistant designs the node graph; you can edit every step after.</p>
        <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. From orders, keep only completed, total revenue by channel, then validate revenue is never negative."
          style={{ ...inputStyle, fontFamily: "var(--font-body)", minHeight: 90, resize: "vertical", marginBottom: 12 }} />
        {msg && <div style={{ fontSize: 12.5, color: "#be123c", marginBottom: 12, fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>{msg}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-go" onClick={generate} disabled={busy || !q.trim()}>{busy ? "Designing…" : "Generate pipeline"}</button>
        </div>
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ color: "#8a8270", fontSize: 13.5, lineHeight: 1.6, padding: "20px 4px" }}>{msg}</div>;
}

function fmtCell(v: any) {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "number") return v.toLocaleString("en-US");
  return String(v);
}

function defaultConfig(type: NodeType, cols: string[]): any {
  const c0 = cols[0] || "";
  switch (type) {
    case "source": return { dataset: "orders" };
    case "filter": return { column: c0, op: "==", value: "" };
    case "derive": return { target: "new_col", expression: c0 || "0" };
    case "aggregate": return { groupBy: c0 ? [c0] : [], aggregations: [{ fn: "count", column: c0, as: "n" }] };
    case "join": return { kind: "inner", leftKey: c0, rightKey: c0 };
    case "sort": return { column: c0, dir: "desc" };
    case "limit": return { n: 10 };
    case "select": return { columns: cols.slice(0, 3) };
    case "validate": return { assertions: [{ column: c0, rule: "not_null" }] };
    default: return {};
  }
}
