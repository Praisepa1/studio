"use client";

import { Lead } from "@/types/lead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Send, Mail, Linkedin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onGenerateOutreach?: () => void;
}

export function LeadCard({ lead, onGenerateOutreach }: LeadCardProps) {
  const score = lead.outreachScore ?? 50;

  // Determine progress bar color based on score
  let progressColor = "bg-red-500";
  let scoreColorText = "text-red-600 dark:text-red-400";
  if (score >= 80) {
    progressColor = "bg-green-500";
    scoreColorText = "text-green-600 dark:text-green-400";
  } else if (score >= 60) {
    progressColor = "bg-yellow-500";
    scoreColorText = "text-yellow-600 dark:text-yellow-400";
  } else if (score >= 40) {
    progressColor = "bg-orange-500";
    scoreColorText = "text-orange-600 dark:text-orange-400";
  }

  const companyDisp = lead.companyName || lead.company || "Unknown Company";
  const platformDisp = lead.platform || (lead.source === "linkedin" ? "LinkedIn" : "Web");

  return (
    <Card className="w-full flex flex-col justify-between shadow-sm border border-border hover:shadow-md transition-shadow duration-200 bg-card">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground leading-tight tracking-tight">
              {lead.name}
            </h3>
            <p className="text-xs text-muted-foreground leading-none">
              {lead.title}
            </p>
            <p className="text-xs font-semibold text-primary/80 pt-0.5">
              {companyDisp}
            </p>
          </div>
          <Badge
            variant={lead.source === "linkedin" ? "default" : "secondary"}
            className="px-2 py-0.5 text-[10px] uppercase font-bold rounded tracking-wide shrink-0"
          >
            {platformDisp}
          </Badge>
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="space-y-3 pb-3 flex-1">
        {/* Outreach Score Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">Outreach Score</span>
            <span className={cn("font-bold", scoreColorText)}>{score}/100</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500 ease-out", progressColor)}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Signals / Activity */}
        {lead.recentActivity && (
          <div className="bg-muted/40 rounded p-2 text-xs border border-border/50">
            <span className="font-semibold block text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-0.5">
              Recent Activity
            </span>
            <p className="text-muted-foreground line-clamp-1 italic">
              {lead.recentActivity}
            </p>
          </div>
        )}

        {/* Contact Links */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs pt-1">
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {lead.email}
            </a>
          )}
          {lead.linkedinUrl && (
            <a
              href={lead.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Linkedin className="h-3.5 w-3.5 shrink-0" />
              Profile
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="pt-3 border-t border-border/50">
        <Button
          size="sm"
          onClick={onGenerateOutreach}
          className="w-full font-semibold text-xs gap-1.5"
          disabled={!onGenerateOutreach}
        >
          <Send className="h-3.5 w-3.5" />
          Generate Outreach
        </Button>
      </CardFooter>
    </Card>
  );
}
