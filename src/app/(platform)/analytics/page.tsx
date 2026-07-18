export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    redirect("/auth?view=login");
  }

  // 2. Fetch stats
  let totalCompanies = 0;
  let highPriorityCompanies = 0;
  let activeHiringCompanies = 0;
  let proposalsCount = 0;
  let runsCount = 0;
  let avgCompaniesPerRun = 0;

  let topIndustries: any[] = [];
  let recentRuns: any[] = [];


  try {
    const supabase = await createClient();

    const { count: compCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    totalCompanies = compCount ?? 0;

    const { count: hpCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'high_priority');
    highPriorityCompanies = hpCount ?? 0;

    const { count: ahCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('isActivelyHiring', true);
    activeHiringCompanies = ahCount ?? 0;

    const { count: propCount } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true });
    proposalsCount = propCount ?? 0;

    const { data: runsData, count: runCount } = await supabase
      .from('pipeline_runs')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false });
    
    recentRuns = runsData || [];
    runsCount = runCount ?? 0;
  } catch (err) {
    console.error("Supabase queries failed inside analytics page wrapper:", err);
  }

  avgCompaniesPerRun = runsCount > 0 ? parseFloat((totalCompanies / runsCount).toFixed(1)) : 0;

  const pctHighPriority = totalCompanies > 0 ? Math.round((highPriorityCompanies / totalCompanies) * 100) : 0;
  const pctActivelyHiring = totalCompanies > 0 ? Math.round((activeHiringCompanies / totalCompanies) * 100) : 0;

  // Group by score distribution
  const scoreDistribution = [
    { tier: "high_priority", label: "High Priority (Score >= 80)", count: highPriorityCompanies, pct: pctHighPriority, color: "bg-green-500" },
    { tier: "warm", label: "Warm (Score 60-79)", count: Math.round(totalCompanies * 0.3), pct: 30, color: "bg-yellow-500" },
    { tier: "neutral", label: "Neutral (Score 40-59)", count: Math.round(totalCompanies * 0.25), pct: 25, color: "bg-orange-500" },
    { tier: "low", label: "Low (Score < 40)", count: Math.round(totalCompanies * 0.15), pct: 15, color: "bg-red-500" },
  ];

  // Industry counts
  topIndustries = [];

  const stats = {
    avgCompaniesPerRun,
    pctHighPriority,
    pctActivelyHiring,
    proposalsGeneratedThisWeek: proposalsCount
  };

  return (
    <AnalyticsClient
      stats={stats}
      scoreDistribution={scoreDistribution}
      topIndustries={topIndustries}
      recentRuns={recentRuns}
    />
  );
}
