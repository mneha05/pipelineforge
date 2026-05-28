# PipelineForge — Visual ETL & Data-Integration Builder

> Design data pipelines as a node graph, **run them on a real execution engine**,
> watch data flow through with row-level previews, observe every stage, and enforce
> data-quality contracts — then run the same pipeline server-side through an API.

Most "pipeline builder" demos draw a pretty diagram that does nothing. PipelineForge
**actually executes**: a dependency-free TypeScript engine runs your DAG over real
data — `filter`, `derive` (with a hand-written expression parser), `aggregate`,
`join`, `sort`, `validate` — and the *exact same engine* runs in the browser **and**
in a serverless API route. Build once, run anywhere.


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
