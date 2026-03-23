// ============================================================
// JobJet — Reusable Prompt Templates (v1)
// ============================================================

// ─── Proposal Prompts ────────────────────────────────────────

interface ProposalContext {
  gigTitle: string;
  gigDescription: string;
  skills: string;
  clientTone: string;
  painPoints: string;
  userSkills: string;
  budget: string;
}

export const proposalPrompts = {
  concise: (ctx: ProposalContext) => `
You are a top-rated freelancer writing a winning Upwork proposal.

GIG: ${ctx.gigTitle}
DESCRIPTION: ${ctx.gigDescription}
CLIENT SIGNALS: ${ctx.clientTone}
LIKELY PAIN POINTS: ${ctx.painPoints}
BUDGET: ${ctx.budget}
YOUR SKILLS: ${ctx.userSkills}

Write a CONCISE Upwork proposal (150–200 words).
Rules:
- Open by addressing the client's specific problem (not "I am interested")
- Mention one relevant proof point or result
- Keep paragraphs short and scannable
- End with a clear, low-friction CTA
- No generic openers, no filler
`,

  premium: (ctx: ProposalContext) => `
You are a high-value consultant writing a premium Upwork proposal.

GIG: ${ctx.gigTitle}
DESCRIPTION: ${ctx.gigDescription}
CLIENT SIGNALS: ${ctx.clientTone}
LIKELY PAIN POINTS: ${ctx.painPoints}
BUDGET: ${ctx.budget}
YOUR SKILLS: ${ctx.userSkills}

Write a PREMIUM, consultative Upwork proposal (250–320 words).
Rules:
- Open by diagnosing the client's specific business problem
- Position as a strategic expert, not a commodity service provider
- Show understanding of their industry or goals
- Include 2–3 specific proof points with measurable results
- End with a confident, value-focused CTA
`,

  technical: (ctx: ProposalContext) => `
You are a technical expert writing a precise Upwork proposal.

GIG: ${ctx.gigTitle}
DESCRIPTION: ${ctx.gigDescription}
TECHNICAL NEEDS: ${ctx.painPoints}
BUDGET: ${ctx.budget}
YOUR TECHNICAL SKILLS: ${ctx.userSkills}

Write a TECHNICAL Upwork proposal (200–270 words).
Rules:
- Open with a concise technical summary of the solution
- Name specific technologies, frameworks, or methodologies you'd use
- Address any technical challenges or edge cases you anticipate
- Include relevant past technical experience
- End with a concrete next step
`,

  friendly: (ctx: ProposalContext) => `
You are a personable, approachable freelancer writing an Upwork proposal.

GIG: ${ctx.gigTitle}
DESCRIPTION: ${ctx.gigDescription}
CLIENT VIBE: ${ctx.clientTone}
LIKELY NEEDS: ${ctx.painPoints}
YOUR SKILLS: ${ctx.userSkills}

Write a FRIENDLY Upwork proposal (180–240 words).
Rules:
- Open warmly but get to the point within 2 sentences
- Reference something specific from their posting
- Sound like a real person, not a template
- Share relevant experience in a conversational way
- End with a friendly invitation to chat
`,
};

// ─── Outreach Prompts ────────────────────────────────────────

interface OutreachFirstContext {
  leadName: string;
  company: string;
  role: string;
  platform: string;
  tone: string;
  painPoints: string;
  offerValue: string;
}

interface OutreachFollowUpContext {
  leadName: string;
  company: string;
  tone: string;
  previousMessage: string;
}

interface OutreachClosingContext {
  leadName: string;
  company: string;
  tone: string;
}

