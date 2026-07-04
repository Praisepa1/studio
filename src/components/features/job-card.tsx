"use client";

import { useState } from "react";
import { Job } from "@/types/job";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar, MapPin, Briefcase, ExternalLink, Check } from "lucide-react";

interface JobCardProps {
  job: any; // Using any to support extra attributes like location, employment_type, department
  onSave?: () => void;
}

function formatPostedDate(dateStr?: string): string {
  if (!dateStr) return "Just now";
  const posted = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - posted.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 14) return `${diffDays} days ago`;
  
  return posted.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function JobCard({ job, onSave }: JobCardProps) {
  const [saved, setSaved] = useState(false);

  const handleSaveClick = () => {
    if (onSave) {
      onSave();
    }
    setSaved(true);
  };

  const companyName = job.companyName || job.company?.name || "Target Company";
  const location = job.location || "Remote / Unspecified";
  const employmentType = job.employment_type || job.employmentType || "Full-time";
  const department = job.department || "Engineering";

  return (
    <Card className="w-full flex flex-col justify-between shadow-sm border border-border hover:shadow-md transition-shadow duration-200 bg-card">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-foreground leading-tight tracking-tight line-clamp-1">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-primary font-medium">
            <span>{companyName}</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatPostedDate(job.postedAt)}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="space-y-3 pb-3 flex-1">
        {/* Description Snippet */}
        {job.description && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {job.description.replace(/Discovered job posting from careers portal\/job board:.*?\.\s*/i, "")}
          </p>
        )}

        {/* Badges Row */}
        <div className="flex flex-wrap gap-1.5 text-xs pt-1">
          <Badge variant="secondary" className="px-2 py-0.5 font-medium rounded flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {location}
          </Badge>
          <Badge variant="outline" className="px-2 py-0.5 font-medium rounded flex items-center gap-1 border-border">
            <Briefcase className="h-3 w-3 shrink-0" />
            {employmentType}
          </Badge>
          {department && (
            <Badge variant="outline" className="px-2 py-0.5 font-medium rounded border-border">
              {department}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="pt-3 border-t border-border/50 flex items-center justify-between">
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View listing
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <div />
        )}

        <Button
          size="sm"
          variant={saved ? "secondary" : "default"}
          onClick={handleSaveClick}
          className="text-xs font-semibold px-4 h-8 shrink-0"
          disabled={saved}
        >
          {saved ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
