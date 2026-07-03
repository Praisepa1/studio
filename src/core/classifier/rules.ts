import { ClassificationInput, ClassificationResult, URLCategory } from './types';

export function applyHeuristics(input: ClassificationInput): ClassificationResult | null {
  const urlObj = new URL(input.url);
  const hostname = urlObj.hostname.toLowerCase();
  const path = urlObj.pathname.toLowerCase();
  const titleAndSnippet = `${input.title ?? ''} ${input.snippet ?? ''}`.toLowerCase();

  // 1. Domain-based rules
  if (hostname.endsWith('.gov') || hostname.includes('.gov.') || hostname.endsWith('.mil')) {
    return { category: 'government', confidence: 'high', reasoning: 'Matches government/military domain pattern', recommended_action: 'skip' };
  }
  if (hostname.endsWith('.edu') || hostname.includes('.ac.')) {
    return { category: 'education', confidence: 'high', reasoning: 'Matches educational domain pattern', recommended_action: 'crawl_with_caution' };
  }
  if (hostname === 'linkedin.com' || hostname === 'www.linkedin.com') {
    if (path.startsWith('/in/')) return { category: 'social_profile', confidence: 'high', reasoning: 'LinkedIn individual profile', recommended_action: 'skip' };
    if (path.startsWith('/jobs/')) return { category: 'job_board', confidence: 'high', reasoning: 'LinkedIn job board', recommended_action: 'crawl' };
    if (path.startsWith('/company/')) return { category: 'company', confidence: 'high', reasoning: 'LinkedIn company page', recommended_action: 'crawl' };
  }
  const socialDomains = ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'www.twitter.com', 'www.x.com', 'www.facebook.com', 'www.instagram.com', 'www.tiktok.com'];
  if (socialDomains.includes(hostname)) {
    return { category: 'social_profile', confidence: 'high', reasoning: 'Known social media domain', recommended_action: 'skip' };
  }
  const jobBoards = ['indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'www.indeed.com', 'www.glassdoor.com', 'www.ziprecruiter.com'];
  if (jobBoards.includes(hostname)) {
    return { category: 'job_board', confidence: 'high', reasoning: 'Known job board domain', recommended_action: 'crawl' };
  }
  const startupDirs = ['crunchbase.com', 'angel.co', 'wellfound.com', 'producthunt.com', 'f6s.com', 'www.crunchbase.com', 'www.angel.co', 'www.wellfound.com', 'www.producthunt.com', 'www.f6s.com'];
  if (startupDirs.includes(hostname)) {
    return { category: 'startup_directory', confidence: 'high', reasoning: 'Known startup directory', recommended_action: 'crawl' };
  }
  if (hostname.endsWith('.myworkdayjobs.com') || hostname.endsWith('.lever.co') || hostname.endsWith('.greenhouse.io') || hostname.endsWith('.bamboohr.com') || hostname.endsWith('.smartrecruiters.com') || hostname.endsWith('.icims.com')) {
    let platform = '';
    if (hostname.includes('workday')) platform = 'Workday';
    else if (hostname.includes('lever')) platform = 'Lever';
    else if (hostname.includes('greenhouse')) platform = 'Greenhouse';
    else if (hostname.includes('bamboo')) platform = 'BambooHR';
    else if (hostname.includes('smartrecruiters')) platform = 'SmartRecruiters';
    else if (hostname.includes('icims')) platform = 'iCIMS';
    
    return { category: 'ats', confidence: 'high', reasoning: 'Known ATS domain', recommended_action: 'crawl', sub_signal: platform };
  }

  // 2. Path-based rules
  if (['/jobs', '/careers', '/join-us', '/work-with-us'].some(p => path.includes(p))) {
    return { category: 'company', confidence: 'high', reasoning: 'Likely company career page', recommended_action: 'crawl', sub_signal: 'careers page' };
  }
  if (['/about', '/about-us', '/team', '/contact'].some(p => path.includes(p))) {
    return { category: 'company', confidence: 'high', reasoning: 'Common company information path', recommended_action: 'crawl' };
  }
  if (['/tender', '/procurement', '/rfp'].some(p => path.includes(p))) {
    return { category: 'government', confidence: 'medium', reasoning: 'Tender/RFP path detected', recommended_action: 'crawl_with_caution' };
  }
  if (path.endsWith('.pdf')) {
    if (input.source_intent !== 'find_job') {
      return { category: 'ignore', confidence: 'high', reasoning: 'PDF file is low value for crawling', recommended_action: 'skip' };
    }
  }
  if (['login', 'signin', 'signup'].some(p => path.includes(p))) {
    return { category: 'ignore', confidence: 'high', reasoning: 'Behind auth wall', recommended_action: 'skip' };
  }

  // 3. Keyword rules
  if (titleAndSnippet) {
    if (['staffing', 'recruiting agency', 'talent solutions', 'headhunter'].some(kw => titleAndSnippet.includes(kw))) {
      return { category: 'recruitment_agency', confidence: 'high', reasoning: 'Title/snippet contains recruitment agency keywords', recommended_action: 'crawl_with_caution' }; // Could be crawl or skip
    }
    if (['nonprofit', 'charity', 'foundation', '501(c)(3)', 'ngo'].some(kw => titleAndSnippet.includes(kw))) {
      return { category: 'ngo', confidence: 'high', reasoning: 'Title/snippet contains NGO keywords', recommended_action: 'crawl' };
    }
    if (['pricing', 'product', 'our platform', 'request a demo'].some(kw => titleAndSnippet.includes(kw))) {
      return { category: 'company', confidence: 'high', reasoning: 'Title/snippet contains product/company keywords', recommended_action: 'crawl' };
    }
  }

  return null;
}
