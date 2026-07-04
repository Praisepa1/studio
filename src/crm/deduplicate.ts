import { Company } from "@/types/company";
import { Lead } from "@/types/lead";

// Jaro-Winkler Similarity Measure
export function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroDistance(s1, s2);
  if (jaro < 0.7) return jaro;

  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function jaroDistance(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchLimit = Math.floor(Math.max(len1, len2) / 2) - 1;

  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchLimit);
    const end = Math.min(len2, i + matchLimit + 1);

    for (let j = start; j < end; j++) {
      if (!matches2[j] && s1[i] === s2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (matches1[i]) {
      while (!matches2[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }

  const m = matches;
  const t = transpositions / 2;

  return (m / len1 + m / len2 + (m - t) / m) / 3;
}

// Normalization Helpers
export function normalizeDomain(d: string): string {
  return d
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

export function normalizeName(n: string): string {
  return n
    .toLowerCase()
    .replace(/\b(inc|inc\.|llc|llc\.|ltd|ltd\.|limited|corp|corp\.|corporation|co|co\.|company|group|plc|plc\.)\b/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(e: string): string {
  return e.toLowerCase().trim();
}

// Merge functions
function mergeCompanies(existing: any, candidate: any, reasons: string[]): any {
  const merged = { ...existing };

  const fields = [
    "name",
    "domain",
    "industry",
    "location",
    "size",
    "description",
    "contactEmail",
    "contactPhone",
    "source",
  ];
  fields.forEach((f) => {
    const existVal = existing[f];
    const candVal = candidate[f];
    if (!existVal && candVal) {
      merged[f] = candVal;
    } else if (existVal && candVal && existVal !== candVal) {
      reasons.push(`Discrepancy in field '${f}': '${existVal}' vs '${candVal}'`);
    }
  });

  merged.score = Math.max(existing.score || 0, candidate.score || 0);
  merged.tier =
    existing.tier === "high_priority" || candidate.tier === "high_priority"
      ? "high_priority"
      : existing.tier || candidate.tier;

  const existHiring = existing.isActivelyHiring === true || existing.hiringStatus === "active";
  const candHiring = candidate.isActivelyHiring === true || candidate.hiringStatus === "active";
  merged.isActivelyHiring = existHiring || candHiring;
  merged.hiringStatus =
    existing.hiringStatus === "active" || candidate.hiringStatus === "active"
      ? "active"
      : existing.hiringStatus || candidate.hiringStatus;

  merged.techStack = Array.from(
    new Set([...(existing.techStack || []), ...(candidate.techStack || [])])
  );
  merged.socialLinks = Array.from(
    new Set([...(existing.socialLinks || []), ...(candidate.socialLinks || [])])
  );

  const existContacts = existing.contacts || [];
  const candContacts = candidate.contacts || [];
  const contactsMap = new Map();
  [...existContacts, ...candContacts].forEach((c) => {
    const key = `${(c.name || "").toLowerCase()}:${(c.role || "").toLowerCase()}`;
    contactsMap.set(key, c);
  });
  merged.contacts = Array.from(contactsMap.values());

  const existSignals = existing.buyingSignals || [];
  const candSignals = candidate.buyingSignals || [];
  const signalsMap = new Map();
  [...existSignals, ...candSignals].forEach((s) => {
    const key = `${(s.type || s.id || "").toLowerCase()}`;
    signalsMap.set(key, s);
  });
  merged.buyingSignals = Array.from(signalsMap.values());

  // Timestamps
  const existTime = new Date(existing.createdAt).getTime();
  const candTime = new Date(candidate.createdAt || Date.now()).getTime();
  merged.createdAt = new Date(Math.min(existTime, candTime)).toISOString();
  merged.updatedAt = new Date().toISOString();
  merged.lastSeenAt = new Date().toISOString();

  merged.enrichment = existing.enrichment || candidate.enrichment;

  return merged;
}

function mergeLeads(existing: any, candidate: any, reasons: string[]): any {
  const merged = { ...existing };

  const fields = [
    "name",
    "title",
    "email",
    "phone",
    "linkedinUrl",
    "status",
    "source",
    "platform",
    "company",
    "companyName",
    "recentActivity",
    "persona",
  ];
  fields.forEach((f) => {
    const existVal = existing[f];
    const candVal = candidate[f];
    if (!existVal && candVal) {
      merged[f] = candVal;
    } else if (existVal && candVal && existVal !== candVal) {
      reasons.push(`Discrepancy in field '${f}': '${existVal}' vs '${candVal}'`);
    }
  });

  merged.outreachScore = Math.max(existing.outreachScore || 0, candidate.outreachScore || 0);

  const existTime = new Date(existing.createdAt).getTime();
  const candTime = new Date(candidate.createdAt || Date.now()).getTime();
  merged.createdAt = new Date(Math.min(existTime, candTime)).toISOString();
  merged.updatedAt = new Date().toISOString();
  merged.lastSeenAt = new Date().toISOString();

  return merged;
}

// Deduplication Results Structs
export interface MergedRecord<T> {
  merged: T;
  originals: T[];
  reasons: string[];
}

export interface ReviewPair<T> {
  candidate: T;
  matched: T;
  reasons: string[];
}

export interface DeduplicationResult<T> {
  unique: T[];
  merged: MergedRecord<T>[];
  review_needed: ReviewPair<T>[];
  stats: {
    total_in: number;
    unique_out: number;
    merged_count: number;
    review_count: number;
  };
}

export interface DuplicateCheckResult {
  decision: "new" | "merge" | "review_needed";
  matched_record_id: string | null;
  match_confidence: "high" | "medium" | "low";
  match_reasons: string[];
  merged_record: any | null;
}

export function checkIsDuplicate(
  candidate: any,
  existingRecords: any[]
): DuplicateCheckResult {
  const isCompany = !!(candidate.domain || candidate.industry || candidate.techStack);
  
  if (isCompany) {
    const normCandDomain = candidate.domain ? normalizeDomain(candidate.domain) : "";
    const normCandName = candidate.name ? normalizeName(candidate.name) : "";

    for (const exist of existingRecords) {
      const normExistDomain = exist.domain ? normalizeDomain(exist.domain) : "";
      const normExistName = exist.name ? normalizeName(exist.name) : "";
      
      // Tier 1: Exact Domain
      if (normCandDomain && normExistDomain && normCandDomain === normExistDomain) {
        const reasons = ["Exact normalized domain match"];
        const merged = mergeCompanies(exist, candidate, reasons);
        return {
          decision: "merge",
          matched_record_id: exist.id || null,
          match_confidence: "high",
          match_reasons: reasons,
          merged_record: merged,
        };
      }

      // Tier 2: Normalized name AND domain match
      if (normCandDomain && normExistDomain && normCandName && normExistName) {
        if (normCandName === normExistName && normCandDomain === normExistDomain) {
          const reasons = ["Normalized name and domain match"];
          const merged = mergeCompanies(exist, candidate, reasons);
          return {
            decision: "merge",
            matched_record_id: exist.id || null,
            match_confidence: "high",
            match_reasons: reasons,
            merged_record: merged,
          };
        }
      }

      // Tier 3: Fuzzy matching on name
      if (normCandName && normExistName) {
        const similarity = jaroWinkler(normCandName, normExistName);
        if (similarity > 0.85) {
          // Check shared phone
          const sharedPhone =
            candidate.contactPhone &&
            exist.contactPhone &&
            candidate.contactPhone.replace(/\D/g, "") === exist.contactPhone.replace(/\D/g, "");
          
          if (sharedPhone) {
            const reasons = [`Name similarity ${similarity.toFixed(2)} with shared phone number`];
            const merged = mergeCompanies(exist, candidate, reasons);
            return {
              decision: "merge",
              matched_record_id: exist.id || null,
              match_confidence: "high",
              match_reasons: reasons,
              merged_record: merged,
            };
          }

          // Check same city/region
          const candLoc = (candidate.location || "").toLowerCase().trim();
          const existLoc = (exist.location || "").toLowerCase().trim();
          const sharedLocation = candLoc && existLoc && (candLoc.includes(existLoc) || existLoc.includes(candLoc));
          
          if (sharedLocation) {
            return {
              decision: "review_needed",
              matched_record_id: exist.id || null,
              match_confidence: "medium",
              match_reasons: [`Name similarity ${similarity.toFixed(2)} in same location: ${candidate.location}`],
              merged_record: null,
            };
          }

          // Flag for review alone
          return {
            decision: "review_needed",
            matched_record_id: exist.id || null,
            match_confidence: "medium",
            match_reasons: [`Name similarity ${similarity.toFixed(2)} alone`],
            merged_record: null,
          };
        }
      }
    }
  } else {
    // Lead check
    const normCandEmail = candidate.email ? normalizeEmail(candidate.email) : "";
    const normCandName = candidate.name ? normalizeName(candidate.name) : "";
    const candCompany = (candidate.companyName || candidate.company || "").toLowerCase().trim();

    for (const exist of existingRecords) {
      const normExistEmail = exist.email ? normalizeEmail(exist.email) : "";
      const normExistName = exist.name ? normalizeName(exist.name) : "";
      const existCompany = (exist.companyName || exist.company || "").toLowerCase().trim();

      // Tier 1: Exact Email
      if (normCandEmail && normExistEmail && normCandEmail === normExistEmail) {
        const reasons = ["Exact normalized email match"];
        const merged = mergeLeads(exist, candidate, reasons);
        return {
          decision: "merge",
          matched_record_id: exist.id || null,
          match_confidence: "high",
          match_reasons: reasons,
          merged_record: merged,
        };
      }

      // Tier 2: Normalized name and company match
      if (normCandName && normExistName && candCompany && existCompany) {
        if (normCandName === normExistName && candCompany === existCompany) {
          const reasons = ["Normalized name and company match"];
          const merged = mergeLeads(exist, candidate, reasons);
          return {
            decision: "merge",
            matched_record_id: exist.id || null,
            match_confidence: "high",
            match_reasons: reasons,
            merged_record: merged,
          };
        }
      }

      // Tier 3: Fuzzy matching on name
      if (normCandName && normExistName) {
        const similarity = jaroWinkler(normCandName, normExistName);
        if (similarity > 0.85) {
          const sharedPhone =
            candidate.phone &&
            exist.phone &&
            candidate.phone.replace(/\D/g, "") === exist.phone.replace(/\D/g, "");

          if (sharedPhone) {
            const reasons = [`Name similarity ${similarity.toFixed(2)} with shared phone number`];
            const merged = mergeLeads(exist, candidate, reasons);
            return {
              decision: "merge",
              matched_record_id: exist.id || null,
              match_confidence: "high",
              match_reasons: reasons,
              merged_record: merged,
            };
          }

          if (candCompany && existCompany && candCompany === existCompany) {
            return {
              decision: "review_needed",
              matched_record_id: exist.id || null,
              match_confidence: "medium",
              match_reasons: [`Name similarity ${similarity.toFixed(2)} in same company: ${candidate.companyName || candidate.company}`],
              merged_record: null,
            };
          }

          return {
            decision: "review_needed",
            matched_record_id: exist.id || null,
            match_confidence: "medium",
            match_reasons: [`Name similarity ${similarity.toFixed(2)} alone`],
            merged_record: null,
          };
        }
      }
    }
  }

  return {
    decision: "new",
    matched_record_id: null,
    match_confidence: "low",
    match_reasons: ["No matching candidates found"],
    merged_record: null,
  };
}

export function deduplicateCompanies(candidates: Company[]): DeduplicationResult<Company> {
  const unique: Company[] = [];
  const merged: MergedRecord<Company>[] = [];
  const reviewNeeded: ReviewPair<Company>[] = [];

  for (const cand of candidates) {
    const dupCheck = checkIsDuplicate(cand, unique);
    if (dupCheck.decision === "new") {
      unique.push(cand);
    } else if (dupCheck.decision === "merge") {
      const matchIndex = unique.findIndex((c) => c.id === dupCheck.matched_record_id);
      const originalMatched = unique[matchIndex];
      unique[matchIndex] = dupCheck.merged_record;

      merged.push({
        merged: dupCheck.merged_record,
        originals: [originalMatched, cand],
        reasons: dupCheck.match_reasons,
      });
    } else if (dupCheck.decision === "review_needed") {
      const matched = unique.find((c) => c.id === dupCheck.matched_record_id) as Company;
      reviewNeeded.push({
        candidate: cand,
        matched,
        reasons: dupCheck.match_reasons,
      });
      // Review queue records are also added to unique to let subsequent ones evaluate
      unique.push(cand);
    }
  }

  return {
    unique,
    merged,
    review_needed: reviewNeeded,
    stats: {
      total_in: candidates.length,
      unique_out: unique.length,
      merged_count: merged.length,
      review_count: reviewNeeded.length,
    },
  };
}

export function deduplicateLeads(candidates: Lead[]): DeduplicationResult<Lead> {
  const unique: Lead[] = [];
  const merged: MergedRecord<Lead>[] = [];
  const reviewNeeded: ReviewPair<Lead>[] = [];

  for (const cand of candidates) {
    const dupCheck = checkIsDuplicate(cand, unique);
    if (dupCheck.decision === "new") {
      unique.push(cand);
    } else if (dupCheck.decision === "merge") {
      const matchIndex = unique.findIndex((l) => l.id === dupCheck.matched_record_id);
      const originalMatched = unique[matchIndex];
      unique[matchIndex] = dupCheck.merged_record;

      merged.push({
        merged: dupCheck.merged_record,
        originals: [originalMatched, cand],
        reasons: dupCheck.match_reasons,
      });
    } else if (dupCheck.decision === "review_needed") {
      const matched = unique.find((l) => l.id === dupCheck.matched_record_id) as Lead;
      reviewNeeded.push({
        candidate: cand,
        matched,
        reasons: dupCheck.match_reasons,
      });
      unique.push(cand);
    }
  }

  return {
    unique,
    merged,
    review_needed: reviewNeeded,
    stats: {
      total_in: candidates.length,
      unique_out: unique.length,
      merged_count: merged.length,
      review_count: reviewNeeded.length,
    },
  };
}
