export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { generateWithProvider, DEFAULT_AI_PROVIDER } from "@/ai/providers";
import { proposalPrompts } from "@/ai/prompts";
import type { ProposalStyle, AIProvider } from "@/types";
import { getAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title = "",
      description = "",
      budget = "not specified",
      skills = [],
      userSkills = "",
      style = "premium",
      provider = DEFAULT_AI_PROVIDER,
    } = body as {
      title: string;
      description: string;
      budget?: string;
      skills?: string[];
      userSkills?: string;
      style: ProposalStyle;
      provider: AIProvider;
    };

    // Build context for the prompt
    const ctx = {
      jobTitle: title,
      jobDescription: description,
      skills: skills.join(", "),
      clientTone: "unknown (analyze from description)",
      painPoints: "infer from description",
      userSkills: userSkills || "experienced B2B partner",
      budget: budget,
    };

    // Select prompt template based on style
    const promptFn = proposalPrompts[style] ?? proposalPrompts.premium;
    const prompt = promptFn(ctx);

    const result = await generateWithProvider(provider, prompt, {
      maxTokens: 1024,
      temperature: 0.7,
    });

    return NextResponse.json({
      content: result.content,
      geminiDraft: result.geminiDraft,
      claudeRefinement: result.claudeRefinement,
      model: result.model,
      provider,
      style,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const cause = err instanceof Error && err.cause ? String((err as any).cause) : undefined;
    console.error("[proposals/generate]", message, stack, cause);
    return NextResponse.json({ error: message, stack, cause }, { status: 500 });
  }
}
