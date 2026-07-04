export interface ProposalContext {
  jobTitle?: string;
  gigTitle?: string;
  jobDescription?: string;
  gigDescription?: string;
  skills: string;
  clientTone: string;
  painPoints: string;
  userSkills: string;
  budget: string;
}

export const proposalPrompts = {
  concise: (ctx: ProposalContext) => {
    const title = ctx.jobTitle || ctx.gigTitle || '';
    const desc = ctx.jobDescription || ctx.gigDescription || '';
    return `
You are a top-rated consultant writing a winning project proposal.

PROJECT: ${title}
DESCRIPTION: ${desc}
PROSPECT SIGNALS: ${ctx.clientTone}
LIKELY PAIN POINTS: ${ctx.painPoints}
CLIENT BUDGET: ${ctx.budget}
YOUR SKILLS: ${ctx.userSkills}

Write a CONCISE project proposal (150–200 words).
Rules:
- Open by addressing the prospect's specific problem (not "I am interested")
- Mention one relevant proof point or result
- Keep paragraphs short and scannable
- End with a clear, low-friction CTA
- No generic openers, no filler
`;
  },

  premium: (ctx: ProposalContext) => {
    const title = ctx.jobTitle || ctx.gigTitle || '';
    const desc = ctx.jobDescription || ctx.gigDescription || '';
    return `
You are a high-value consultant writing a premium project proposal.

PROJECT: ${title}
DESCRIPTION: ${desc}
PROSPECT SIGNALS: ${ctx.clientTone}
LIKELY PAIN POINTS: ${ctx.painPoints}
CLIENT BUDGET: ${ctx.budget}
YOUR SKILLS: ${ctx.userSkills}

Write a PREMIUM, consultative project proposal (250–320 words).
Rules:
- Open by diagnosing the prospect's specific business problem
- Position as a strategic partner, not a commodity service provider
- Show understanding of their industry or goals
- Include 2–3 specific proof points with measurable results
- End with a confident, value-focused CTA
`;
  },

  technical: (ctx: ProposalContext) => {
    const title = ctx.jobTitle || ctx.gigTitle || '';
    const desc = ctx.jobDescription || ctx.gigDescription || '';
    return `
You are a technical expert writing a precise technical project proposal.

PROJECT: ${title}
DESCRIPTION: ${desc}
TECHNICAL NEEDS: ${ctx.painPoints}
CLIENT BUDGET: ${ctx.budget}
YOUR TECHNICAL SKILLS: ${ctx.userSkills}

Write a TECHNICAL project proposal (200–270 words).
Rules:
- Open with a concise technical summary of the solution
- Name specific technologies, frameworks, or methodologies you'd use
- Address any technical challenges or edge cases you anticipate
- Include relevant past technical experience
- End with a concrete next step
`;
  },

  friendly: (ctx: ProposalContext) => {
    const title = ctx.jobTitle || ctx.gigTitle || '';
    const desc = ctx.jobDescription || ctx.gigDescription || '';
    return `
You are a personable, approachable expert writing a project proposal.

PROJECT: ${title}
DESCRIPTION: ${desc}
PROSPECT VIBE: ${ctx.clientTone}
LIKELY NEEDS: ${ctx.painPoints}
YOUR SKILLS: ${ctx.userSkills}

Write a FRIENDLY project proposal (180–240 words).
Rules:
- Open warmly but get to the point within 2 sentences
- Reference something specific from their project description
- Sound like a real person, not a template
- Share relevant experience in a conversational way
- End with a friendly invitation to chat
`;
  },
};
