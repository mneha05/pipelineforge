// PipelineForge execution engine — pure, dependency-free TypeScript.
// Runs identically in the browser and in the /api/run serverless route.

export type Row = Record<string, any>;

export type NodeType =
  | "source" | "filter" | "derive" | "aggregate"
  | "join" | "sort" | "limit" | "select" | "validate";

export interface PNode {
  id: string;
  type: NodeType;
  title: string;
  config: any;
  inputs: string[];
  x: number;
  y: number;
}

export interface Pipeline {
  nodes: PNode[];
}

export interface StageLog {
  nodeId: string;
  title: string;
  type: NodeType;
  status: "ok" | "error" | "warn";
  rowsIn: number;
  rowsOut: number;
  ms: number;
  message?: string;
}

export interface QualityResult {
  nodeId: string;
  assertion: string;
  column: string;
  passed: boolean;
  failures: number;
}

export interface RunResult {
  outputs: Record<string, Row[]>;
  log: StageLog[];
  quality: QualityResult[];
  finalNodeId: string | null;
  totalMs: number;
}

// ---------------------------------------------------------------------------
// Tiny safe arithmetic expression evaluator (recursive descent).
// Supports: + - * /, parentheses, numeric literals, and bare column names.
// No eval / Function — fully sandboxed.
// ---------------------------------------------------------------------------
type Tok = { t: "num" | "id" | "op" | "lp" | "rp"; v: string };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") { i++; continue; }
    if ("+-*/".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    if (c === "(") { toks.push({ t: "lp", v: c }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp", v: c }); i++; continue; }
    if (/[0-9.]/.test(c)) {
      let n = "";
      while (i < src.length && /[0-9.]/.test(src[i])) n += src[i++];
      toks.push({ t: "num", v: n });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let id = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) id += src[i++];
      toks.push({ t: "id", v: id });
      continue;
    }
    throw new Error(`Unexpected character '${c}' in expression`);
  }
  return toks;
}

function evalExpr(src: string, row: Row): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  // expr := term (('+'|'-') term)*
  function expr(): number {
    let v = term();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = next().v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  // term := factor (('*'|'/') factor)*
  function term(): number {
    let v = factor();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = next().v;
      const r = factor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  // factor := number | column | '(' expr ')' | '-' factor
  function factor(): number {
    const tk = peek();
    if (!tk) throw new Error("Unexpected end of expression");
    if (tk.t === "op" && tk.v === "-") { next(); return -factor(); }
    if (tk.t === "num") { next(); return parseFloat(tk.v); }
    if (tk.t === "id") { next(); const x = Number(row[tk.v]); return isNaN(x) ? 0 : x; }
    if (tk.t === "lp") { next(); const v = expr(); if (!peek() || peek().t !== "rp") throw new Error("Missing ')'"); next(); return v; }
    throw new Error(`Unexpected token '${tk.v}'`);
  }

  const result = expr();
  if (p < toks.length) throw new Error("Trailing tokens in expression");
  return result;
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------
const CMP: Record<string, (a: any, b: any) => boolean> = {
  "==": (a, b) => String(a) === String(b),
  "!=": (a, b) => String(a) !== String(b),
  ">": (a, b) => Number(a) > Number(b),
  "<": (a, b) => Number(a) < Number(b),
  ">=": (a, b) => Number(a) >= Number(b),
  "<=": (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
};

function applyFilter(rows: Row[], cfg: any): Row[] {
  const fn = CMP[cfg.op] || CMP["=="];
  return rows.filter((r) => fn(r[cfg.column], cfg.value));
}

function applyDerive(rows: Row[], cfg: any): Row[] {
  return rows.map((r) => ({ ...r, [cfg.target]: round(evalExpr(cfg.expression || "0", r)) }));
}

function applyAggregate(rows: Row[], cfg: any): Row[] {
  const groupCols: string[] = cfg.groupBy || [];
  const aggs: { fn: string; column: string; as: string }[] = cfg.aggregations || [];
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = groupCols.map((c) => r[c]).join("‖");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const out: Row[] = [];
  for (const [, grp] of groups) {
    const o: Row = {};
    for (const c of groupCols) o[c] = grp[0][c];
    for (const a of aggs) {
      const nums = grp.map((g) => Number(g[a.column])).filter((n) => !isNaN(n));
      let v: number;
      switch (a.fn) {
        case "count": v = grp.length; break;
        case "sum": v = nums.reduce((s, n) => s + n, 0); break;
        case "avg": v = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0; break;
        case "min": v = Math.min(...nums); break;
        case "max": v = Math.max(...nums); break;
        default: v = grp.length;
      }
      o[a.as || `${a.fn}_${a.column}`] = round(v);
    }
    out.push(o);
  }
  return out;
}

function applyJoin(left: Row[], right: Row[], cfg: any): Row[] {
  const lk = cfg.leftKey, rk = cfg.rightKey;
  const kind = cfg.kind || "inner";
  const index = new Map<string, Row[]>();
  for (const r of right) {
    const k = String(r[rk]);
    if (!index.has(k)) index.set(k, []);
    index.get(k)!.push(r);
  }
  const out: Row[] = [];
  for (const l of left) {
    const matches = index.get(String(l[lk])) || [];
    if (matches.length) {
      for (const m of matches) out.push({ ...m, ...l });
    } else if (kind === "left") {
      out.push({ ...l });
    }
  }
  return out;
}

function applySort(rows: Row[], cfg: any): Row[] {
  const c = cfg.column, dir = cfg.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[c], bv = b[c];
    if (av === bv) return 0;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av) > String(bv) ? dir : -dir;
  });
}

