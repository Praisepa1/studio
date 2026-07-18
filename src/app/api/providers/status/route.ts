import { NextResponse } from 'next/server';
import { getProviderStatus } from '@/ai/providers';

/**
 * GET handler for securely checking the initialization status of all AI providers on the server.
 * This checks for the presence of provider API keys (Gemini, Claude, OpenRouter) and returns
 * a map of configured statuses to the client, preventing leakage of actual keys.
 */
export async function GET() {
  // Return configuration statuses checked securely on the server
  return NextResponse.json(getProviderStatus());
}
