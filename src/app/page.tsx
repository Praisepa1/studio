"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Briefcase, Users, FileText, Send,
  Zap, CheckCircle2, LogIn, Bot, Activity, Cpu,
} from "lucide-react";

const features = [
  {
    icon: Briefcase,
    title: "Upwork Gig Scraper",
    description: "Automatically find and score Upwork opportunities. AI analysis extracts pain points, client tone, and conversion potential for every gig.",
    href: "/upwork-gigs",
  },
  {
    icon: Users,
    title: "Lead Generation",
    description: "Discover prospects from LinkedIn, Facebook, and more. AI builds a behavioral profile and suggests the strongest outreach angle.",
    href: "/leads",
  },
  {
    icon: FileText,
    title: "Proposal Generator",
    description: "Generate winning Upwork proposals in 4 styles. Use Gemini, Claude, or the dual-AI pipeline where Gemini drafts and Claude refines.",
    href: "/proposals",
  },
  {
    icon: Send,
    title: "Outreach Generator",
    description: "Create personalized first messages, follow-ups, and closing messages tailored to each lead's communication style and business needs.",
    href: "/outreach",
  },
  {
    icon: Bot,
    title: "Dual-AI Pipeline",
    description: "Use Gemini for fast planning and initial drafts. Use Claude for persuasion, refinement, and final polish. Or let the pipeline do both.",
    href: "/ai-studio",
  },
  {
    icon: Activity,
    title: "Feedback & Learning",
    description: "Rate every generated output. The system tracks which providers, styles, and tones perform best for your specific use case.",
    href: "/feedback",
  },
];

const steps = [
  {
    n: "01",
    title: "Scrape Opportunities",
    description: "Run the Upwork scraper or lead finder. AI scores, classifies, and enriches every result instantly.",
  },
  {
    n: "02",
    title: "Generate with AI",
    description: "Select a gig or lead, choose your provider strategy, and generate tailored proposals or outreach messages in seconds.",
  },
  {
    n: "03",
    title: "Send & Improve",
    description: "Send your winning content. Rate the output, track outcomes, and let the feedback loop improve every future generation.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">JobJet</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth?view=login"><LogIn className="mr-1.5 h-4 w-4" />Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth?view=signup">Get Started Free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Zap className="h-3.5 w-3.5" />
            Powered by Gemini + Claude dual-AI pipeline
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6 max-w-4xl mx-auto">
            Win more clients with{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI-powered proposals
            </span>{" "}
            and outreach
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            JobJet scrapes Upwork gigs and LinkedIn leads, analyzes client psychology, and generates
            personalized proposals that convert — using both Gemini and Claude intelligently.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild size="lg" className="shadow-lg text-base">
              <Link href="/auth?view=signup">
                Start for Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link href="/dashboard">
                View Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need to win</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete AI platform for freelancers and agencies to find, qualify, and close clients faster.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Link key={f.href} href={f.href} className="group">
                <div className="h-full rounded-xl border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Providers */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary uppercase tracking-wide">Dual-AI Architecture</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Gemini drafts. Claude refines. You win.
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Use each model where it excels. Gemini provides fast broad planning and first drafts.
                  Claude applies deeper reasoning, persuasion, and polish. Together they outperform either alone.
                </p>
                <div className="space-y-2">
                  {[
                    "Gemini-only mode for fast iteration",
                    "Claude-only mode for maximum quality",
                    "Gemini → Claude pipeline for best output",
                    "Automatic fallback if one provider fails",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">GEMINI</div>
                  <p className="text-xs text-muted-foreground">Planning · Summarization · Fast drafts · Classification · Variation brainstorming</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">CLAUDE</div>
                  <p className="text-xs text-muted-foreground">Deep writing · Proposal refinement · Persuasion · Structured reasoning · Final polish</p>
                </div>
                <div className="col-span-2 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-5 shadow-sm">
                  <div className="text-xs font-semibold text-primary mb-2">GEMINI → CLAUDE PIPELINE</div>
                  <p className="text-xs text-muted-foreground">Gemini generates first draft → Claude refines for persuasion and naturalness → You get the best of both models</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-14">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.n} className="text-center">
                <div className="text-5xl font-black text-primary/20 mb-4">{step.n}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-primary to-accent text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start winning more clients?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join JobJet and let AI handle the research, analysis, and writing — so you can focus on closing deals.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-primary font-bold shadow-lg">
            <Link href="/auth?view=signup">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold">JobJet</span>
          </div>
          <p>© {new Date().getFullYear()} JobJet. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
