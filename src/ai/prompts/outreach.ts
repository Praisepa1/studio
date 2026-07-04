export interface OutreachFirstContext {
  leadName: string;
  company: string;
  role: string;
  platform: string;
  tone: string;
  painPoints: string;
  offerValue: string;
  specificSignal?: string;
}

export interface OutreachFollowUpContext {
  leadName: string;
  company: string;
  tone: string;
  previousMessage: string;
  specificSignal?: string;
}

export interface OutreachClosingContext {
  leadName: string;
  company: string;
  tone: string;
}

export const first_message = (ctx: OutreachFirstContext) => `
You are writing a personalized first outreach message to be sent via ${ctx.platform}.

LEAD DETAILS:
- Name: ${ctx.leadName}
- Role: ${ctx.role}
- Company: ${ctx.company}
- Specific Target Pain Point: ${ctx.painPoints}
- Outreach Tone: ${ctx.tone}
- Value Offer: ${ctx.offerValue}
${ctx.specificSignal ? `- Contextual Signal: ${ctx.specificSignal}` : ''}

Write a highly personalized, compelling FIRST OUTREACH MESSAGE.
Rules:
- Address the lead by name (${ctx.leadName}) and reference their specific role (${ctx.role}) or company (${ctx.company}).
- You must reference at least one specific, named detail or buying signal from their company.
- Very short opening (1–2 sentences max), no generic openers or clichés like "Hope this message finds you well".
- Sound like a real human writing directly to another human.
- One clear call to action (suggest a quick chat or ask a thoughtful industry question).
- Length limit: 100–140 words for LinkedIn DMs, 150–200 words for Email.
`;

export const followup = (ctx: OutreachFollowUpContext) => `
You are writing a short, effective follow-up outreach message.

LEAD DETAILS:
- Name: ${ctx.leadName}
- Company: ${ctx.company}
- Tone: ${ctx.tone}
- Context from previous message: ${ctx.previousMessage}
${ctx.specificSignal ? `- Contextual Signal: ${ctx.specificSignal}` : ''}

Write a follow-up message (60–90 words).
Rules:
- Keep it brief. Do not apologize for following up.
- Directly reference ${ctx.leadName} and their company ${ctx.company}.
- Introduce a new angle, insight, or value point (e.g. referencing a recent signal like ${ctx.specificSignal || 'their tech stack'}).
- Gentle, value-driven tone.
- Easy yes/no or one-click CTA.
`;

// Also alias follow_up to followup for API route compatibility
export const follow_up = followup;

export const close = (ctx: OutreachClosingContext) => `
Write a brief closing message for an outreach sequence to ${ctx.leadName} at ${ctx.company}.
Tone: ${ctx.tone}

Rules:
- 50–70 words.
- Graceful close, ending the sequence but leaving the door open for the future.
- No pushiness or guilt-tripping.
- Maintain a professional and warm tone.
`;

// Also alias closing to close for API route compatibility
export const closing = close;

// Combined object for backward compatibility
export const outreachPrompts = {
  first_message,
  follow_up,
  closing,
};
