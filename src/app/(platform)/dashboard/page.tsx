"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Users, FileText, Send, TrendingUp, Activity,
  ArrowRight, Zap, Clock, CheckCircle2, MessageSquare,
} from "lucide-react";
import { DEMO_ACTIVITY } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";

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
              <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                <TrendingUp className="inline h-3 w-3 mr-1" />
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
  href, icon: Icon, label, description, variant = "outline",
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  variant?: "default" | "outline";
}) {
  return (
    <Link href={href}>
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

// ─── Activity Icon ────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ElementType; color: string }> = {
    gig_scraped: { icon: Briefcase, color: "text-blue-500" },
    lead_found: { icon: Users, color: "text-purple-500" },
    proposal_generated: { icon: FileText, color: "text-green-500" },
    outreach_sent: { icon: Send, color: "text-amber-500" },
    feedback_received: { icon: MessageSquare, color: "text-rose-500" },
  };
  const { icon: Icon, color } = map[type] ?? { icon: Activity, color: "text-muted-foreground" };
  return <Icon className={`h-4 w-4 ${color}`} />;
}

// ─── Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats] = useState({
    gigs: 5,
    leads: 4,
    proposals: 3,
    outreach: 2,
  });

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
              <Link href="/upwork-gigs">Scrape Gigs</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link href="/proposals">Generate Proposal</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upwork Gigs"
          value={stats.gigs}
          subtitle="across all searches"
          icon={Briefcase}
          trend="+5 today"
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="Leads Found"
          value={stats.leads}
          subtitle="from LinkedIn & more"
          icon={Users}
          trend="+4 today"
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          title="Proposals"
          value={stats.proposals}
          subtitle="generated this week"
          icon={FileText}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          title="Outreach Sent"
          value={stats.outreach}
          subtitle="active conversations"
          icon={Send}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</h3>
          <div className="space-y-2">
            <QuickAction
              href="/upwork-gigs"
              icon={Briefcase}
              label="Scrape Upwork Gigs"
              description="Find new opportunities with AI scoring"
            />
            <QuickAction
              href="/leads"
              icon={Users}
              label="Find Leads"
              description="Discover LinkedIn & Facebook prospects"
            />
            <QuickAction
              href="/proposals"
              icon={FileText}
              label="Generate Proposal"
              description="Gemini + Claude dual-AI pipeline"
            />
            <QuickAction
              href="/outreach"
              icon={Send}
              label="Create Outreach"
              description="Personalized first messages & follow-ups"
            />
            <QuickAction
              href="/ai-studio"
              icon={Zap}
              label="AI Studio"
              description="Configure providers & test prompts"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/scraping-jobs">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          <Card className="shadow-sm">
            <CardContent className="pt-4 divide-y divide-border">
              {DEMO_ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pipeline Status */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Pipeline Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Gemini AI", status: "active", desc: "Flash model ready" },
              { label: "Claude AI", status: "config", desc: "Add ANTHROPIC_API_KEY" },
              { label: "Upwork Scraper", status: "active", desc: "Demo mode running" },
              { label: "Lead Finder", status: "active", desc: "Demo mode running" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2 w-2 rounded-full ${item.status === "active" ? "bg-green-500" : "bg-amber-500"}`} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
                {item.status === "active"
                  ? <Badge className="mt-2 text-[10px] score-high border-0">Active</Badge>
                  : <Badge className="mt-2 text-[10px] score-mid border-0">Needs config</Badge>
                }
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
