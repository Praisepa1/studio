export interface CompanyResearchContext {
  name: string;
  website: string;
  industry?: string;
  size?: string;
  techStack: string[];
  buyingSignals: Array<{ type: string; description: string; weight: number }>;
  score: number;
  tier: string;
  hiringStatus: string;
  departmentsHiring: string[];
}

export interface LeadResearchContext {
  name: string;
  company: string;
  role: string;
  bio: string;
  publicText: string;
}

export const researchPrompts = {
  companyAnalysis: (ctx: CompanyResearchContext) => `
You are a B2B business intelligence analyst. Analyze this company profile and return a JSON object containing deep natural-language insights.

COMPANY NAME: ${ctx.name}
WEBSITE: ${ctx.website}
INDUSTRY: ${ctx.industry || 'Unknown'}
SIZE: ${ctx.size || 'Unknown'}
TECH STACK: ${ctx.techStack.join(', ')}
BUYING SIGNALS DETECTED:
${ctx.buyingSignals.map(s => `- ${s.description} (type: ${s.type}, weight: ${s.weight})`).join('\n')}
COMPANY LEAD SCORE: ${ctx.score} (Tier: ${ctx.tier})
HIRING STATUS: ${ctx.hiringStatus}
DEPARTMENTS HIRING: ${ctx.departmentsHiring.join(', ') || 'None'}

Return ONLY a valid JSON object with these exact fields:
{
  "one_liner": "A single sentence describing what the company does, written as if explaining to a smart friend, not a press release.",
  "pain_point_hypothesis": "What problem they most likely have right now based on the buying signals found. Do NOT write generic statements. You MUST reference the SPECIFIC buying signals detected by name (e.g. 'Since their site has no mobile viewport and a stale copyright, they are likely suffering from website maintenance neglect').",
  "pitch_angle": "One concrete sentence on what kind of service or offer maps best to this company's situation.",
  "fit_score_reason": "Explain in plain English for a human reading the CRM record why the numeric lead score is ${ctx.score} based on the balance of positive and negative signals."
}

Return only raw JSON. Do not wrap in markdown code blocks.
`,

  companyAnalysisConstrained: (ctx: CompanyResearchContext) => `
You are a B2B business intelligence analyst. Analyze this company profile. Your previous analysis was flagged as too vague. 
You MUST provide highly specific, concrete insights that directly mention the exact buying signals detected.

COMPANY NAME: ${ctx.name}
WEBSITE: ${ctx.website}
INDUSTRY: ${ctx.industry || 'Unknown'}
TECH STACK: ${ctx.techStack.join(', ')}
BUYING SIGNALS DETECTED (MUST REFERENCE THESE SPECIFICALLY BY NAME):
${ctx.buyingSignals.map(s => `- ${s.description} (type: ${s.type})`).join('\n')}
COMPANY LEAD SCORE: ${ctx.score} (Tier: ${ctx.tier})
DEPARTMENTS HIRING: ${ctx.departmentsHiring.join(', ') || 'None'}

Return ONLY a valid JSON object with these exact fields:
{
  "one_liner": "A single sentence explaining what the company does in plain terms.",
  "pain_point_hypothesis": "A specific hypothesis of their current business/technical pain, directly referencing at least one of the signals: ${ctx.buyingSignals.map(s => s.type).join(', ')}. Do not use generalities.",
  "pitch_angle": "One concrete sentence mapping an offer specifically to the identified pain.",
  "fit_score_reason": "Plain English rationale for the lead score of ${ctx.score} referencing the specific signals."
}

Return only raw JSON. Do not wrap in markdown code blocks.
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
