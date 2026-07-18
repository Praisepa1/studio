"use client";

import { useState } from "react";
import { DiscoveryForm, SearchQuery } from "@/components/features/discovery-form";
import { PipelineStatus } from "@/components/features/pipeline-status";
import { CompanyCard } from "@/components/features/company-card";
import { CompanyDrawer } from "@/components/features/company-drawer";
import { SMBCard } from "@/components/features/smb-card";
import { SMBDrawer } from "@/components/features/smb-drawer";
import { JobCard } from "@/components/features/job-card";
import { DiscoveryData, DiscoveryResult } from "@/types/discovery";
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Sparkles, Compass, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export default function DiscoveryPage() {
  const [query, setQuery] = useState<SearchQuery | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [target, setTarget] = useState<SearchQuery["targetType"]>("company");

  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const selectedResult = results.find(r => r.data.id === selectedResultId)?.data || null;

  // Pipeline status state
  const [stage, setStage] = useState<
    "idle" | "searching" | "classifying" | "crawling" | "extracting" | "scoring" | "enriching" | "storing" | "done"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [companiesFound, setCompaniesFound] = useState(0);

  const targetPluralMap: Record<string, string> = {
    company: "companies",
    smb: "smbs",
    job: "jobs",
    individual: "individuals",
    rfp: "rfps"
  };

  const handleFormSubmit = async (searchQuery: SearchQuery) => {
    setQuery(searchQuery);
    setIsRunning(true);
    setError(null);
    setResults([]);
    setStage("searching");
    setProgress(5);
    setMessage("Initializing discovery request...");
    setCompaniesFound(0);

    try {
      // POST to create the run, then subscribe to a Supabase Realtime channel for progress.
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...searchQuery, target: searchQuery.targetType }),
      });

      if (!response.ok) {
        let errText = "Failed to launch pipeline";
        try {
          const errJson = await response.json();
          errText = errJson.message || errJson.error || errText;
        } catch (_) {}
        throw new Error(errText);
      }
      const data = await response.json();
      if (data.run_id) {
        setActiveRunId(data.run_id);
      }
    } catch (err: any) {
      console.error("Pipeline initialization error:", err);
      setError(err.message || "An unexpected error occurred during discovery.");
      setStage("idle");
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (!activeRunId) return;

    const supabase = createClient();
    const channel = supabase.channel(`pipeline:${activeRunId}`);

    channel
      .on("broadcast", { event: "pipeline_progress" }, (payload) => {
        const event = payload.payload;
        
        if (event.stage) setStage(event.stage);
        if (event.progress !== undefined) setProgress(event.progress);
        if (event.message) setMessage(event.message);
        
        if (event.results && event.results.length > 0) {
          setCompaniesFound(event.results.length);
          setResults(event.results.map((r: any) => ({ target: event.target || target, data: r })));
        }
        if (event.target) setTarget(event.target);

        if (event.error) {
          setError(event.error);
          setIsRunning(false);
          setActiveRunId(null);
          return;
        }

        if (event.stage === "done" || event.stage === "completed") {
          setIsRunning(false);
          setActiveRunId(null);
          toast({
            title: "Discovery Complete",
            description: `Successfully scored and saved ${event.results?.length || 0} items.`,
          });
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to pipeline realtime updates!");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRunId]);

  const handleEnrich = async (id: string) => {
    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: target, id }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || resData.error || `Failed to enrich ${target}`);
      }

      // Update the record in results state
      setResults((prev) =>
        prev.map((r) => (r.data.id === id ? ({ ...r, data: { ...r.data, enrichment: resData.enrichment } } as DiscoveryResult) : r))
      );

      toast({
        title: "Record Enriched",
        description: "Successfully added AI positioning analysis.",
      });
    } catch (err: any) {
      toast({
        title: "Enrichment Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = async (id: string) => {
    toast({
      title: "Export Initiated",
      description: "Preparing profile CSV download...",
    });
    
    const pluralTarget = targetPluralMap[target] || `${target}s`;
    
    // Trigger window download or mock direct CSV export
    window.open(`/api/export/${pluralTarget}?id=${id}`, "_blank");
  };

  // Sort results descending by score
  const sortedResults = [...results].sort((a: DiscoveryResult, b: DiscoveryResult) => ((b.data as any).score ?? 0) - ((a.data as any).score ?? 0));
  const highPriorityCount = results.filter((c: DiscoveryResult) => (c.data as any).tier === "high_priority").length;

  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220, // Estimated height of CompanyCard
    overscan: 5,
  });

  const handleResultClick = (id: string) => {
    setSelectedResultId(id);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-full">
      {/* Left Column: Form & Summary */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-4">
        <DiscoveryForm onSubmit={handleFormSubmit} isLoading={isRunning} />

        {results.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Results Summary</h4>
            <p className="text-sm font-semibold text-foreground">
              {results.length} {targetPluralMap[target] || `${target}s`} found
            </p>
            <p className="text-xs text-muted-foreground">
              {highPriorityCount} marked as <span className="font-semibold text-amber-500">high priority</span>
            </p>
          </div>
        )}
      </div>

      {/* Right Column: Dynamic Pipeline Status / Output Cards */}
      <div className="flex-1 min-w-0">
        {stage === "idle" && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-12 text-center h-[450px] bg-card">
            <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary animate-pulse">
              <Compass className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Enter keywords to discover targets</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Specify keywords, industries, or locations to launch our automated discovery pipeline.
            </p>
          </div>
        )}

        {isRunning && (
          <PipelineStatus
            stage={stage}
            progress={progress}
            message={message}
            companiesFound={companiesFound}
            error={error}
          />
        )}

        {error && !isRunning && (
          <div className="flex flex-col items-center justify-center border border-destructive/20 bg-destructive/5 rounded-lg p-12 text-center h-[350px] text-destructive">
            <AlertCircle className="h-10 w-10 mb-3 fill-destructive/10" />
            <h3 className="text-lg font-bold">Pipeline Run Failed</h3>
            <p className="text-sm text-red-600 dark:text-red-400 max-w-md mt-1 mb-4">
              {error}
            </p>
          </div>
        )}

        {!isRunning && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-foreground">Qualified Scored Matches</h3>
              <span className="text-xs text-muted-foreground font-medium">Sorted by Score</span>
            </div>
            
            <div 
              ref={parentRef} 
              className="h-[600px] overflow-auto pr-2 custom-scrollbar"
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = sortedResults[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: '16px', // Gap between items
                      }}
                    >
                      {item.target === "company" && (
                        <CompanyCard
                          company={item.data}
                          onClick={() => handleResultClick(item.data.id)}
                          onEnrich={() => handleEnrich(item.data.id)}
                          onExport={() => handleExport(item.data.id)}
                        />
                      )}
                      {item.target === "smb" && (
                        <SMBCard
                          smb={item.data}
                          onClick={() => handleResultClick(item.data.id)}
                          onEnrich={() => handleEnrich(item.data.id)}
                          onExport={() => handleExport(item.data.id)}
                        />
                      )}
                      {item.target === "job" && (
                        <JobCard
                          job={{
                            ...item.data,
                            title: (item.data as any).enrichment?.meta?.job_listings?.[0]?.title || `Job at ${(item.data as any).name}`,
                            companyName: (item.data as any).name,
                            location: (item.data as any).location || (item.data as any).enrichment?.meta?.job_listings?.[0]?.location,
                            employmentType: "Full-time",
                            department: "Engineering",
                            postedAt: (item.data as any).updated_at
                          }}
                          onSave={() => handleResultClick(item.data.id)}
                        />
                      )}
                      {/* Placeholders for other targets */}
                      {!["company", "smb", "job"].includes(item.target as string) && (
                        <div className="p-4 border rounded-lg bg-muted text-muted-foreground">
                          {item.target} card not yet implemented
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {target === "company" && (
        <CompanyDrawer 
          company={selectedResult} 
          open={!!selectedResultId} 
          onOpenChange={(open) => !open && setSelectedResultId(null)} 
        />
      )}
      {target === "smb" && (
        <SMBDrawer 
          smb={selectedResult} 
          open={!!selectedResultId} 
          onOpenChange={(open) => !open && setSelectedResultId(null)} 
        />
      )}
    </div>
  );
}
