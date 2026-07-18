import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import JobsClient from "./jobs-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * JobsPage component - React Server Component that renders the active job listings view.
 * - Protects access with an authorization guard.
 * - Queries Supabase jobs table, joining parent companies to retrieve their names.
 * - Orders the listings by the SQL column `posted_at` in descending order.
 * - Normalizes data fields and defaults location/employment categories.
 */
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
    const { data, error } = await supabase
      .from("jobs")
      .select("*, companies(name)")
      .order("posted_at", { ascending: false });

    if (error) throw error;

    jobs = (data || []).map((j: any) => ({
      id: j.id,
      title: j.title,
      companyName: j.companies?.name || "Unknown Company",
      description: j.description,
      postedAt: j.posted_at,
      location: j.location || "Remote",
      employment_type: "Full-time",
      department: "Engineering",
      url: j.url,
    }));
  } catch (err: any) {
    console.error(`Failed to fetch jobs: ${err.message || err.toString()}`, err.code ? `(Code: ${err.code})` : "");
  }


  return <JobsClient initialJobs={jobs} />;
}