function applySelect(rows: Row[], cfg: any): Row[] {
  const cols: string[] = cfg.columns || [];
  if (!cols.length) return rows;
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
}

function runValidations(rows: Row[], cfg: any, nodeId: string): QualityResult[] {
  const checks: any[] = cfg.assertions || [];
  return checks.map((a) => {
    let failures = 0;
    for (const r of rows) {
      const v = r[a.column];
      let ok = true;
      if (a.rule === "not_null") ok = v !== null && v !== undefined && v !== "";
      else if (a.rule === "unique") ok = true; // handled below
      else if (a.rule === "min") ok = Number(v) >= Number(a.value);
      else if (a.rule === "max") ok = Number(v) <= Number(a.value);
      else if (a.rule === "in_set") ok = (a.value || "").split(",").map((s: string) => s.trim()).includes(String(v));
      if (!ok) failures++;
    }
    if (a.rule === "unique") {
      const seen = new Set();
      for (const r of rows) {
        const v = r[a.column];
        if (seen.has(v)) failures++;
        seen.add(v);
      }
    }
    const label =
      a.rule === "not_null" ? `${a.column} is never null`
      : a.rule === "unique" ? `${a.column} is unique`
      : a.rule === "min" ? `${a.column} ≥ ${a.value}`
      : a.rule === "max" ? `${a.column} ≤ ${a.value}`
      : `${a.column} ∈ {${a.value}}`;
    return { nodeId, assertion: label, column: a.column, passed: failures === 0, failures };
  });
}

export function round(n: number, d = 2): number {
  if (!isFinite(n)) return 0;
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

// ---------------------------------------------------------------------------
// DAG topological sort + runner
// ---------------------------------------------------------------------------
export function topoSort(nodes: PNode[]): PNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const temp = new Set<string>();
  const order: PNode[] = [];
  function visit(n: PNode) {
    if (visited.has(n.id)) return;
    if (temp.has(n.id)) throw new Error("Cycle detected in pipeline");
    temp.add(n.id);
    for (const inp of n.inputs) {
      const p = byId.get(inp);
      if (p) visit(p);
    }
    temp.delete(n.id);
    visited.add(n.id);
    order.push(n);
  }
  for (const n of nodes) visit(n);
  return order;
}

export function runPipeline(pipe: Pipeline, sources: Record<string, Row[]>): RunResult {
  const t0 = now();
  const outputs: Record<string, Row[]> = {};
  const log: StageLog[] = [];
  const quality: QualityResult[] = [];
  const ordered = topoSort(pipe.nodes);
  let finalNodeId: string | null = null;

  for (const node of ordered) {
    const s0 = now();
    const inputRows: Row[][] = node.inputs.map((id) => outputs[id] || []);
    const rowsIn = inputRows.reduce((s, r) => s + r.length, 0);
    let out: Row[] = inputRows[0] || [];
    let status: StageLog["status"] = "ok";
    let message: string | undefined;

    try {
      switch (node.type) {
        case "source":
          out = sources[node.config.dataset] || [];
          break;
        case "filter": out = applyFilter(out, node.config); break;
        case "derive": out = applyDerive(out, node.config); break;
        case "aggregate": out = applyAggregate(out, node.config); break;
        case "join": out = applyJoin(inputRows[0] || [], inputRows[1] || [], node.config); break;
        case "sort": out = applySort(out, node.config); break;
        case "limit": out = out.slice(0, Number(node.config.n) || 10); break;
        case "select": out = applySelect(out, node.config); break;
        case "validate": {
          const q = runValidations(out, node.config, node.id);
          quality.push(...q);
          if (q.some((x) => !x.passed)) { status = "warn"; message = `${q.filter((x) => !x.passed).length} assertion(s) failed`; }
          break;
        }
      }
    } catch (e: any) {
      status = "error";
      message = e?.message || String(e);
      out = [];
    }

    outputs[node.id] = out;
    finalNodeId = node.id;
    log.push({
      nodeId: node.id, title: node.title, type: node.type, status,
      rowsIn, rowsOut: out.length, ms: round(now() - s0, 1), message,
    });
  }

  return { outputs, log, quality, finalNodeId, totalMs: round(now() - t0, 1) };
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
