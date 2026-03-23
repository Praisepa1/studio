"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Activity, Play, Square, RefreshCw, Loader2,
  Briefcase, Users, Clock, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ScrapingJob, ScrapingJobSource } from "@/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "jobjet_scraping_jobs";

function loadJobs(): ScrapingJob[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveJobs(j: ScrapingJob[]) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(j));
}

function StatusIcon({ status }: { status: ScrapingJob["status"] }) {
  if (status === "running") return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}

function statusClass(s: ScrapingJob["status"]) {
  if (s === "running") return "status-new";
  if (s === "completed") return "score-high";
  if (s === "failed") return "score-low";
  return "status-done";
}

export default function ScrapingJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<ScrapingJobSource>("upwork");
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  useEffect(() => {
    setJobs(loadJobs());
  }, []);

  const runJob = async () => {
    if (!query.trim()) {
      toast({ variant: "destructive", title: "Enter a search query" });
      return;
    }

    const job: ScrapingJob = {
      id: `job-${Date.now()}`,
      source,
      query,
      status: "running",
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updated = [job, ...jobs];
    setJobs(updated);
    saveJobs(updated);
    setRunningJobId(job.id);

    try {
      const endpoint = source === "upwork" ? "/api/scrape/upwork" : "/api/scrape/leads";
      const body = source === "upwork"
        ? { query, limit: 10 }
        : { query, source, limit: 10 };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const itemsFound = data.gigs?.length ?? data.leads?.length ?? 0;

      setJobs((prev) => {
        const next = prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: "completed" as const,
                completedAt: new Date().toISOString(),
                itemsFound,
                itemsNew: itemsFound,
              }
            : j
        );
        saveJobs(next);
        return next;
      });

      toast({
        title: `Job complete: ${itemsFound} items found`,
        description: `Source: ${data.source ?? source}`,
      });
    } catch (e: unknown) {
      setJobs((prev) => {
        const next = prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: "failed" as const,
                completedAt: new Date().toISOString(),
                error: String(e),
              }
            : j
        );
        saveJobs(next);
        return next;
      });
      toast({ variant: "destructive", title: "Job failed", description: String(e) });
    } finally {
      setRunningJobId(null);
    }
  };

  const clearJobs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setJobs([]);
  };

  const running = jobs.filter((j) => j.status === "running").length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Scraping Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Monitor and trigger data collection pipelines for gigs and leads
          </p>
        </div>
        {jobs.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearJobs} className="text-destructive border-destructive/30">
            Clear History
          </Button>
        )}
      </div>

      {/* Job Runner */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1">
            <Play className="h-4 w-4 text-primary" /> Run a Scraping Job
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as ScrapingJobSource)}>
                <SelectTrigger className="mt-1 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upwork">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5" /> Upwork
                    </span>
                  </SelectItem>
                  <SelectItem value="linkedin">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> LinkedIn
                    </span>
                  </SelectItem>
                  <SelectItem value="facebook">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Facebook
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Search Query</Label>
              <Input
                className="mt-1"
                placeholder={source === "upwork" ? "e.g. React developer, AI automation" : "e.g. SaaS founder, marketing agency"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runJob()}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={runJob}
                disabled={!!runningJobId}
                className="h-10"
              >
                {runningJobId
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                  : <><Play className="h-4 w-4 mr-2" /> Run Job</>
                }
              </Button>
            </div>
          </div>

          {/* Source Info */}
          <div className="mt-3 text-xs text-muted-foreground rounded-md bg-muted/50 p-2.5">
            {source === "upwork" && "Upwork: Searches for gig listings matching your query. Currently running in demo mode — returns sample data."}
            {source === "linkedin" && "LinkedIn: Finds professional profiles matching your query. Demo mode active — real mode requires Sales Navigator API or data partner."}
            {source === "facebook" && "Facebook: Searches public business profiles. Demo mode active — real mode requires Graph API with appropriate permissions."}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{running}</div>
            <div className="text-xs text-muted-foreground mt-1">Running</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{completed}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{failed}</div>
            <div className="text-xs text-muted-foreground mt-1">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Job History</h3>
        {jobs.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No jobs yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Run your first scraping job above. Jobs are logged here with status, results, and timing.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Card key={job.id} className="shadow-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={job.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium capitalize">{job.source}</span>
                        <Badge className={cn("text-[10px] border-0", statusClass(job.status))}>
                          {job.status}
                        </Badge>
                        {job.itemsFound !== undefined && (
                          <span className="text-xs text-muted-foreground">{job.itemsFound} items</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">Query: &ldquo;{job.query}&rdquo;</p>
                      {job.error && (
                        <p className="text-xs text-destructive truncate">{job.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Architecture Note */}
      <Card className="shadow-sm border-muted">
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground text-sm">Scraping Pipeline Architecture</p>
          <p><strong className="text-foreground">Stage 1 — Collection:</strong> Fetch raw data from source (HTTP, API, or proxy-based browser)</p>
          <p><strong className="text-foreground">Stage 2 — Parsing:</strong> Extract structured fields from raw HTML or JSON</p>
          <p><strong className="text-foreground">Stage 3 — Normalization:</strong> Map to unified Gig or Lead schema</p>
          <p><strong className="text-foreground">Stage 4 — Enrichment:</strong> AI analysis of pain points, client tone, conversion potential</p>
          <p><strong className="text-foreground">Stage 5 — Scoring:</strong> Heuristic and AI-assisted quality/conversion scoring</p>
          <p className="pt-1 italic">Production Upwork/LinkedIn scraping requires residential proxies or partner API access. Current mode: demo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
