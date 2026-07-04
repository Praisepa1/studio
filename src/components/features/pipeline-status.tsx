"use client";

import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStatusProps {
  stage: "idle" | "searching" | "classifying" | "crawling" | "extracting" | "scoring" | "enriching" | "storing" | "done";
  progress: number;
  message: string;
  companiesFound: number;
  error?: string | null;
}

const STAGES = [
  { id: "searching", label: "Searching", description: "Search engines run queries for targets" },
  { id: "classifying", label: "Classifying", description: "Filter out irrelevant URLs using rule/AI heuristics" },
  { id: "crawling", label: "Crawling", description: "Recursively crawl targets using Playwright pool" },
  { id: "extracting", label: "Extracting", description: "Extract technology stack, contacts, and careers" },
  { id: "scoring", label: "Scoring", description: "Execute target profile scoring matrices" },
  { id: "enriching", label: "Enriching", description: "Generate AI positioning and pain-points hypothesis" },
  { id: "storing", label: "Storing", description: "Deduplicate and store qualified companies" },
];

export function PipelineStatus({ stage, progress, message, companiesFound, error }: PipelineStatusProps) {
  const getStageStatus = (stageId: string) => {
    const stageOrder = ["idle", "searching", "classifying", "crawling", "extracting", "scoring", "enriching", "storing", "done"];
    const currentIndex = stageOrder.indexOf(stage);
    const stageIndex = stageOrder.indexOf(stageId);

    if (error && currentIndex === stageIndex) {
      return "error";
    }
    if (stage === "done" || currentIndex > stageIndex) {
      return "completed";
    }
    if (stage === stageId) {
      return "active";
    }
    return "pending";
  };

  return (
    <div className="w-full bg-card border border-border rounded-lg p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-semibold text-base text-foreground">Discovery Status</h3>
        {stage !== "idle" && stage !== "done" && !error && (
          <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Processing
          </span>
        )}
      </div>

      {/* Vertical Steps */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {STAGES.map((s) => {
          const status = getStageStatus(s.id);
          const isCompleted = status === "completed";
          const isActive = status === "active";
          const isError = status === "error";

          return (
            <div key={s.id} className="relative group">
              {/* Indicator Dot */}
              <span className="absolute -left-6 top-1 flex h-5.5 w-5.5 items-center justify-center -translate-x-[3px] bg-card rounded-full">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-500/10 shrink-0" />
                ) : isError ? (
                  <AlertCircle className="h-5 w-5 text-destructive fill-destructive/10 shrink-0" />
                ) : isActive ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                )}
              </span>

              {/* Label and Content */}
              <div className="space-y-0.5 pl-2">
                <span
                  className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    isActive && "text-primary font-bold",
                    isCompleted && "text-foreground",
                    isError && "text-destructive",
                    status === "pending" && "text-muted-foreground/60"
                  )}
                >
                  {s.label}
                  {isCompleted && s.id === "searching" && " (Results found)"}
                  {isCompleted && s.id === "crawling" && " (Pages fetched)"}
                  {isCompleted && s.id === "storing" && companiesFound > 0 && ` (${companiesFound} saved)`}
                </span>
                
                {/* Active message / Stage description */}
                {isActive && (
                  <p className="text-xs text-muted-foreground leading-relaxed animate-fade-in pt-0.5">
                    {message || s.description}
                  </p>
                )}
                {!isActive && !isError && (
                  <p className="text-xs text-muted-foreground/50 leading-relaxed">
                    {s.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress & Banners */}
      <div className="space-y-2 pt-3 border-t">
        {stage === "done" ? (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg border border-green-200 dark:border-green-900/30 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span>{companiesFound} target companies discovered, scored, and imported.</span>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-1.5 bg-red-50 dark:bg-red-950/20 text-destructive px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/30 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>Pipeline Error</span>
            </div>
            <p className="text-xs text-red-700 dark:text-red-400 pl-7">
              {error}
            </p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400 pl-7 italic mt-0.5">
              Hint: Please check your query or API configurations and try again.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {message && (
              <p className="text-xs text-muted-foreground/75 italic line-clamp-1">
                Current status: {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
