import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CompaniesClient from "./companies-client";

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
    const { data } = await supabase
      .from("companies")
      .select("*")
      .order("score", { ascending: false });

    companies = data || [];
  } catch (err) {
    console.error("Failed to fetch companies:", err);
  }

  // Fallback demo companies if Supabase table is unpopulated
  if (companies.length === 0) {
    companies = [
      {
        id: "comp-1",
        name: "Acme Corp",
        domain: "acme.com",
        industry: "Logistics",
        location: "Austin, TX",
        size: "10-50",
        score: 85,
        tier: "high_priority",
        isActivelyHiring: true,
        techStack: ["React", "TypeScript", "Node.js"],
        description: "Leading shipping software solutions.",
        enrichment: {
          one_liner: "SaaS engine for third-party logistics integrations.",
          pain_point_hypothesis: "Legacy carrier interfaces require intensive manual developer overhead.",
          pitch_angle: "Integrate our developer-friendly unified API tool to cut connector dev hours by 80%.",
        },
      },
      {
        id: "comp-2",
        name: "FinFlow SaaS",
        domain: "finflowsaas.io",
        industry: "Fintech",
        location: "Lagos, Nigeria",
        size: "50-200",
        score: 72,
        tier: "warm",
        isActivelyHiring: false,
        hiringStatus: "passive",
        techStack: ["Python", "Docker", "Tailwind"],
        description: "Automated billing infrastructure for African subscription businesses.",
      },
      {
        id: "comp-3",
        name: "RetailGenie LLC",
        domain: "retailgenie.com",
        industry: "E-Commerce",
        location: "Remote",
        size: "1-10",
        score: 38,
        tier: "low",
        isActivelyHiring: false,
        techStack: ["Shopify", "WordPress"],
        description: "Bespoke storefront templates.",
      }
    ];
  }

  return <CompaniesClient initialCompanies={companies} />;
}
