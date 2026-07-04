import { researchPrompts } from '../ai/prompts';
import { generateWithProvider } from '../ai/providers';
import type { Company, AIProvider } from '../types';

export interface CompanyEnrichment {
  one_liner: string;
  pain_point_hypothesis: string;
  pitch_angle: string;
  fit_score_reason: string;
  enriched_at: Date;
  provider_used: string;
}

export async function enrichCompany(
  company: Company,
  provider: AIProvider
): Promise<CompanyEnrichment> {
  const compAny = company as any;

  // Format context for prompt
  const bs = compAny.buyingSignals || [];
  const deptHiring = compAny.departmentsHiring || [];
  const hStatus = compAny.hiringStatus || (company.isActivelyHiring ? 'active' : 'unknown');

  let prompt = researchPrompts.companyAnalysis({
    name: company.name,
    website: company.domain || '',
    industry: company.industry,
    size: company.size,
    techStack: company.techStack || [],
    buyingSignals: bs,
    score: compAny.score || 50,
    tier: compAny.tier || 'neutral',
    hiringStatus: hStatus,
    departmentsHiring: deptHiring,
  });

  try {
    let result = await generateWithProvider(provider, prompt, { maxTokens: 1024 });
    let parsed = JSON.parse(result.content);

    // Vague check: if it mentions generic phrases like "improved digital presence"
    const isVague = (text: string) => {
      if (!text) return true;
      const lower = text.toLowerCase();
      return lower.includes('improved digital presence') || 
             lower.includes('benefit from improved') || 
             (lower.includes('digital presence') && lower.includes('benefit'));
    };

    if (isVague(parsed.pain_point_hypothesis) || isVague(parsed.pitch_angle)) {
      // Retry once with constrained prompt
      const constrainedPrompt = researchPrompts.companyAnalysisConstrained({
        name: company.name,
        website: company.domain || '',
        industry: company.industry,
        size: company.size,
        techStack: company.techStack || [],
        buyingSignals: bs,
        score: compAny.score || 50,
        tier: compAny.tier || 'neutral',
        hiringStatus: hStatus,
        departmentsHiring: deptHiring,
      });

      result = await generateWithProvider(provider, constrainedPrompt, { maxTokens: 1024 });
      parsed = JSON.parse(result.content);
    }

    return {
      one_liner: parsed.one_liner || 'B2B Company',
      pain_point_hypothesis: parsed.pain_point_hypothesis || 'No direct pain points identified.',
      pitch_angle: parsed.pitch_angle || 'Offer general consulting services.',
      fit_score_reason: parsed.fit_score_reason || 'Score calculated based on general web metrics.',
      enriched_at: new Date(),
      provider_used: provider,
    };
  } catch (error: any) {
    console.error('enrichCompany failed, returning fallback enrichment:', error);
    return {
      one_liner: `${company.name} is a company in the ${company.industry || 'general'} sector.`,
      pain_point_hypothesis: 'The site has unaddressed optimization opportunities.',
      pitch_angle: 'Offer a technical performance and SEO audit.',
      fit_score_reason: `Score of ${compAny.score || 50} reflects baseline online presence indicators.`,
      enriched_at: new Date(),
      provider_used: `${provider} (fallback)`,
    };
  }
}
