import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CrmClient from "./crm-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmPage() {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    redirect("/auth?view=login");
  }

  // 2. Fetch Companies & Leads
  let companies: any[] = [];
  let leads: any[] = [];

  try {
    const supabase = await createClient();

    const { data: compData, error: compError } = await supabase
      .from("companies")
      .select("*")
      .order("score", { ascending: false });
      
    if (compError) throw compError;
    
    companies = (compData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      score: c.score,
      tier: c.tier,
      isActivelyHiring: c.is_actively_hiring,
      hiringStatus: c.hiring_status,
      updatedAt: c.updated_at,
      enrichment: c.enrichment,
    }));

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select("*, companies(name)")
      .order("outreach_score", { ascending: false });
      
    if (leadError) throw leadError;
    
    leads = (leadData || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      companyName: l.companies?.name || 'Unknown Company',
      title: l.title,
      outreachScore: l.outreach_score,
      status: l.status,
      email: l.email,
      updatedAt: l.updated_at,
    }));
  } catch (err) {
    console.error("Failed to fetch CRM records:", err);
  }



  return <CrmClient initialCompanies={companies} initialLeads={leads} />;
}
