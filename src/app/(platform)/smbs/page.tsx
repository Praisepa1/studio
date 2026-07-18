import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SMBsClient from "./smbs-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SMBsPage() {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    redirect("/auth?view=login");
  }

  // 2. Fetch SMBs
  let smbs: any[] = [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("smbs")
      .select("*")
      .order("score", { ascending: false });

    if (error) throw error;

    smbs = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      location: c.location,
      businessType: c.business_type,
      score: c.score,
      tier: c.tier,
      isActivelyHiring: c.is_actively_hiring,
      techStack: c.tech_stack || [],
      contactEmail: c.contact_email,
      contactPhone: c.phone,
      enrichment: c.enrichment,
    }));
  } catch (err: any) {
    console.error(`Failed to fetch smbs: ${err.message || err.toString()}`, err.code ? `(Code: ${err.code})` : "");
  }



  return <SMBsClient initialSMBs={smbs} />;
}
