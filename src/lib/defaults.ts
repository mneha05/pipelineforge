import type { Pipeline, NodeType } from "./engine";

export const NODE_CATALOG: Record<NodeType, { label: string; color: string; glyph: string; desc: string }> = {
  source: { label: "Source", color: "#1b3a8f", glyph: "▸", desc: "Read from a dataset" },
  filter: { label: "Filter", color: "#0f766e", glyph: "⊃", desc: "Keep matching rows" },
  derive: { label: "Derive", color: "#7c3aed", glyph: "ƒ", desc: "Compute a new column" },
  aggregate: { label: "Aggregate", color: "#b45309", glyph: "Σ", desc: "Group & summarize" },
  join: { label: "Join", color: "#be123c", glyph: "⋈", desc: "Combine two inputs" },
  sort: { label: "Sort", color: "#0e7490", glyph: "↕", desc: "Order rows" },
  limit: { label: "Limit", color: "#4d7c0f", glyph: "⊤", desc: "Take first N rows" },
  select: { label: "Select", color: "#9333ea", glyph: "⊟", desc: "Choose columns" },
  validate: { label: "Validate", color: "#e8582c", glyph: "✓", desc: "Data-quality contracts" },
};

// A working pipeline that demonstrates the full Extract→Transform→Load flow:
// orders → filter completed → derive net_per_unit → join targets → aggregate → validate
export const STARTER_PIPELINE: Pipeline = {
  nodes: [
    { id: "n1", type: "source", title: "orders", config: { dataset: "orders" }, inputs: [], x: 40, y: 60 },
    { id: "n2", type: "filter", title: "completed only", config: { column: "status", op: "==", value: "completed" }, inputs: ["n1"], x: 300, y: 60 },
    { id: "n3", type: "derive", title: "revenue_per_unit", config: { target: "revenue_per_unit", expression: "revenue / units" }, inputs: ["n2"], x: 560, y: 60 },
    { id: "n5", type: "source", title: "region_targets", config: { dataset: "region_targets" }, inputs: [], x: 300, y: 300 },
    { id: "n4", type: "aggregate", title: "by region", config: { groupBy: ["region"], aggregations: [{ fn: "sum", column: "revenue", as: "total_revenue" }, { fn: "avg", column: "revenue_per_unit", as: "avg_rpu" }, { fn: "count", column: "order_id", as: "orders" }] }, inputs: ["n3"], x: 820, y: 60 },
    { id: "n6", type: "join", title: "+ targets", config: { kind: "left", leftKey: "region", rightKey: "region" }, inputs: ["n4", "n5"], x: 1080, y: 160 },
    { id: "n7", type: "derive", title: "attainment_pct", config: { target: "attainment_pct", expression: "total_revenue / quarterly_target * 100" }, inputs: ["n6"], x: 1340, y: 160 },
    { id: "n8", type: "validate", title: "quality gate", config: { assertions: [{ column: "region", rule: "not_null" }, { column: "region", rule: "unique" }, { column: "total_revenue", rule: "min", value: "0" }] }, inputs: ["n7"], x: 1600, y: 160 },
  ],
};
