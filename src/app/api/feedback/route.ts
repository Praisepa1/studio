import { NextRequest, NextResponse } from "next/server";
import type { FeedbackEntry, FeedbackType, FeedbackRating, AIProvider } from "@/types";

// In production: persist to Firestore or another DB
// For now: in-memory store (resets on server restart) + client uses localStorage
const feedbackStore: FeedbackEntry[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      referenceId,
      referenceTitle,
      rating,
      sentiment,
      notes,
      provider,
      outcome,
      betterProvider,
    } = body as {
      type: FeedbackType;
      referenceId: string;
      referenceTitle?: string;
      rating: FeedbackRating;
      sentiment: "positive" | "negative" | "edited";
      notes?: string;
      provider: AIProvider | "manual";
      outcome?: string;
      betterProvider?: AIProvider;
    };

    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      referenceId,
      referenceTitle,
      rating,
      sentiment,
      notes,
      provider,
      outcome,
      betterProvider,
      createdAt: new Date().toISOString(),
    };

    feedbackStore.unshift(entry);
    // Keep in-memory store bounded
    if (feedbackStore.length > 500) feedbackStore.pop();

    return NextResponse.json({ ok: true, entryId: entry.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[feedback]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ entries: feedbackStore, total: feedbackStore.length });
}
