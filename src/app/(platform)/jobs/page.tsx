import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import JobsClient from "./jobs-client";

export default async function JobsPage() {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    redirect("/auth?view=login");
  }

  // 2. Fetch Jobs
  let jobs: any[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("postedAt", { ascending: false });

    jobs = data || [];
  } catch (err) {
    console.error("Failed to fetch jobs:", err);
  }

  // Fallback demo jobs if Supabase table is empty
  if (jobs.length === 0) {
    jobs = [
      {
        id: "job-1",
        title: "Frontend Engineer (React/TypeScript)",
        companyName: "Acme Corp",
        description: "Looking for an engineer to help us build out our customer facing billing and shipping analytics portal. Must be fluent in React, TypeScript, and modern state managers.",
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Austin, TX / Remote",
        employment_type: "Full-time",
        department: "Engineering",
        url: "https://acme.com/careers/frontend",
      },
      {
        id: "job-2",
        title: "Staff Full-Stack Software Developer",
        companyName: "FinFlow SaaS",
        description: "Join us in automating billing infrastructure for African subscription businesses. Seeking developer with experience in API development, database optimization, and cloud services.",
        postedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Lagos, Nigeria",
        employment_type: "Contract",
        department: "Engineering",
        url: "https://finflowsaas.io/careers/staff-dev",
      }
    ];
  }

  return <JobsClient initialJobs={jobs} />;
}
