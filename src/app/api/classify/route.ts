import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { classifyURL } from '@/core/classifier/ai-classifier';

export async function POST(request: Request) {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse Request
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { urls } = body;
  if (!urls || !Array.isArray(urls)) {
    return NextResponse.json({ error: 'Bad Request', message: 'urls must be an array' }, { status: 400 });
  }

  if (urls.length > 50) {
    return NextResponse.json({ error: 'Bad Request', message: 'urls array exceeds maximum size of 50' }, { status: 400 });
  }

  // 3. Classify each URL
  try {
    const results = await Promise.all(
      urls.map(async (item) => {
        if (!item || !item.url) {
          return {
            category: 'ignore' as const,
            confidence: 'low' as const,
            reasoning: 'Invalid input item or missing url',
            recommended_action: 'skip' as const,
          };
        }
        return classifyURL({
          url: item.url,
          title: item.title,
          snippet: item.snippet,
        });
      })
    );

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Classification batch failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
