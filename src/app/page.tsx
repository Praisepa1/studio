"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CheckCircle, Users, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  platform: "Upwork" | "LinkedIn";
  dateApplied: string;
  status: "Applied" | "Interviewing" | "Offer" | "Rejected" | "Pending";
  link: string;
}

const mockApplications: Application[] = [
  { id: "1", jobTitle: "Senior Frontend Developer", company: "Tech Solutions Inc.", platform: "LinkedIn", dateApplied: "2024-07-15", status: "Interviewing", link: "#" },
  { id: "2", jobTitle: "UX/UI Designer", company: "Creative Agency", platform: "Upwork", dateApplied: "2024-07-12", status: "Applied", link: "#" },
  { id: "3", jobTitle: "Full Stack Engineer", company: "Startup Innovate", platform: "LinkedIn", dateApplied: "2024-07-10", status: "Offer", link: "#" },
  { id: "4", jobTitle: "Project Manager", company: "Enterprise Corp", platform: "Upwork", dateApplied: "2024-07-08", status: "Rejected", link: "#" },
  { id: "5", jobTitle: "Content Writer", company: "Media Hub", platform: "LinkedIn", dateApplied: "2024-07-18", status: "Pending", link: "#" },
];

const statusBadgeVariants: Record<Application["status"], "default" | "secondary" | "destructive" | "outline"> = {
    Applied: "default", 
    Interviewing: "secondary", 
    Offer: "default", // Using primary for 'Offer' as a positive highlight
    Rejected: "destructive",
    Pending: "outline",
};


export default function DashboardPage() {
  const totalApplications = mockApplications.length;
  const interviewingCount = mockApplications.filter(app => app.status === "Interviewing").length;
  const offerCount = mockApplications.filter(app => app.status === "Offer").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">+5 from last week</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{interviewingCount}</div>
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers Received</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" /> {/* Specific color for offers */}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{offerCount}</div>
            <p className="text-xs text-muted-foreground">1 new offer!</p>
          </CardContent>
        </Card>
      </section>

       <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Welcome to JobJet!</CardTitle>
            <CardDescription className="text-md">Your AI-powered copilot for navigating the job market.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <p className="text-foreground/80">
                JobJet helps you streamline your job search, optimize your profiles, and craft compelling applications.
                Use the navigation menu to explore features like Smart Search, Profile Optimizer, and AI-driven Resume and Cover Letter generators.
              </p>
              <p className="text-foreground/80">
                Get started by exploring the tools or adding your first application manually (feature coming soon)!
              </p>
            </div>
            <div className="flex-shrink-0">
              <Image
                src="https://placehold.co/300x200.png"
                alt="Job search illustration"
                width={300}
                height={200}
                className="rounded-lg shadow-md object-cover"
                data-ai-hint="job search abstract"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Track your latest job applications here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Job Title</TableHead>
                    <TableHead className="min-w-[150px]">Company</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Date Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockApplications.slice(0, 5).map((app) => (
                    <TableRow key={app.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{app.jobTitle}</TableCell>
                      <TableCell>{app.company}</TableCell>
                      <TableCell>
                        <Badge variant={app.platform === "LinkedIn" ? "default" : "secondary"}>
                          {app.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>{app.dateApplied}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariants[app.status]}>{app.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={app.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          View Job <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {mockApplications.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No applications tracked yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
