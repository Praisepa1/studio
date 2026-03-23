import { NextRequest, NextResponse } from "next/server";
import { enrichLead } from "@/enrichment";
import type { Lead, AIProvider } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead, provider = "gemini" } = body as { lead: Lead; provider: AIProvider };

    if (!lead?.id) {
      return NextResponse.json({ error: "lead object is required" }, { status: 400 });
    }

    const enrichment = await enrichLead(lead, { provider });

    return NextResponse.json({
      leadId: lead.id,
      enrichment,
      provider,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[research/lead]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
