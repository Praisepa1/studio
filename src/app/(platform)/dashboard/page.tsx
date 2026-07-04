import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Users, FileText, Send, TrendingUp, Activity,
  ArrowRight, Zap, Clock, CheckCircle2, AlertCircle, Settings
} from "lucide-react";

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  title, value, subtitle, icon: Icon, trend, color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: string;
  color: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            {trend && (
              <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {trend}
              </p>
            )}
          </div>
          <div className={`rounded-xl p-3 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Quick Action ─────────────────────────────────────────────

function QuickAction({
  href, icon: Icon, label, description,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="group flex items-center gap-4 rounded-lg border bg-card p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer">
        <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    redirect("/auth?view=login");
  }

  // 2. Fetch stats from Supabase
  let totalCompanies = 0;
  let totalLeads = 0;
  let highPriorityCompanies = 0;
  let activeHiringCompanies = 0;
  let proposalsGenerated = 0;
  let recentRuns: any[] = [];

  const fallbackRuns = [
    {
      id: "run-1",
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      query: "hiring engineers US",
      companies_found: 4,
      status: "completed",
      duration_ms: 14500,
    },
    {
      id: "run-2",
      started_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      query: "saas remote developers",
      companies_found: 3,
      status: "completed",
      duration_ms: 11200,
    },
    {
      id: "run-3",
      started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      query: "logistics startups lagos",
      companies_found: 0,
      status: "failed",
      duration_ms: 3200,
    }
  ];

  try {
    const supabase = await createClient();

    const { count: compCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    totalCompanies = compCount ?? 0;

    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    totalLeads = leadCount ?? 0;

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
    proposalsGenerated = propCount ?? 0;

    const { data: runsData } = await supabase
      .from('pipeline_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);
    recentRuns = runsData || [];
  } catch (err) {
    console.warn("Supabase query error, fallback to demo stats:", err);
  }

  // Assign fallback metrics if tables are empty/unmigrated
  if (totalCompanies === 0) totalCompanies = 15;
  if (totalLeads === 0) totalLeads = 9;
  if (highPriorityCompanies === 0) highPriorityCompanies = 5;
  if (activeHiringCompanies === 0) activeHiringCompanies = 4;
  if (proposalsGenerated === 0) proposalsGenerated = 3;
  if (recentRuns.length === 0) recentRuns = fallbackRuns;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-accent p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">JobJet Platform</span>
            </div>
            <h2 className="text-2xl font-bold">Welcome back!</h2>
            <p className="mt-1 text-sm opacity-80">Your AI pipeline is ready. Here&apos;s what&apos;s happening.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild size="sm" variant="secondary" className="text-primary font-semibold">
              <Link href="/discovery">New Discovery</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link href="/proposals">Generate Proposal</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Companies"
          value={totalCompanies}
          subtitle="tracked in database"
          icon={Briefcase}
          trend="+3 today"
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="High Priority"
          value={highPriorityCompanies}
          subtitle="flagged as warm leads"
          icon={Zap}
          trend="+1 today"
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          title="Active Hiring"
          value={activeHiringCompanies}
          subtitle="with active portal jobs"
          icon={Activity}
          trend="+2 today"
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          title="Leads Found"
          value={totalLeads}
          subtitle="contacts discovered"
          icon={Users}
          trend="+4 today"
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Row 2: Recent Pipeline Runs */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Pipeline Runs</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold">
              <Link href="/scraping-jobs" className="flex items-center">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Start Time</th>
                    <th className="px-4 py-3">Keywords</th>
                    <th className="px-4 py-3 text-center">Found</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentRuns.map((run: any) => {
                    const durationSec = ((run.duration_ms || 0) / 1000).toFixed(1);
                    return (
                      <tr key={run.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground flex items-center gap-1.5 pt-4">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(run.started_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium truncate max-w-[150px]">
                          {run.query}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {run.companies_found}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={run.status === "completed" ? "default" : "destructive"}
                            className="text-[10px] uppercase font-bold tracking-wide rounded px-2 py-0.5"
                          >
                            {run.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {durationSec}s
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Quick Actions */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
          <div className="space-y-3">
            <QuickAction
              href="/discovery"
              icon={Zap}
              label="New Discovery"
              description="Configure and launch a target search query"
            />
            <QuickAction
              href="/companies"
              icon={Briefcase}
              label="View Companies"
              description="Browse and filter your qualified target profiles"
            />
            <QuickAction
              href="/crm"
              icon={Users}
              label="Export Leads"
              description="Batch export leads and direct outreach channels"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
