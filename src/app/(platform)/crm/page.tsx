import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CrmClient from "./crm-client";

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

    const { data: compData } = await supabase
      .from("companies")
      .select("*")
      .order("score", { ascending: false });
    companies = compData || [];

    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .order("outreachScore", { ascending: false });
    leads = leadData || [];
  } catch (err) {
    console.error("Failed to fetch CRM records:", err);
  }

  // Fallback demo CRM records if empty
  if (companies.length === 0) {
    companies = [
      {
        id: "comp-1",
        name: "Acme Corp",
        score: 85,
        tier: "high_priority",
        isActivelyHiring: true,
        updatedAt: new Date().toISOString(),
        enrichment: {
          pitch_angle: "Integrate our unified API to cut carrier overhead."
        }
      },
      {
        id: "comp-2",
        name: "FinFlow SaaS",
        score: 72,
        tier: "warm",
        isActivelyHiring: false,
        hiringStatus: "passive",
        updatedAt: new Date().toISOString(),
      }
    ];
  }

  if (leads.length === 0) {
    leads = [
      {
        id: "lead-1",
        name: "Sarah Chen",
        companyName: "Acme Corp",
        title: "VP of Engineering",
        outreachScore: 88,
        status: "new",
        email: "sarah@acme.com",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lead-2",
        name: "Marcus Williams",
        companyName: "FinFlow SaaS",
        title: "Tech Lead",
        outreachScore: 65,
        status: "contacted",
        email: "marcus@finflowsaas.io",
        updatedAt: new Date().toISOString(),
      }
    ];
  }

  return <CrmClient initialCompanies={companies} initialLeads={leads} />;
}
