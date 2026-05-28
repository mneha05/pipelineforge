import { NextRequest, NextResponse } from "next/server";
import { runPipeline, type Pipeline } from "@/lib/engine";
import { SAMPLE_DATA } from "@/lib/sampleData";

// Runs the exact same pure engine that powers the browser canvas — proving the
// pipeline spec is portable and the integration layer is real, not a mock.
export async function POST(req: NextRequest) {
  let pipeline: Pipeline;
  try {
    ({ pipeline } = await req.json());
  } catch {
    return NextResponse.json({ error: "Body must be JSON: { pipeline }" }, { status: 400 });
  }
  if (!pipeline?.nodes?.length) {
    return NextResponse.json({ error: "pipeline.nodes is required" }, { status: 400 });
  }
  try {
    const result = runPipeline(pipeline, SAMPLE_DATA);
    return NextResponse.json(result, { headers: { "x-engine": "shared-ts" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Execution failed" }, { status: 422 });
  }
}
