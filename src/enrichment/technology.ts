import type { TechStackResult } from '../core/extractor/technology';
import type { Company } from '../types';

export interface TechEnrichment {
  modernization_label: string;
  outreach_hook: string | null;
  upgrade_opportunity: boolean;
  detected_stack: string[];
}

export function enrichTechnology(
  stack: TechStackResult,
  company: Company
): TechEnrichment {
  const signal = stack.modernization_signal;
  const industry = company.industry || 'similar';

  let modernization_label = 'Insufficient data to assess';
  let outreach_hook: string | null = null;
  let upgrade_opportunity = false;

  switch (signal) {
    case 'current':
      modernization_label = 'Modern stack  actively maintained';
      upgrade_opportunity = false;
      break;

    case 'dated':
      modernization_label = 'Dated stack  jQuery-era, no modern framework';
      upgrade_opportunity = true;
      outreach_hook = `Noticed your site is running jQuery without a modern framework  we've helped similar ${industry} businesses move to a maintainable stack in 4-6 weeks.`;
      break;

    case 'unmaintained':
      modernization_label = 'Unmaintained  no SSL, stale copyright, legacy code';
      upgrade_opportunity = true;
      outreach_hook = `We ran a brief audit on your tech stack and noticed some unmaintained legacy code and setup details. We specialize in modernizing codebases for ${industry} companies to secure their setup and improve speed.`;
      break;

    case 'unknown':
    default:
      modernization_label = 'Insufficient data to assess';
      upgrade_opportunity = false;
      break;
  }

  const detected_stack = stack.detected ? stack.detected.map(t => t.technology) : [];

  return {
    modernization_label,
    outreach_hook,
    upgrade_opportunity,
    detected_stack,
  };
}
