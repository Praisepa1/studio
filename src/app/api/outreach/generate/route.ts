import { NextRequest, NextResponse } from "next/server";
import { generateWithProvider } from "@/ai/providers";
import { outreachPrompts } from "@/ai/prompts";
import type { Lead } from "@/types/lead";
import type { OutreachType, AIProvider } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lead,
      type = "first_message",
      channel = "linkedin",
      tone = "direct",
      provider = "gemini",
      offerValue = "",
    } = body as {
      lead: Lead;
      type: OutreachType;
      channel?: string;
      tone?: string;
      provider: AIProvider;
      offerValue?: string;
    };

    if (!lead || !lead.name) {
      return NextResponse.json({ error: "Missing required lead object" }, { status: 400 });
    }

    let prompt: string;

    if (type === "first_message") {
      prompt = outreachPrompts.first_message({
        leadName: lead.name,
        company: lead.companyName || lead.company || "your company",
        role: lead.title,
        platform: lead.platform || channel,
        tone,
        painPoints: lead.recentActivity || "not specified",
        offerValue: offerValue || "provide relevant B2B services",
        specificSignal: lead.recentActivity ? `Recent activity: ${lead.recentActivity}` : undefined,
      });
    } else if (type === "follow_up") {
      prompt = outreachPrompts.follow_up({
        leadName: lead.name,
        company: lead.companyName || lead.company || "your company",
        tone,
        previousMessage: "Initial outreach was sent recently",
        specificSignal: lead.recentActivity ? `Recent activity: ${lead.recentActivity}` : undefined,
      });
    } else {
      prompt = outreachPrompts.closing({
        leadName: lead.name,
        company: lead.companyName || lead.company || "your company",
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
      channel: lead.platform || channel,
      tone,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[outreach/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
