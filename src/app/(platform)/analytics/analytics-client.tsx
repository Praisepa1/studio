"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Activity,
  Layers,
  Award,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsClientProps {
  stats: {
    avgCompaniesPerRun: number;
    pctHighPriority: number;
    pctActivelyHiring: number;
    proposalsGeneratedThisWeek: number;
  };
  scoreDistribution: Array<{
    tier: string;
    label: string;
    count: number;
    pct: number;
    color: string;
  }>;
  topIndustries: Array<{
    name: string;
    count: number;
    pct: number;
  }>;
  recentRuns: Array<{
    id: string;
    started_at: string;
    query: string;
    companies_found: number;
    status: string;
  }>;
}

export default function AnalyticsClient({
  stats,
  scoreDistribution,
  topIndustries,
  recentRuns
}: AnalyticsClientProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Row 1: Headline Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Per Run</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{stats.avgCompaniesPerRun}</p>
                <p className="mt-1 text-xs text-muted-foreground">companies discovered</p>
              </div>
              <div className="rounded-xl p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">% High Priority</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{stats.pctHighPriority}%</p>
                <p className="mt-1 text-xs text-muted-foreground">scored high priority</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">% Hiring</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{stats.pctActivelyHiring}%</p>
                <p className="mt-1 text-xs text-muted-foreground">actively recruiting</p>
              </div>
              <div className="rounded-xl p-3 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proposals</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{stats.proposalsGeneratedThisWeek}</p>
                <p className="mt-1 text-xs text-muted-foreground">generated this week</p>
              </div>
              <div className="rounded-xl p-3 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Score Distribution CSS Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Company Score Distribution by Tier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {scoreDistribution.map((item) => (
              <div key={item.tier} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.count} companies ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className={cn("h-full transition-all duration-500 ease-out rounded-full", item.color)}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Top Industries and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Industries */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Industries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3">Industry</th>
                  <th className="px-6 py-3 text-center">Company Count</th>
                  <th className="px-6 py-3 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topIndustries.map((ind) => (
                  <tr key={ind.name} className="hover:bg-muted/30">
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      {ind.name}
                    </td>
                    <td className="px-6 py-3.5 text-center font-medium">
                      {ind.count}
                    </td>
                    <td className="px-6 py-3.5 text-right text-muted-foreground">
                      {ind.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Recent Activity: last 10 pipeline runs */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Discovery Pipeline Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[350px] overflow-y-auto divide-y">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-start justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1 flex-1 pr-4">
                    <div className="flex items-center gap-1.5">
                      {run.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <p className="text-sm font-semibold text-foreground line-clamp-1">
                        {run.query}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(run.started_at).toLocaleDateString()} at{" "}
                      {new Date(run.started_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={run.status === "completed" ? "default" : "destructive"} className="text-[10px] uppercase font-bold rounded">
                      {run.companies_found} found
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
