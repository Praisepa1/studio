export const maxDuration = 300;
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { pipelineQueue } from '@/lib/queue/pipeline-queue';

export async function POST(request: Request) {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // 2. Rate Limit: 100 discovery runs per day (24 hours)
  const rateLimitResult = await checkRateLimit(userId, 100, 100);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. 20 discovery runs per day.' },
      { status: 429 }
    );
  }

  // 3. Parse Request
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { target, keywords } = body;
  if (!target || typeof target !== 'string') {
    return NextResponse.json({ error: 'Bad Request', message: 'target field is required' }, { status: 400 });
  }
  if (!keywords || typeof keywords !== 'string') {
    return NextResponse.json({ error: 'Bad Request', message: 'keywords field is required' }, { status: 400 });
  }

  // 4. Create pipeline_run
  try {
    const supabase = await createClient();
    const { data: runData, error: runError } = await supabase
      .from('pipeline_runs')
      .insert({ user_id: userId, target: target, config: body })
      .select('id')
      .single();

    if (runError || !runData) {
      console.error("Failed to insert pipeline_runs", runError);
      return NextResponse.json({ error: 'Failed to initialize pipeline run' }, { status: 500 });
    }

    const runId = runData.id;

    // 5. Enqueue background job
    await pipelineQueue.add('process-pipeline', {
      runId,
      userId,
      config: body
    });

    // 6. Return run_id immediately to the frontend so it can subscribe to Realtime
    return NextResponse.json({ run_id: runId });

  } catch (e: any) {
    console.error("API error enqueuing pipeline:", e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
