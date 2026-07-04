"use client";

import { useState } from "react";
import { DiscoveryForm, SearchQuery } from "@/components/features/discovery-form";
import { PipelineStatus } from "@/components/features/pipeline-status";
import { CompanyCard } from "@/components/features/company-card";
import { Company } from "@/types/company";
import { Sparkles, Compass, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DiscoveryPage() {
  const [query, setQuery] = useState<SearchQuery | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Pipeline status state
  const [stage, setStage] = useState<
    "idle" | "searching" | "classifying" | "crawling" | "extracting" | "scoring" | "enriching" | "storing" | "done"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [companiesFound, setCompaniesFound] = useState(0);

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
      // POST fetch SSE stream
      const response = await fetch("/api/discover/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      });

      if (!response.ok) {
        let errText = "Failed to launch pipeline";
        try {
          const errJson = await response.json();
          errText = errJson.message || errJson.error || errText;
        } catch (_) {}
        throw new Error(errText);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("API did not return a readable stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const rawJSON = trimmed.slice(6).trim();
            if (rawJSON) {
              try {
                const event = JSON.parse(rawJSON);
                
                // Update stream status states
                if (event.stage) setStage(event.stage);
                if (event.progress !== undefined) setProgress(event.progress);
                if (event.message) setMessage(event.message);
                if (event.companies && event.companies.length > 0) {
                  setCompaniesFound(event.companies.length);
                  setResults(event.companies);
                }

                if (event.stage === "done") {
                  setIsRunning(false);
                  toast({
                    title: "Discovery Complete",
                    description: `Successfully scored and saved ${event.companies?.length || 0} companies.`,
                  });
                }
              } catch (parseErr) {
                console.warn("Failed to parse SSE chunk:", parseErr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("SSE stream error:", err);
      setError(err.message || "An unexpected error occurred during discovery.");
      setStage("idle");
      setIsRunning(false);
    }
  };

  const handleEnrich = async (companyId: string) => {
    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "company", id: companyId }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || resData.error || "Failed to enrich company");
      }

      // Update the record in results state
      setResults((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, enrichment: resData.enrichment } : c))
      );

      toast({
        title: "Company Enriched",
        description: "Successfully added AI positioning one-liner & pitch hypothesis.",
      });
    } catch (err: any) {
      toast({
        title: "Enrichment Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = async (companyId: string) => {
    toast({
      title: "Export Initiated",
      description: "Preparing company profile CSV download...",
    });
    // Trigger window download or mock direct CSV export
    window.open(`/api/export/companies?id=${companyId}`, "_blank");
  };

  // Sort results descending by score
  const sortedResults = [...results].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
  const highPriorityCount = results.filter((c: any) => c.tier === "high_priority").length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-full">
      {/* Left Column: Form & Summary */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-4">
        <DiscoveryForm onSubmit={handleFormSubmit} isLoading={isRunning} />

        {results.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Results Summary</h4>
            <p className="text-sm font-semibold text-foreground">
              {results.length} companies found
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
            <h3 className="text-lg font-bold text-foreground">Enter keywords to discover companies</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Specify keywords, industries, or locations to launch our automated B2B scraping and pipeline scoring.
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedResults.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onEnrich={() => handleEnrich(company.id)}
                  onExport={() => handleExport(company.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
