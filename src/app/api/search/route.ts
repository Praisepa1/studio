import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { searchManager } from '@/core/search/manager';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: Request) {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // 2. Rate Limit Guard: 100 requests per user per hour
  const rateLimitResult = await checkRateLimit(userId, 100, 1);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. 100 searches per hour.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  }

  // 3. Parse Request Body
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { keywords, targetType, industry, location, maxResults } = body;

  // 4. Validate body
  if (!keywords || typeof keywords !== 'string') {
    return NextResponse.json({ error: 'Bad Request', message: 'keywords field is required and must be a string' }, { status: 400 });
  }

  // Cap maxResults at 50
  const limit = Math.min(maxResults && typeof maxResults === 'number' ? maxResults : 20, 50);

  // Construct search term using keywords, industry, location
  const termParts = [keywords];
  if (industry) termParts.push(industry);
  if (location) termParts.push(location);
  const term = termParts.join(' ');

  // 5. Execute Search
  try {
    const results = await searchManager.search({
      term,
      limit,
      targetType: targetType || 'company',
      category: targetType === 'job' ? 'job_board' : 'company_site',
    });

    const providersUsed = Array.from(new Set(results.map(r => r.provider)));

    return NextResponse.json({
      results,
      total: results.length,
      providers_used: providersUsed,
    });
  } catch (error: any) {
    console.error('Search API failure:', error);
    return NextResponse.json(
      {
        error: 'Search provider failure',
        message: error.message || 'The search provider encountered an error.',
      },
      { status: 500 }
    );
  }
}
