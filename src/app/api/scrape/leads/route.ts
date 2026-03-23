import { NextRequest, NextResponse } from "next/server";
import { scrapeLeads } from "@/scrapers/leads";
import type { LeadSource } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      query = "startup founder",
      source = "linkedin",
      niche,
      location,
      limit = 10,
    } = body as {
      query: string;
      source: LeadSource;
      niche?: string;
      location?: string;
      limit?: number;
    };

    const result = await scrapeLeads({ query, source, niche, location, limit });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scrape/leads]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
