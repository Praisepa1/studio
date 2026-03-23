import { NextRequest, NextResponse } from "next/server";
import { enrichGig } from "@/enrichment";
import type { Gig, AIProvider } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gig, provider = "gemini" } = body as { gig: Gig; provider: AIProvider };

    if (!gig?.id) {
      return NextResponse.json({ error: "gig object is required" }, { status: 400 });
    }

    const enrichment = await enrichGig(gig, { provider });

    return NextResponse.json({
      gigId: gig.id,
      enrichment,
      provider,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[research/gig]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
