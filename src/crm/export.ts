import { Company } from "@/types/company";
import { Lead } from "@/types/lead";

export interface CsvExportResult {
  csv_string: string;
  columns_used: string[];
  rows_exported: number;
  warnings: string[];
}

function escapeCsvField(val: string): string {
  // Rule 3: replace internal newlines with " | "
  let cleaned = val.replace(/\r?\n/g, " | ");

  // Rule 5: neutralize leading =, +, -, @ with a single-quote prefix
  if (/^[=\+\-@]/.test(cleaned)) {
    cleaned = "'" + cleaned;
  }

  // Rule 2: escape internal double quotes by doubling
  const escapedQuotes = cleaned.replace(/"/g, '""');

  // Rule 1 & 4: Wrap EVERY field in double quotes (satisfies quoting commas + escaping every field)
  return `"${escapedQuotes}"`;
}

function getFieldValue(record: any, col: string): string {
  // Flattening rules
  if (col === "website") {
    return record.website || record.domain || "";
  }
  if (col === "pitch_angle") {
    return record.pitch_angle || record.enrichment?.pitch_angle || "";
  }
  if (col === "lastScrapedAt") {
    return record.lastScrapedAt || record.updatedAt || record.createdAt || "";
  }
  if (col === "primaryContactName") {
    const contacts = record.contacts || [];
    return contacts[0]?.name || record.contactEmail || "";
  }
  if (col === "primaryContactEmail") {
    const contacts = record.contacts || [];
    return contacts[0]?.email || record.contactEmail || "";
  }
  if (col === "linkedinUrl") {
    if (record.linkedinUrl) return record.linkedinUrl;
    const social = record.socialLinks || [];
    const link = social.find((s: any) =>
      typeof s === "string" ? s.includes("linkedin.com") : s.platform === "linkedin"
    );
    return typeof link === "string" ? link : (link?.url || "");
  }
  if (col === "twitterUrl") {
    const social = record.socialLinks || [];
    const link = social.find((s: any) =>
      typeof s === "string"
        ? s.includes("twitter.com") || s.includes("x.com")
        : s.platform === "twitter" || s.platform === "x"
    );
    return typeof link === "string" ? link : (link?.url || "");
  }
  if (col === "techStack") {
    const stack = record.techStack || [];
    return stack.join(" | ");
  }
  if (col === "buyingSignals") {
    const signals = record.buyingSignals || [];
    return signals
      .map((s: any) => (typeof s === "string" ? s : s.type || s.id || ""))
      .filter(Boolean)
      .join(" | ");
  }

  const val = record[col];
  if (val === undefined || val === null) return "";
  if (Array.isArray(val)) return val.join(" | ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function exportToCsv(input: {
  records: any[];
  type: "company" | "lead";
  columns?: string[];
}): CsvExportResult {
  const { records, type, columns } = input;
  const warnings: string[] = [];

  // Default column sets
  const defaultCompanyCols = [
    "name",
    "website",
    "industry",
    "location",
    "score",
    "tier",
    "hiringStatus",
    "pitch_angle",
    "source",
    "lastScrapedAt",
  ];
  const defaultLeadCols = [
    "name",
    "company",
    "email",
    "phone",
    "platform",
    "outreachScore",
    "status",
    "source",
    "persona",
  ];

  const columnsUsed = columns || (type === "company" ? defaultCompanyCols : defaultLeadCols);

  // Generate header row
  const headerRow = columnsUsed.map(escapeCsvField).join(",");

  // Generate data rows
  const dataRows = records.map((record) => {
    return columnsUsed
      .map((col) => {
        const val = getFieldValue(record, col);
        return escapeCsvField(val);
      })
      .join(",");
  });

  const csvString = [headerRow, ...dataRows].join("\n");

  return {
    csv_string: csvString,
    columns_used: columnsUsed,
    rows_exported: records.length,
    warnings,
  };
}

export function exportToFile(result: CsvExportResult, filename: string): Blob {
  // Return a Blob with type "text/csv;charset=utf-8"
  return new Blob([result.csv_string], { type: "text/csv;charset=utf-8;" });
}
