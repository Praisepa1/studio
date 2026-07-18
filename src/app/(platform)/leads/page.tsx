// @ts-nocheck
"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Users, Search, RefreshCw, ExternalLink, Zap,
  Building2, MapPin, Globe, Loader2, Send, Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from '@/types';
import { createClient } from "@/lib/supabase/client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export const dynamic = 'force-dynamic';


function scoreColor(score?: number) {
  if (!score) return "score-mid";
  if (score >= 8) return "score-high";
  if (score >= 5) return "score-mid";
  return "score-low";
}

function sourceBadge(source: Lead["source"]) {
  const map: Record<Lead["source"], string> = {
    linkedin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    facebook: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    twitter: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    manual: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return map[source] ?? "status-done";
}

function LeadCard({ lead, onView, onOutreach }: {
  lead: Lead;
  onView: (l: Lead) => void;
  onOutreach: (l: Lead) => void;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {lead.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{lead.name}</h3>
              <div className="flex items-center gap-1.5">
                <Badge className={cn("text-[10px] border-0", sourceBadge(lead.source))}>
                  {lead.source}
                </Badge>
                {lead.qualityScore !== undefined && (
                  <Badge className={cn("text-[10px] border-0", scoreColor(lead.qualityScore))}>
                    {lead.qualityScore}/10
                  </Badge>
                )}
              </div>
            </div>
            {lead.role && lead.company && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {lead.role} at {lead.company}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {lead.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {lead.location}
            </span>
          )}
          {lead.niche && (
            <span className="flex items-center gap-0.5">
              <Building2 className="h-3 w-3" /> {lead.niche}
            </span>
          )}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:text-primary">
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
        </div>

        {lead.summary && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{lead.summary}</p>
        )}

        {lead.outreachAngle && (
          <div className="mt-2 rounded-md bg-primary/5 border border-primary/20 px-2.5 py-1.5">
            <p className="text-[11px] text-primary font-medium">Angle: {lead.outreachAngle}</p>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onView(lead)}>
            View Profile
          </Button>
          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onOutreach(lead)}>
            <Send className="h-3 w-3 mr-1" /> Outreach
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadDetailDialog({ lead, open, onClose }: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!lead) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              {lead.name[0]}
            </div>
            <div>
              <div>{lead.name}</div>
              {lead.role && lead.company && (
                <DialogDescription>{lead.role} at {lead.company}</DialogDescription>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {lead.bio && (
            <div>
              <h4 className="font-semibold mb-1">Bio</h4>
              <p className="text-muted-foreground">{lead.bio}</p>
            </div>
          )}
          {lead.summary && (
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-primary" /> AI Profile Summary
              </h4>
              <p className="text-muted-foreground">{lead.summary}</p>
            </div>
          )}
          {lead.businessNeedSummary && (
            <div>
              <h4 className="font-semibold mb-1">Business Need</h4>
              <p className="text-muted-foreground">{lead.businessNeedSummary}</p>
            </div>
          )}
          {lead.likelyPainPoints && lead.likelyPainPoints.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Likely Pain Points</h4>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {lead.likelyPainPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {lead.outreachAngle && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <h4 className="font-semibold mb-1 text-primary">Best Outreach Angle</h4>
              <p className="italic">&ldquo;{lead.outreachAngle}&rdquo;</p>
            </div>
          )}
          {lead.recommendedTone && (
            <div className="flex gap-4">
              <div>
                <span className="font-semibold">Recommended Tone: </span>
                <span className="text-muted-foreground capitalize">{lead.recommendedTone}</span>
              </div>
              {lead.communicationStyle && (
                <div>
                  <span className="font-semibold">Style: </span>
                  <span className="text-muted-foreground capitalize">{lead.communicationStyle}</span>
                </div>
              )}
            </div>
          )}
          {lead.confidenceNotes && (
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <strong>Confidence note:</strong> {lead.confidenceNotes}
            </div>
          )}
          <div className="pt-2">
            <Button asChild className="w-full">
              <Link href={`/outreach?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`}>
                <Send className="h-4 w-4 mr-2" /> Generate Outreach for {lead.name}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * LeadsPage component - Client-side page that renders B2B outreach leads.
 * - Triggers secure queries to retrieve existing lead records from the database on load.
 * - Allows searching and scraping new B2B leads using real-time search engine queries.
 * - Displays lead metrics, details, pain points, and links to target outreach personalization workflows.
 */
export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("linkedin");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const loadLeads = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("leads")
          .select(`
            *,
            companies (
              name,
              domain
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        const mapped = (data || []).map((l: any) => ({
          id: l.id,
          name: l.name,
          role: l.title,
          company: l.companies?.name || 'Unknown Company',
          location: l.enrichment?.location || 'Unknown',
          website: l.companies?.domain || '',
          socialLinks: [{ platform: l.source, url: l.linkedin_url }],
          bio: l.enrichment?.summary || l.recent_activity || '',
          businessNeedIndicators: l.enrichment?.likelyPainPoints || [],
          source: l.source,
          scrapedAt: l.created_at,
          status: l.status,
          summary: l.enrichment?.summary || '',
          outreachAngle: l.enrichment?.outreachAngle || '',
          likelyPainPoints: l.enrichment?.likelyPainPoints || [],
          suggestedOfferFraming: l.enrichment?.suggestedOfferFraming || '',
          recommendedTone: l.enrichment?.recommendedTone || 'professional',
          communicationStyle: l.enrichment?.communicationStyle || 'executive',
          confidenceNotes: l.enrichment?.confidenceNotes || '',
          qualityScore: l.enrichment?.qualityScore || 5,
          businessNeedSummary: l.enrichment?.businessNeedSummary || '',
        }));
        setLeads(mapped);
      } catch (err) {
        console.error("Failed to load leads from Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    loadLeads();
  }, []);

  const findLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scrape/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query || "startup founder", source, limit: 10 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        return [...(data.leads as Lead[]).filter((l) => !existingIds.has(l.id)), ...prev];
      });
      toast({ title: `${data.leads.length} leads found`, description: `Source: ${data.source}` });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Search failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  }, [query, source, toast]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Lead Generation</h2>
          <p className="text-sm text-muted-foreground">Discover and qualify prospects from LinkedIn, Facebook, and more</p>
        </div>
        <Button onClick={findLeads} disabled={loading} className="shrink-0">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finding...</>
            : <><RefreshCw className="h-4 w-4 mr-2" /> Find Leads</>
          }
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search role, company, niche (e.g. SaaS founder)"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && findLeads()}
          />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="twitter">Twitter/X</SelectItem>
            <SelectItem value="other">All sources</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {leads.length === 0 && !loading && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No leads yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Search by role, niche, or keyword to discover and qualify prospects from social platforms.
            </p>
            <Button onClick={findLeads}>
              <RefreshCw className="h-4 w-4 mr-2" /> Find Leads Now
            </Button>
          </CardContent>
        </Card>
      )}

      {leads.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onView={(l) => { setSelectedLead(l); setDialogOpen(true); }}
                onOutreach={(l) => {
                  window.location.href = `/outreach?leadId=${l.id}&leadName=${encodeURIComponent(l.name)}`;
                }}
              />
            ))}
          </div>
        </>
      )}

      <LeadDetailDialog
        lead={selectedLead}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
