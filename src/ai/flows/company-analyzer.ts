'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { enrichCompany } from '@/enrichment/company';
import { enrichTechnology } from '@/enrichment/technology';
import type { Company } from '@/types';

export const CompanyAnalyzerInputSchema = z.any().describe('The Company object to analyze');
export const CompanyAnalyzerOutputSchema = z.any().describe('The merged CompanyAnalysis object');

export const companyAnalyzerFlow = ai.defineFlow(
  {
    name: 'companyAnalyzerFlow',
    inputSchema: CompanyAnalyzerInputSchema,
    outputSchema: CompanyAnalyzerOutputSchema,
  },
  async (companyInput: Company) => {
    // 1. Call enrichCompany() using 'gemini' as default provider
    const provider = 'gemini';
    const companyEnrichment = await enrichCompany(companyInput, provider);

    // 2. Call enrichTechnology(). Try to extract TechStackResult from context if attached.
    const compAny = companyInput as any;
    const techStackResult = compAny.techStackResult || {
      detected: (companyInput.techStack || []).map(t => ({
        technology: t,
        category: 'cms' as const,
        confidence: 'high' as const,
        evidence: '',
      })),
      hosting_provider: null,
      modernization_signal: compAny.modernization_signal || 'unknown',
      modernization_reason: '',
    };
    const techEnrichment = enrichTechnology(techStackResult, companyInput);

    // 3. Merge both results into a CompanyAnalysis object
    return {
      ...companyInput,
      enrichment: companyEnrichment,
      tech_enrichment: techEnrichment,
    };
  }
);

export async function analyzeCompany(company: Company): Promise<any> {
  return companyAnalyzerFlow(company);
}
