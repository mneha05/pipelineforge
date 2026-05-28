import { NextRequest, NextResponse } from "next/server";

const SYSTEM = `You are the PipelineForge assistant. You design data pipelines as a JSON node graph.

Available datasets (use exact column names):
- orders(order_id, date, region, channel, product, units, revenue, status)   -- status in {completed, refunded, pending}
- region_targets(region, manager, quarterly_target)

Node types and their config shapes:
- source:    { dataset: "orders" | "region_targets" }                      inputs: []
- filter:    { column, op: "=="|"!="|">"|"<"|">="|"<="|"contains", value }  inputs: [parentId]
- derive:    { target: newColName, expression: "revenue / units" }          inputs: [parentId]  (arithmetic + column names only)
- aggregate: { groupBy: [cols], aggregations: [{ fn:"sum"|"avg"|"count"|"min"|"max", column, as }] }  inputs: [parentId]
- join:      { kind: "inner"|"left", leftKey, rightKey }                    inputs: [leftId, rightId]
- sort:      { column, dir: "asc"|"desc" }                                  inputs: [parentId]
- limit:     { n: number }                                                  inputs: [parentId]
- select:    { columns: [cols] }                                            inputs: [parentId]
- validate:  { assertions: [{ column, rule:"not_null"|"unique"|"min"|"max"|"in_set", value? }] }  inputs: [parentId]

Output STRICT JSON only (no markdown):
{ "nodes": [ { "id": "n1", "type": "...", "title": "short label", "config": {...}, "inputs": [...], "x": 40, "y": 60 } ] }

Layout rule: lay nodes left-to-right, x increasing by ~250 per stage starting at 40, y around 80; put a second source lower (y~300). Every non-source node must reference real upstream ids in "inputs". Keep it to 3-7 nodes. Use only the columns listed above (and columns you create with derive/aggregate).`;

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

  let question = "";
  try { ({ question } = await req.json()); } catch {
    return NextResponse.json({ error: "Body must be JSON: { question }" }, { status: 400 });
  }
  if (!question?.trim()) return NextResponse.json({ error: "Missing 'question'." }, { status: 400 });

  if (!key) {
    return NextResponse.json({
      keyless: true,
      message:
        "AI Assistant is dormant: no ANTHROPIC_API_KEY is set. Add one in Vercel → Settings → Environment Variables to enable English-to-pipeline generation. The visual builder, engine, validation, and API all work without it.",
    });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1200, system: SYSTEM, messages: [{ role: "user", content: question }] }),
    });
    if (!r.ok) return NextResponse.json({ error: `Anthropic API error (${r.status})`, detail: await r.text() }, { status: 502 });
    const data = await r.json();
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(clean); } catch {
      return NextResponse.json({ error: "Assistant returned non-JSON.", raw: text }, { status: 502 });
    }
    const nodes = parsed.nodes || parsed.pipeline?.nodes;
    if (!Array.isArray(nodes) || !nodes.length) {
      return NextResponse.json({ error: "Assistant produced no nodes." }, { status: 422 });
    }
    return NextResponse.json({ pipeline: { nodes } }, { headers: { "x-api-version": "v1" } });
  } catch (e: any) {
    return NextResponse.json({ error: "Upstream failure", detail: String(e?.message || e) }, { status: 502 });
  }
}