export const outreachPrompts = {
  first_message: (ctx: OutreachFirstContext) => `
You are writing a personalized outreach first message for ${ctx.platform}.

LEAD: ${ctx.leadName}, ${ctx.role} at ${ctx.company}
TONE: ${ctx.tone}
LIKELY PAIN POINTS: ${ctx.painPoints}
YOUR VALUE/OFFER: ${ctx.offerValue}

Write a compelling FIRST OUTREACH MESSAGE.
Rules:
- Very short opening (1–2 sentences max), no long intros
- Reference something specific about them or their business
- Connect their likely need to a concrete outcome you deliver
- ONE clear call to action (suggest a quick chat or ask an insight question)
- LinkedIn DM: 100–140 words. Email: 150–200 words.
- Sound like a real person, not a sales bot
- Never use "Hope this message finds you well" or similar clichés
`,

  follow_up: (ctx: OutreachFollowUpContext) => `
You are writing a follow-up outreach message.

LEAD: ${ctx.leadName} at ${ctx.company}
TONE: ${ctx.tone}
CONTEXT FROM PREVIOUS MESSAGE: ${ctx.previousMessage}

Write a SHORT, effective FOLLOW-UP (60–90 words).
Rules:
- Acknowledge briefly, don't apologize for following up
- Add a new angle, insight, or value point
- Gentle, non-pushy tone
- Easy yes/no or one-click CTA
`,

  closing: (ctx: OutreachClosingContext) => `
Write a brief CLOSING message for an outreach sequence to ${ctx.leadName} at ${ctx.company}.
Tone: ${ctx.tone}

Rules:
- 50–70 words
- Graceful close, leave the door open for future
- No guilt-tripping or desperation
- Professional and warm
`,
};

// ─── Research / Intelligence Prompts ─────────────────────────

interface GigResearchContext {
  title: string;
  description: string;
  skills: string[];
  budget: string;
  clientHistory: string;
}

interface LeadResearchContext {
  name: string;
  company: string;
  role: string;
  bio: string;
  publicText: string;
}

export const researchPrompts = {
  gigAnalysis: (ctx: GigResearchContext) => `
You are a freelance business intelligence analyst. Analyze this Upwork gig and return a JSON object.

GIG TITLE: ${ctx.title}
DESCRIPTION: ${ctx.description}
REQUIRED SKILLS: ${ctx.skills.join(', ')}
BUDGET: ${ctx.budget}
CLIENT HISTORY: ${ctx.clientHistory}

Return ONLY a valid JSON object with these exact fields:
{
  "summary": "2–3 sentence plain-English summary of what the client needs",
  "likelyPainPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "likelyClientTone": "one of: formal | technical | friendly | urgent | startup | enterprise",
  "proposalAngles": ["angle 1", "angle 2", "angle 3"],
  "likelyObjections": ["objection 1", "objection 2"],
  "bestMessageAngle": "The strongest single opening sentence for a proposal",
  "recommendedStyle": "one of: concise | premium | technical | friendly",
  "conversionScore": 7,
  "clientProfileSummary": "Brief inferred profile of this client's business situation"
}

Score conversionScore 1–10 based on budget clarity, client history quality, and description specificity.
Be specific and actionable. Return only the JSON, no markdown wrapping.
`,

  leadAnalysis: (ctx: LeadResearchContext) => `
You are a business intelligence analyst. Analyze this lead profile and return a JSON object.

NAME: ${ctx.name}
COMPANY: ${ctx.company}
ROLE: ${ctx.role}
BIO/ABOUT: ${ctx.bio}
PUBLIC TEXT/POSTS: ${ctx.publicText}

Return ONLY a valid JSON object with these exact fields:
{
  "summary": "2–3 sentence profile summary",
  "businessNeedSummary": "What they likely need help with right now",
  "likelyPainPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "communicationStyle": "one of: formal | casual | technical | executive | entrepreneur",
  "recommendedTone": "one of: professional | friendly | direct | premium",
  "outreachAngle": "Best specific angle for a first message",
  "suggestedOfferFraming": "How to frame your offer to resonate with this person",
  "likelyObjections": ["objection 1", "objection 2"],
  "confidenceNotes": "Transparency note: which signals are clear vs. inferred",
  "qualityScore": 7
}

Score qualityScore 1–10 based on profile richness and signal clarity.
Be specific. Return only the JSON, no markdown wrapping.
`,
};
