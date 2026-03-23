"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ThumbsUp, ThumbsDown, Edit3, MessageSquare,
  BarChart3, TrendingUp, Award, Trash2,
} from "lucide-react";
import type { FeedbackEntry, AIProvider } from "@/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "jobjet_feedback";

function loadFeedback(): FeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function providerClass(p: string) {
  if (p === "gemini") return "provider-gemini";
  if (p === "claude") return "provider-claude";
  if (p === "gemini-claude") return "provider-pipeline";
  return "status-done";
}

function SentimentIcon({ sentiment }: { sentiment: FeedbackEntry["sentiment"] }) {
  if (sentiment === "positive") return <ThumbsUp className="h-4 w-4 text-green-500" />;
  if (sentiment === "negative") return <ThumbsDown className="h-4 w-4 text-red-500" />;
  return <Edit3 className="h-4 w-4 text-amber-500" />;
}

export default function FeedbackPage() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);

  useEffect(() => {
    setEntries(loadFeedback());
  }, []);

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEntries([]);
  };

  // Analytics
  const total = entries.length;
  const positive = entries.filter((e) => e.sentiment === "positive").length;
  const negative = entries.filter((e) => e.sentiment === "negative").length;
  const edited = entries.filter((e) => e.sentiment === "edited").length;

  const providerCounts: Record<string, number> = {};
  const providerPositive: Record<string, number> = {};
  entries.forEach((e) => {
    providerCounts[e.provider] = (providerCounts[e.provider] ?? 0) + 1;
    if (e.sentiment === "positive") {
      providerPositive[e.provider] = (providerPositive[e.provider] ?? 0) + 1;
    }
  });

  const bestProvider = Object.entries(providerPositive)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const typeCounts: Record<string, number> = {};
  entries.forEach((e) => {
    typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Feedback & Learning</h2>
          <p className="text-sm text-muted-foreground">
            Track AI output quality over time and improve prompts based on outcomes
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive border-destructive/30 hover:bg-destructive/5">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Ratings</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-600">{positive}</div>
            <div className="text-xs text-muted-foreground mt-1">Positive</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-red-500">{negative}</div>
            <div className="text-xs text-muted-foreground mt-1">Negative</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-amber-500">{edited}</div>
            <div className="text-xs text-muted-foreground mt-1">Edited</div>
          </CardContent>
        </Card>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Provider breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-primary" /> By Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(providerCounts).map(([p, count]) => (
                <div key={p} className="flex items-center justify-between text-sm">
                  <Badge className={cn("text-[10px] border-0", providerClass(p))}>{p}</Badge>
                  <span className="text-muted-foreground">{count} ratings</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Type breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-primary" /> By Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(typeCounts).map(([t, count]) => (
                <div key={t} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{t.replace("_", " ")}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Best performer */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Award className="h-4 w-4 text-primary" /> Best Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestProvider ? (
                <div className="text-center py-2">
                  <Badge className={cn("text-sm px-3 py-1 border-0", providerClass(bestProvider))}>
                    {bestProvider}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {providerPositive[bestProvider]} positive ratings
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({Math.round((providerPositive[bestProvider] / providerCounts[bestProvider]) * 100)}% positive rate)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not enough data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback List */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Feedback History
        </h3>
        {entries.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No feedback yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Rate proposals and outreach messages using the thumbs up/down buttons. Your feedback improves the AI over time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card key={entry.id} className="shadow-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <SentimentIcon sentiment={entry.sentiment} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{entry.referenceTitle || entry.referenceId}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{entry.type.replace("_", " ")}</Badge>
                        <Badge className={cn("text-[10px] border-0", providerClass(entry.provider))}>
                          {entry.provider}
                        </Badge>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Learning Notes */}
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">How Feedback Improves the System</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Short-term:</strong> Each thumbs up/down is stored and used to
            identify which provider, style, and tone combinations work best for your specific use cases.
          </p>
          <p>
            <strong className="text-foreground">Medium-term:</strong> Pattern analysis across your feedback will
            surface which prompt templates produce the highest-quality outputs for your niche and audience.
          </p>
          <p>
            <strong className="text-foreground">Long-term:</strong> Accumulated feedback becomes a training
            dataset for prompt fine-tuning and provider selection ranking — the system learns your standards.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
