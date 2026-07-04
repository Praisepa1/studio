// @ts-nocheck
import type { Lead } from '@/types';

export function scoreLead(lead: Lead): number {
  let score = 0;

  // Profile richness (0–40)
  if (lead.name) score += 5;
  if (lead.company || lead.companyId) score += 5;
  if (lead.role || lead.title) score += 5;
  if (lead.bio && lead.bio.length > 50) score += 10;
  if (lead.website) score += 5;
  if (lead.socialLinks && lead.socialLinks.length > 0) score += 5;
  if (lead.location) score += 5;

  // Business need indicators (0–30)
  const indicators = lead.businessNeedIndicators ?? [];
  score += Math.min(30, indicators.length * 10);

  // Source quality (0–30)
  switch (lead.source) {
    case 'linkedin': score += 30; break;
    case 'facebook': score += 20; break;
    case 'twitter': score += 15; break;
    case 'manual': score += 25; break;
    default: score += 10;
  }

  // ─── NEW SIGNALS (EXPANSION) ──────────────────────────────

  // platform_match: +5 if the lead's platform is linkedin AND a company page was confirmed (vs a generic web source)
  if (lead.source === 'linkedin' && (lead.companyId || lead.companyPageConfirmed)) {
    score += 5;
  }

  // decision_maker_role: +6 if the lead's role title contains founder, ceo, cto, managing director, head of, vp
  const titleLower = (lead.title || lead.role || '').toLowerCase();
  const isDecisionMaker = ['founder', 'ceo', 'cto', 'managing director', 'head of', 'vp'].some(role => titleLower.includes(role));
  if (isDecisionMaker) {
    score += 6;
  }

  // recent_activity: +4 if news-monitoring found activity on this company in the past 30 days
  if (lead.recentActivity || lead.recentNews || lead.recentActivityPast30Days) {
    score += 4;
  }

  // outreach_ready: +3 if contact-extraction found a direct email (not just a generic info@ or contact form)
  if (lead.email) {
    const user = lead.email.split('@')[0].toLowerCase();
    const genericPrefixes = ['info', 'contact', 'sales', 'support', 'hello', 'admin', 'office', 'jobs', 'careers', 'team'];
    if (!genericPrefixes.includes(user)) {
      score += 3;
    }
  }

  return Math.min(10, Math.round(score / 10));
}

export function rankLeads(leads: Lead[]): Lead[] {
  return [...leads]
    .map((l) => ({ ...l, qualityScore: l.qualityScore ?? scoreLead(l) }))
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}
