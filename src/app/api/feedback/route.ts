export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import type { FeedbackEntry, FeedbackType, FeedbackRating, AIProvider } from "@/types";
import { getAuthSession } from "@/lib/auth";

import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    } = body;

    const supabase = await createClient();
    const { data, error } = await supabase.from('feedback').insert({
      user_id: session.user.id,
      type,
      reference_id: referenceId,
      reference_title: referenceTitle,
      rating,
      sentiment,
      notes,
      provider,
      outcome,
      better_provider: betterProvider,
    }).select().single();

    if (error) {
      console.error("[feedback] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, entryId: data.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[feedback]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await createClient();
    const { data, error, count } = await supabase.from('feedback').select('*', { count: 'exact' });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ entries: data, total: count });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
