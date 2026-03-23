import { NextRequest, NextResponse } from "next/server";
import { scrapeUpwork } from "@/scrapers/upwork";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query = "web development", limit = 10, experienceLevel, projectType } = body;

    const result = await scrapeUpwork({ query, limit, experienceLevel, projectType });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scrape/upwork]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
