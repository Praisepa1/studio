"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Briefcase, Search, RefreshCw, ExternalLink, Zap,
  DollarSign, Star, Clock, ChevronRight, Loader2, BookmarkPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Gig } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

function scoreColor(score?: number) {
  if (!score) return "score-mid";
  if (score >= 8) return "score-high";
  if (score >= 5) return "score-mid";
  return "score-low";
}

function statusBadge(status: Gig["status"]) {
  const map: Record<Gig["status"], string> = {
    new: "status-new",
    saved: "status-active",
    applied: "status-pending",
    won: "score-high",
    lost: "score-low",
    archived: "status-done",
  };
  return map[status] ?? "status-done";
}

// ─── Gig Card ─────────────────────────────────────────────────

function GigCard({ gig, onView, onSave, onProposal }: {
  gig: Gig;
  onView: (g: Gig) => void;
  onSave: (id: string) => void;
  onProposal: (g: Gig) => void;
}) {
  const budget = gig.budget.type === "hourly"
    ? `$${gig.budget.min ?? "?"}–$${gig.budget.max ?? "?"}/hr`
    : `$${gig.budget.min ?? "?"}–$${gig.budget.max ?? "?"} fixed`;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow border">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={cn("text-[10px] border-0", statusBadge(gig.status))}>
                {gig.status}
              </Badge>
              {gig.conversionScore !== undefined && (
                <Badge className={cn("text-[10px] border-0", scoreColor(gig.conversionScore))}>
                  Score {gig.conversionScore}/10
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {gig.title}
            </h3>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave(gig.id)}>
              <BookmarkPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={gig.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{gig.description}</p>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> {budget}
          </span>
          {gig.clientHistory?.rating ? (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" /> {gig.clientHistory.rating}★
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(gig.postedAt).toLocaleDateString()}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {gig.skills.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
          ))}
          {gig.skills.length > 4 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{gig.skills.length - 4}</Badge>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onView(gig)}>
            View Details
          </Button>
          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onProposal(gig)}>
            <Zap className="h-3 w-3 mr-1" /> Proposal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────

function GigDetailDialog({ gig, open, onClose }: {
  gig: Gig | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!gig) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-6">{gig.title}</DialogTitle>
          <DialogDescription>
            {gig.budget.type === "hourly"
              ? `$${gig.budget.min ?? "?"}–$${gig.budget.max ?? "?"}/hr`
              : `$${gig.budget.min ?? "?"}–$${gig.budget.max ?? "?"} fixed`}
            {" · "}{gig.experienceLevel} · {gig.source}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Description</h4>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{gig.description}</p>
          </div>
          {gig.summary && (
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-primary" /> AI Summary
              </h4>
              <p className="text-muted-foreground">{gig.summary}</p>
            </div>
          )}
          {gig.likelyPainPoints && (
            <div>
              <h4 className="font-semibold mb-1">Likely Pain Points</h4>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {gig.likelyPainPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {gig.bestMessageAngle && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <h4 className="font-semibold mb-1 text-primary">Best Opening Angle</h4>
              <p className="text-sm italic">&ldquo;{gig.bestMessageAngle}&rdquo;</p>
            </div>
          )}
          {gig.skills.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Required Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {gig.skills.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {gig.clientHistory && (
            <div>
              <h4 className="font-semibold mb-1">Client History</h4>
              <div className="flex gap-4 text-muted-foreground">
                {gig.clientHistory.totalSpent !== undefined && (
                  <span>${gig.clientHistory.totalSpent.toLocaleString()} spent</span>
                )}
                {gig.clientHistory.hires !== undefined && (
                  <span>{gig.clientHistory.hires} hires</span>
                )}
                {gig.clientHistory.rating !== undefined && gig.clientHistory.rating > 0 && (
                  <span>{gig.clientHistory.rating}★</span>
                )}
              </div>
            </div>
          )}
          <div className="pt-2">
            <Button asChild className="w-full">
              <Link href={`/proposals?gigId=${gig.id}&gigTitle=${encodeURIComponent(gig.title)}`}>
                <Zap className="h-4 w-4 mr-2" /> Generate Proposal for This Gig
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function UpworkGigsPage() {
  const { toast } = useToast();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const runScraper = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scrape/upwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query || "web development", limit: 10 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGigs((prev) => {
        const existingIds = new Set(prev.map((g) => g.id));
        const newGigs = (data.gigs as Gig[]).filter((g) => !existingIds.has(g.id));
        return [...newGigs, ...prev];
      });
      toast({
        title: `${data.gigs.length} gigs found`,
        description: `Source: ${data.source}${data.errors?.length ? " (demo mode)" : ""}`,
      });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Scrape failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  const handleSave = (id: string) => {
    setGigs((prev) =>
      prev.map((g) => g.id === id ? { ...g, status: "saved" as const } : g)
    );
    toast({ title: "Gig saved" });
  };

  const filteredGigs = gigs.filter((g) => {
    if (filter === "all") return true;
    return g.status === filter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Upwork Gig Scraper</h2>
          <p className="text-sm text-muted-foreground">Find and score Upwork opportunities automatically</p>
        </div>
        <Button onClick={runScraper} disabled={loading} className="shrink-0">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scraping...</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" /> Run Scraper</>
          )}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search keywords (e.g. React, Python, copywriting)"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runScraper()}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="saved">Saved</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {gigs.length === 0 && !loading && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No gigs yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Run the scraper to find and score Upwork opportunities automatically.
              Try keywords like &ldquo;React developer&rdquo; or &ldquo;AI automation&rdquo;.
            </p>
            <Button onClick={runScraper}>
              <RefreshCw className="h-4 w-4 mr-2" /> Run Scraper Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gig Grid */}
      {filteredGigs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredGigs.length} gig{filteredGigs.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGigs.map((gig) => (
              <GigCard
                key={gig.id}
                gig={gig}
                onView={(g) => { setSelectedGig(g); setDialogOpen(true); }}
                onSave={handleSave}
                onProposal={(g) => {
                  window.location.href = `/proposals?gigId=${g.id}&gigTitle=${encodeURIComponent(g.title)}`;
                }}
              />
            ))}
          </div>
        </>
      )}

      <GigDetailDialog
        gig={selectedGig}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
