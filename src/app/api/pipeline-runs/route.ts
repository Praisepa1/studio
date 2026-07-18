import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const supabase = await createClient();

    // Select last 20 runs sorted by started_at desc
    const { data, error } = await supabase
      .from("pipeline_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("Table pipeline_runs fetch failed or missing. Using empty fallback:", error);
      return NextResponse.json([]);
    }

    // Map snake_case columns from DB to camelCase shape expected by the hook
    const mapped = (data || []).map((run: any) => ({
      id: run.id,
      userId: run.user_id || run.userId,
      keyword: run.query || run.keyword,
      status: run.status,
      companiesFound: run.companies_found || run.companiesFound || 0,
      startedAt: run.started_at || run.startedAt,
      completedAt: run.completed_at || run.completedAt,
      durationMs: run.duration_ms || run.durationMs || 0,
      error: run.error || undefined,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error("pipeline-runs API failure:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
