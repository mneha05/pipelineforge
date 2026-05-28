# PipelineForge — Visual ETL & Data-Integration Builder

> Design data pipelines as a node graph, **run them on a real execution engine**,
> watch data flow through with row-level previews, observe every stage, and enforce
> data-quality contracts — then run the same pipeline server-side through an API.

Most "pipeline builder" demos draw a pretty diagram that does nothing. PipelineForge
**actually executes**: a dependency-free TypeScript engine runs your DAG over real
data — `filter`, `derive` (with a hand-written expression parser), `aggregate`,
`join`, `sort`, `validate` — and the *exact same engine* runs in the browser **and**
in a serverless API route. Build once, run anywhere.

Deploys to Vercel in ~2 minutes and works for anyone with **zero configuration**.

---

## Why this maps to the role

Built deliberately against the Enterprise BI & Integration intern posting:

| What the posting asks for | Where it lives in PipelineForge |
|---|---|
| **Data & data pipelines, ETL** | The whole product: visual Extract → Transform → Load with topological execution |
| **Full life-cycle API management / integration** | `/api/run` executes a posted pipeline spec; pipelines export to portable JSON |
| **Data analytics solutions** | `aggregate`, `derive`, `join`, `sort` produce real analytical outputs |
| **Databases & query languages (SQL concepts)** | Transforms mirror SQL semantics (WHERE, GROUP BY, JOIN, ORDER BY, computed columns) |
| **Reporting / visualization** | Live per-stage data previews + run observability dashboard |
| **AI and AI agents** | "Describe in English → generated pipeline graph" assistant |
| **Structured development lifecycle / Agile** | Built as vertical slices: engine → canvas → observability → quality → AI |
| **Programming languages (Python/Java/C#/etc.)** | Engine in TypeScript; SQL-equivalent transform algebra; clean module boundaries |
| **HTML / CSS** | The entire front end |
| **Version control** | Git + GitHub (this repo) |

> The competencies a BI & Integration team needs — moving data through validated,
> observable transformations and exposing it via an API — are exactly what this builds.

---

## What makes it genuinely impressive (not a diagram)

- **Real engine, shared two ways.** `src/lib/engine.ts` is pure TypeScript with no
  dependencies. The browser canvas calls it directly; `POST /api/run` calls the *same*
  function server-side. The "Run on Server" button proves it.
- **A hand-written expression evaluator.** The `derive` step parses expressions like
  `revenue / units` with a real recursive-descent parser — **no `eval`, no `Function`**,
  fully sandboxed. (See the `tokenize` / `evalExpr` section.)
- **Observability like Airflow/Dagster.** Every run produces a stage log: status,
  rows-in → rows-out, and millisecond timing per node.
- **Data-quality contracts.** A `validate` step enforces `not_null`, `unique`, `min`,
  `max`, `in_set` assertions and produces a pass/fail report — the pipeline *gates* on
  quality, the way production ETL should.
- **Topological execution + cycle detection.** Arbitrary DAGs (including joins of two
  branches) run in correct dependency order; cycles are caught.

---

## The starter pipeline

Opens with a working flow you can run immediately:

```
orders ─▶ filter(completed) ─▶ derive(revenue_per_unit) ─▶ aggregate(by region)
                                                                  │
region_targets ───────────────────────────────────▶ join(left) ◀─┘
                                                          │
                                       derive(attainment_pct) ─▶ validate(quality gate)
```

Hit **▶ Run Pipeline** and watch row counts and timings populate every node.

---

## Run locally

```bash
git clone <your-repo-url> pipelineforge
cd pipelineforge
npm install
npm run dev        # http://localhost:3000
```

Fully functional immediately — build, run, preview, validate, and the API all work
with no keys.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. vercel.com → **Add New Project** → import the repo → **Deploy**. No settings needed.
3. Done — live.

### (Optional) Turn on the AI Assistant

The "AI Assist" button generates a pipeline from a plain-English description. It's the
only feature needing a key, and it **fails gracefully** without one.

1. Get a key at **console.anthropic.com** (add a few dollars of credit under Billing).
2. Vercel → your project → **Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY` = `sk-ant-…`
   - *(optional)* `CLAUDE_MODEL` = `claude-sonnet-4-6`
3. **Redeploy** (Deployments → ⋯ → Redeploy).

> The key is read only server-side from `process.env` — never shipped to the browser,
> never committed. That's why there's an `.env.example` instead of a real key. To test
> locally, create `.env.local` with `ANTHROPIC_API_KEY=sk-ant-…` (it's gitignored).

---

## Project layout

```
pipelineforge/
├── src/
│   ├── lib/
│   │   ├── engine.ts       # pure execution engine: transforms, expression parser, topo sort, runner
│   │   ├── sampleData.ts   # deterministic sample datasets
│   │   └── defaults.ts     # node catalog + starter pipeline
│   ├── app/
│   │   ├── page.tsx        # the visual builder (canvas, inspector, observability, quality, AI)
│   │   └── api/
│   │       ├── run/        # POST a pipeline spec → runs on the shared engine, server-side
│   │       └── ai/         # English → pipeline graph (Anthropic, optional)
│   └── ...
└── README.md
```

---

Built by Neha Mahesh · Computer Science, Purdue University
