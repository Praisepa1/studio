'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { enrichLead } from '@/enrichment/lead';
import type { Lead, Company } from '@/types';

export const LeadAnalyzerInputSchema = z.object({
  lead: z.any().describe('The Lead object'),
  company: z.any().describe('The Company object context'),
});

export const LeadAnalyzerOutputSchema = z.any().describe('The LeadAnalysis object');

function inferPersona(title: string, industry?: string, size?: string): string {
  const t = title.toLowerCase();
  
  // Technical Decision Maker
  if (
    t.includes('cto') || 
    t.includes('tech') || 
    t.includes('engineering') || 
    t.includes('developer') || 
    t.includes('architect') || 
    t.includes('devops') || 
    t.includes('software') || 
    t.includes('programmer')
  ) {
    return 'technical_decision_maker';
  }
  
  // Non-Technical Buyer
  if (
    t.includes('ceo') || 
    t.includes('founder') || 
    t.includes('coo') || 
    t.includes('cfo') || 
    t.includes('president') || 
    t.includes('managing director') || 
    t.includes('vp') || 
    t.includes('director') || 
    t.includes('owner') || 
    t.includes('sales') || 
    t.includes('marketing') || 
    t.includes('marketing director') || 
    t.includes('cmo')
  ) {
    return 'non_technical_buyer';
  }
  
  // Gatekeeper
  if (
    t.includes('assistant') || 
    t.includes('secretary') || 
    t.includes('coordinator') || 
    t.includes('admin') || 
    t.includes('receptionist') ||
    t.includes('support')
  ) {
    return 'gatekeeper';
  }
  
  // Champion
  if (
    t.includes('manager') || 
    t.includes('lead') || 
    t.includes('specialist') || 
    t.includes('analyst') || 
    t.includes('strategist') ||
    t.includes('representative') ||
    t.includes('associate')
  ) {
    return 'champion';
  }
  
  return 'unknown';
}

export const leadAnalyzerFlow = ai.defineFlow(
  {
    name: 'leadAnalyzerFlow',
    inputSchema: LeadAnalyzerInputSchema,
    outputSchema: LeadAnalyzerOutputSchema,
  },
  async (input) => {
    const { lead, company } = input as { lead: Lead; company: Company };

    // 1. Call enrichLead()
    const provider = 'gemini';
    const leadEnrichment = await enrichLead(lead, { provider });

    // 2. Infer DISC communication style / persona
    const title = lead.title || '';
    const persona = inferPersona(title, company?.industry, company?.size);

    // 3. Merge output
    return {
      ...lead,
      enrichment: leadEnrichment,
      persona,
      enriched_at: new Date(),
    };
  }
);

export async function analyzeLead(lead: Lead, company: Company): Promise<any> {
  return leadAnalyzerFlow({ lead, company });
}
