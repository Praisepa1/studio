import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CompaniesClient from "./companies-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * CompaniesPage component - React Server Component that renders the discovered companies view.
 * - Protects access with an authorization guard.
 * - Fetches companies from Supabase ordered by company priority score.
 * - Maps snake_case database fields (e.g. `is_actively_hiring`, `hiring_status`) to camelCase client-side formats.

 */
export default async function CompaniesPage() {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    redirect("/auth?view=login");
  }

  // 2. Fetch Companies
  let companies: any[] = [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("score", { ascending: false });

    if (error) throw error;

    companies = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      location: c.location,
      size: c.size,
      score: c.score,
      tier: c.tier,
      isActivelyHiring: c.is_actively_hiring,
      hiringStatus: c.hiring_status,
      techStack: c.tech_stack || [],
      contactEmail: c.contact_email,
      contactPhone: c.contact_phone,
      enrichment: c.enrichment,
    }));
  } catch (err) {
    console.error("Failed to fetch companies:", err);
  }


  return <CompaniesClient initialCompanies={companies} />;
}
