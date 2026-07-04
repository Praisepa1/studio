"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Company } from "@/types/company";
import { SearchQuery } from "@/components/features/discovery-form";

export type PipelineStage =
  | "idle"
  | "searching"
  | "classifying"
  | "crawling"
  | "extracting"
  | "scoring"
  | "enriching"
  | "storing"
  | "done";

export function useDiscovery() {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [companiesFound, setCompaniesFound] = useState(0);
  const [results, setResults] = useState<Company[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store AbortController in ref to allow cross-render mutation
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setMessage("");
    setCompaniesFound(0);
    setResults([]);
    setIsRunning(false);
    setError(null);
  }, []);

  const cancelDiscovery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setStage("idle");
  }, []);

  // Cancel stream on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startDiscovery = useCallback(async (query: SearchQuery) => {
    // If running, abort first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsRunning(true);
    setError(null);
    setResults([]);
    setStage("searching");
    setProgress(5);
    setMessage("Initializing discovery request...");
    setCompaniesFound(0);

    try {
      const response = await fetch("/api/discover/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal: abortController.signal,
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
        throw new Error("No readable stream received from API.");
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

                if (event.stage) setStage(event.stage as PipelineStage);
                if (event.progress !== undefined) setProgress(event.progress);
                if (event.message) setMessage(event.message);
                if (event.companies && event.companies.length > 0) {
                  setCompaniesFound(event.companies.length);
                  setResults(event.companies);
                }

                if (event.stage === "done") {
                  setIsRunning(false);
                  abortControllerRef.current = null;
                }
              } catch (parseErr) {
                console.warn("Failed to parse stream event line:", parseErr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Discovery stream aborted by user.");
      } else {
        console.error("Discovery stream execution error:", err);
        setError(err.message || "An unexpected error occurred during discovery.");
      }
      setIsRunning(false);
    }
  }, []);

  return {
    stage,
    progress,
    message,
    companiesFound,
    results,
    isRunning,
    error,
    startDiscovery,
    cancelDiscovery,
    reset,
  };
}
