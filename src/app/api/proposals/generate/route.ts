import { NextRequest, NextResponse } from "next/server";
import { generateWithProvider } from "@/ai/providers";
import { proposalPrompts } from "@/ai/prompts";
import type { ProposalStyle, AIProvider } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title = "",
      description = "",
      budget = "not specified",
      skills = [],
      userSkills = "",
      style = "premium",
      provider = "gemini",
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
    console.error("[proposals/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
