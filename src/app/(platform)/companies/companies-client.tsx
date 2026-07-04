"use client";

import { useState } from "react";
import { ScoreBadge } from "@/components/features/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Sparkles,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Building,
  MapPin,
  Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

interface CompaniesClientProps {
  initialCompanies: any[];
}

export default function CompaniesClient({ initialCompanies }: CompaniesClientProps) {
  const [companies, setCompanies] = useState<any[]>(initialCompanies);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [hiringFilter, setHiringFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrichingMap, setEnrichingMap] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleEnrich = async (id: string) => {
    setEnrichingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "company", id }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || resData.error || "Failed to enrich company");
      }

      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, enrichment: resData.enrichment } : c))
      );

      toast({
        title: "Company Enriched",
        description: "Successfully generated AI insights.",
      });
    } catch (err: any) {
      toast({
        title: "Enrichment Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Filter logic in memory
  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.industry || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = tierFilter === "all" || c.tier === tierFilter;

    const isHiring = c.isActivelyHiring === true || c.hiringStatus === "active";
    const status = isHiring ? "active" : (c.hiringStatus === "passive" ? "passive" : "unknown");
    const matchesHiring = hiringFilter === "all" || status === hiringFilter;

    return matchesSearch && matchesTier && matchesHiring;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-card border rounded-lg p-4 shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies, industry, or location..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter by Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="high_priority">High Priority</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={hiringFilter} onValueChange={setHiringFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter by Hiring" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Hiring Status</SelectItem>
              <SelectItem value="active">Active Hiring</SelectItem>
              <SelectItem value="passive">Passive Hiring</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted px-2.5 py-1.5 rounded">
            {filteredCompanies.length} companies matched
          </span>
          <Button asChild variant="outline" size="sm" className="font-semibold text-xs gap-1.5 h-9">
            <a href="/api/export/companies" target="_blank">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      {/* Main content: Desktop Table / Mobile Card List */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        {/* Table layout (visible on desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Industry</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5 text-center">Score</th>
                <th className="px-6 py-3.5 text-center">Hiring Status</th>
                <th className="px-6 py-3.5">Tech Stack</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCompanies.map((c) => {
                const isExpanded = expandedId === c.id;
                const isHiring = c.isActivelyHiring === true || c.hiringStatus === "active";
                const isPassive = c.hiringStatus === "passive";
                const visibleTech = (c.techStack || []).slice(0, 2);

                return (
                  <div key={c.id} className="table-row-group">
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          {c.name}
                          {c.domain && (
                            <a
                              href={c.domain.startsWith("http") ? c.domain : `https://${c.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{c.industry || "N/A"}</td>
                      <td className="px-6 py-4 text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {c.location || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <ScoreBadge score={c.score ?? 50} size="sm" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isHiring ? (
                          <Badge className="bg-green-500 hover:bg-green-600 border-0 rounded text-[10px] uppercase font-bold tracking-wide">
                            Active
                          </Badge>
                        ) : isPassive ? (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600 border-0 rounded text-[10px] uppercase font-bold tracking-wide">
                            Passive
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground rounded text-[10px] uppercase font-bold tracking-wide">
                            Unknown
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {visibleTech.map((tech: string) => (
                            <Badge key={tech} variant="secondary" className="px-1.5 py-0 rounded text-[10px]">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(c.id)}
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            Details
                            {isExpanded ? (
                              <ChevronUp className="ml-1 h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="ml-1 h-3.5 w-3.5" />
                            )}
                          </Button>
                          {!c.enrichment && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEnrich(c.id)}
                              disabled={enrichingMap[c.id]}
                              className="h-8 text-xs font-semibold gap-1.5"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              {enrichingMap[c.id] ? "Enriching..." : "Enrich"}
                            </Button>
                          )}
                          <Button asChild size="sm" className="h-8 text-xs font-semibold gap-1.5">
                            <Link href={`/outreach?company=${encodeURIComponent(c.name)}`}>
                              <Send className="h-3.5 w-3.5" />
                              Outreach
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-muted/20 border-b">
                        <td colSpan={7} className="px-8 py-5">
                          <div className="space-y-4 max-w-4xl">
                            {/* Insight blocks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  Description & One Liner
                                </h4>
                                <p className="text-sm italic text-foreground leading-relaxed">
                                  {c.enrichment?.one_liner || c.description || "No descriptions available yet."}
                                </p>
                              </div>
                              {c.enrichment?.pain_point_hypothesis && (
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Hypothesized Pain Points
                                  </h4>
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {c.enrichment.pain_point_hypothesis}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Pitch Angle */}
                            {c.enrichment?.pitch_angle && (
                              <div className="space-y-1 border-t pt-3">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  Recommended Pitch Angle
                                </h4>
                                <p className="text-sm text-foreground font-medium bg-primary/5 border border-primary/10 rounded p-2.5">
                                  {c.enrichment.pitch_angle}
                                </p>
                              </div>
                            )}

                            {/* Contact paths */}
                            <div className="flex gap-4 text-xs font-medium text-muted-foreground border-t pt-3">
                              {c.contactEmail && (
                                <span>
                                  Email: <a href={`mailto:${c.contactEmail}`} className="text-primary hover:underline">{c.contactEmail}</a>
                                </span>
                              )}
                              {c.contactPhone && <span>Phone: {c.contactPhone}</span>}
                              {c.size && <span>Size: {c.size} employees</span>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </div>
                );
              })}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No companies discovered matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card list layout (visible on mobile) */}
        <div className="block md:hidden p-4 space-y-4">
          {filteredCompanies.map((c) => {
            const isHiring = c.isActivelyHiring === true || c.hiringStatus === "active";
            const isPassive = c.hiringStatus === "passive";
            return (
              <div key={c.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-base">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {c.industry || "No Industry"} • {c.location || "No Location"}
                    </p>
                  </div>
                  <ScoreBadge score={c.score ?? 50} size="sm" />
                </div>

                <p className="text-xs italic text-muted-foreground line-clamp-2">
                  {c.enrichment?.one_liner || c.description || "No description."}
                </p>

                <div className="flex items-center gap-2">
                  {isHiring ? (
                    <Badge className="bg-green-500 rounded">Hiring</Badge>
                  ) : isPassive ? (
                    <Badge className="bg-yellow-500 rounded">Passive</Badge>
                  ) : (
                    <Badge variant="outline" className="rounded">Unknown</Badge>
                  )}
                  {c.tier && (
                    <Badge variant="secondary" className="rounded capitalize text-[10px]">
                      {c.tier.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t justify-end">
                  {!c.enrichment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEnrich(c.id)}
                      disabled={enrichingMap[c.id]}
                      className="h-8 text-xs font-semibold"
                    >
                      Enrich
                    </Button>
                  )}
                  <Button asChild size="sm" className="h-8 text-xs font-semibold">
                    <Link href={`/outreach?company=${encodeURIComponent(c.name)}`}>
                      Outreach
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}

          {filteredCompanies.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No companies discovered matching current filters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
