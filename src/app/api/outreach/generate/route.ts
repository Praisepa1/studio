import { NextRequest, NextResponse } from "next/server";
import { generateWithProvider } from "@/ai/providers";
import { outreachPrompts } from "@/ai/prompts";
import type { OutreachType, AIProvider } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadName = "",
      leadCompany = "",
      leadRole = "",
      leadBio = "",
      offerValue = "",
      type = "first_message",
      channel = "linkedin",
      tone = "direct",
      provider = "gemini",
    } = body as {
      leadName: string;
      leadCompany: string;
      leadRole: string;
      leadBio: string;
      offerValue: string;
      type: OutreachType;
      channel: string;
      tone: string;
      provider: AIProvider;
    };

    let prompt: string;

    if (type === "first_message") {
      prompt = outreachPrompts.first_message({
        leadName,
        company: leadCompany,
        role: leadRole,
        platform: channel,
        tone,
        painPoints: leadBio ? `inferred from bio: "${leadBio.slice(0, 200)}"` : "not specified",
        offerValue: offerValue || "provide relevant value",
      });
    } else if (type === "follow_up") {
      prompt = outreachPrompts.follow_up({
        leadName,
        company: leadCompany,
        tone,
        previousMessage: "Initial outreach was sent recently",
      });
    } else {
      prompt = outreachPrompts.closing({
        leadName,
        company: leadCompany,
        tone,
      });
    }

    const result = await generateWithProvider(provider, prompt, {
      maxTokens: 512,
      temperature: 0.7,
    });

    return NextResponse.json({
      content: result.content,
      geminiDraft: result.geminiDraft,
      claudeRefinement: result.claudeRefinement,
      model: result.model,
      provider,
      type,
      channel,
      tone,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[outreach/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
