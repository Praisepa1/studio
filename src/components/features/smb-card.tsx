"use client";

import { SMB } from "@/types/discovery";
import { ScoreBadge } from "./score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Sparkles, Download, MapPin, Building2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface SMBCardProps {
  smb: any;
  onClick?: () => void;
  onEnrich?: () => void;
  onExport?: () => void;
}

const signalLabels: Record<string, string> = {
  no_ssl: "No SSL",
  no_mobile_viewport: "No Mobile",
  stale_copyright: "Stale Copyright",
  broken_internal_links: "Broken Links",
  no_analytics_detected: "No Analytics",
  slow_load_time: "Slow Load",
  unmaintained_stack: "Unmaintained Stack",
  active_hiring: "Active Hiring",
  recent_news_mention: "Recent News",
  modern_stack: "Modern Stack",
  clear_contact_path: "Clear Contact",
  ecommerce: "E-Commerce",
};

export function SMBCard({ smb, onClick, onEnrich, onExport }: SMBCardProps) {
  const score = smb.score ?? 50;
  const isHiring = smb.is_actively_hiring === true || smb.hiringStatus === "active";
  const hiringStatus = isHiring ? "active" : (smb.hiringStatus === "passive" ? "passive" : "unknown");

  // Get enrichment fields — description lives inside enrichment JSONB, not as a top-level field.
  const enrichment = smb.enrichment;
  const oneLiner = enrichment?.one_liner || enrichment?.description || "No description available.";

  // Extract top 3 present buying signals
  const signals = (smb.buyingSignals || smb.buying_signals?.signals || [])
    .filter((s: any) => s.present)
    .slice(0, 3);

  // Tech stack
  const techStack = smb.tech_stack || [];
  const visibleTech = techStack.slice(0, 3);
  const remainingTechCount = techStack.length - visibleTech.length;

  return (
    <TooltipProvider>
      <Card 
        onClick={onClick}
        className={cn(
          "w-full flex flex-col justify-between shadow-sm border border-border transition-shadow duration-200 bg-card",
          onClick ? "cursor-pointer hover:shadow-md hover:border-primary/50" : "hover:shadow-md"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="space-y-1 pr-4">
            <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground line-clamp-1">
              {smb.name}
            </h3>
            {smb.domain && (
              <a
                href={smb.domain.startsWith("http") ? smb.domain : `https://${smb.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center text-xs text-primary hover:underline font-medium"
              >
                {smb.domain.replace(/^https?:\/\/(www\.)?/, "")}
                <ExternalLink className="ml-1 h-3 w-3 shrink-0" />
              </a>
            )}
          </div>
          <ScoreBadge score={score} size="md" />
        </CardHeader>

        <CardContent className="space-y-3 pb-3 flex-1">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
            {smb.industry && (
              <Badge variant="secondary" className="px-2 py-0.5 font-medium rounded">
                {smb.industry}
              </Badge>
            )}
            {smb.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {smb.location}
              </span>
            )}
            {smb.business_type && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {smb.business_type}
              </span>
            )}
          </div>

          <p className="text-sm italic text-muted-foreground leading-relaxed line-clamp-2 min-h-[40px]">
            {oneLiner}
          </p>

          {signals.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/75">
                Buying Signals
              </span>
              <div className="flex flex-wrap gap-1.5">
                {signals.map((sig: any) => {
                  const isPositive = sig.weight > 0;
                  return (
                    <Tooltip key={sig.type}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "cursor-help px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                            isPositive
                              ? "bg-green-50/50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30"
                              : "bg-red-50/50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                          )}
                        >
                          {signalLabels[sig.type] || sig.type}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] p-2 text-xs">
                        <p className="font-semibold mb-0.5">{signalLabels[sig.type] || sig.type}</p>
                        <p className="text-muted-foreground">{sig.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t border-border/50 flex flex-col gap-3">
          <div className="flex items-center justify-between w-full text-xs">
            <div>
              {hiringStatus === "active" ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-green-600 dark:text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Active Hiring
                </span>
              ) : hiringStatus === "passive" ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-yellow-600 dark:text-yellow-400">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Passive Hiring
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  Unknown Hiring
                </span>
              )}
            </div>

            {visibleTech.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground max-w-[60%]">
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <div className="flex gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {visibleTech.join(", ")}
                  {remainingTechCount > 0 && ` +${remainingTechCount}`}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full">
            {!enrichment && onEnrich && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onEnrich(); }}
                className="flex-1 text-xs font-semibold gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Enrich
              </Button>
            )}
            {onExport && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onExport(); }}
                className={cn("text-xs font-semibold gap-1.5", !enrichment && onEnrich ? "w-auto" : "flex-1")}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
