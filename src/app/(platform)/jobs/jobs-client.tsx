"use client";

import { useState } from "react";
import { JobCard } from "@/components/features/job-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Briefcase } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface JobsClientProps {
  initialJobs: any[];
}

export default function JobsClient({ initialJobs }: JobsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("all");

  const filteredJobs = initialJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const type = job.employment_type || job.employmentType || "Full-time";
    const matchesType = employmentFilter === "all" || type.toLowerCase() === employmentFilter.toLowerCase();

    return matchesSearch && matchesType;
  });

  const handleSave = () => {
    toast({
      title: "Job Saved",
      description: "Successfully added to your pipeline tracking.",
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-card border rounded-lg p-4 shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by keyword, title, or company..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={employmentFilter} onValueChange={setEmploymentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Employment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted px-2.5 py-1.5 rounded">
            {filteredJobs.length} jobs matched
          </span>
        </div>
      </div>

      {/* Main Grid */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onSave={handleSave} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-12 text-center h-[350px] bg-card">
          <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary">
            <Briefcase className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No jobs discovered yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Run a job search from the Discovery page to find and import active employment leads.
          </p>
        </div>
      )}
    </div>
  );
}
