"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface PipelineRun {
  id: string;
  userId: string;
  keyword: string;
  status: "running" | "completed" | "failed";
  companiesFound: number;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  error?: string;
}

export function usePipelineStatus(options?: { pollingIntervalMs?: number }) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalMs = options?.pollingIntervalMs ?? 15000;
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchRuns = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/pipeline-runs");
      if (!response.ok) {
        throw new Error(`Failed to fetch pipeline runs: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Make sure we only set state if component is still mounted
      if (isMountedRef.current) {
        setRuns(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || "Failed to load pipeline run history.");
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchRuns();
    setIsLoading(false);
  }, [fetchRuns]);

  // Handle polling trigger based on data status
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial load
    setIsLoading(true);
    fetchRuns().finally(() => {
      if (isMountedRef.current) setIsLoading(false);
    });

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchRuns]);

  // Dynamic Polling Management Effect
  useEffect(() => {
    // If any run is in "running" status, poll
    const hasRunningJobs = runs.some((r) => r.status === "running");

    if (hasRunningJobs) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          fetchRuns();
        }, pollingIntervalMs);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (!isMountedRef.current && pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [runs, fetchRuns, pollingIntervalMs]);

  return {
    runs,
    isLoading,
    error,
    refresh,
  };
}
