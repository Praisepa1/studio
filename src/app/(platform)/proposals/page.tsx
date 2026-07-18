"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Copy,
  Edit3,
  RefreshCw,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Clock,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Proposal, ProposalStyle, AIProvider } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';


function loadProposals(): Proposal[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("jobjet_proposals");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load proposals", e);
    return [];
  }
}

function saveProposals(proposals: Proposal[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("jobjet_proposals", JSON.stringify(proposals));
    } catch (e) {
      console.error("Failed to save proposals", e);
    }
  }
}

// Mock icons
const CopyIcon = Copy;
const EditIcon = Edit3;

function providerLabel(p: AIProvider): string {
  if (p === "gemini") return "Gemini 2.0 Flash";
  if (p === "claude") return "Claude 3.5 Sonnet";
  if (p === "openrouter-gemini") return "Gemini (OpenRouter)";
  if (p === "openrouter-claude") return "Claude (OpenRouter)";
  if (p === "openrouter-pipeline") return "Dual-AI (OpenRouter)";
  return "Dual-AI Pipeline";
}

function providerClass(p: AIProvider): string {
  if (p === "gemini") return "provider-gemini";
  if (p === "claude") return "provider-claude";
  if (p === "openrouter-gemini") return "provider-gemini bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
  if (p === "openrouter-claude") return "provider-claude bg-purple-500/10 text-purple-500 border-purple-500/20";
  return "provider-pipeline";
}

function ProposalsContent() {
  const { toast } = useToast();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const prefillJobTitle = searchParams.get("jobTitle") ?? "";

  const [jobTitle, setJobTitle] = useState(prefillJobTitle);
  const [jobDescription, setJobDescription] = useState("");
  const [jobSkills, setJobSkills] = useState("");
  const [userSkills, setUserSkills] = useState("");
  const [style, setStyle] = useState<ProposalStyle>("premium");
  const [provider, setProvider] = useState<AIProvider>(
    (process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER as AIProvider) || "openrouter-free"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<Proposal> | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savedProposals, setSavedProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState("generate");

  // Lead Picker State
  const [dbLeads, setDbLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    setSavedProposals(loadProposals() || []);
    // Fetch available leads for the picker
    const fetchLeads = async () => {
      const { data } = await supabase
        .from("leads")
        .select("*, companies(name)")
        .in("status", ["new", "proposal_failed"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setDbLeads(data);
    };
    fetchLeads();
  }, []);

  const handleLeadSelect = (id: string) => {
    setSelectedLeadId(id);
    const lead = dbLeads.find((l) => l.id === id);
    if (!lead) return;
    
    const companyName = lead.companies?.name || "Unknown Company";
    setJobTitle(`${companyName} - ${lead.title} (${lead.name})`);
    
    if (lead.enrichment) {
      const parts = [];
      if (lead.enrichment.niche) parts.push(`Niche: ${lead.enrichment.niche}`);
      if (lead.enrichment.bio) parts.push(`Bio: ${lead.enrichment.bio}`);
      if (lead.enrichment.businessNeedIndicators && Array.isArray(lead.enrichment.businessNeedIndicators)) {
        parts.push(`Needs: ${lead.enrichment.businessNeedIndicators.join(', ')}`);
      }
      setJobDescription(parts.join('\n\n'));
    }
  };

  const generate = useCallback(async () => {
    if (!jobTitle.trim()) {
      toast({ variant: "destructive", title: "Add a job title" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          description: jobDescription,
          skills: jobSkills.split(",").map(s => s.trim()).filter(Boolean),
          userSkills,
          style,
          provider,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setEditContent(data.content);
      toast({ title: "Proposal generated!" });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Generation failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  }, [jobTitle, jobDescription, jobSkills, userSkills, style, provider, toast]);

  const saveProposal = async () => {
    if (!result?.content) return;
    const proposal: Proposal = {
      id: `prop-${Date.now()}`,
      jobId: "manual",
      jobTitle,
      content: editing ? editContent : (result.content ?? ""),
      style,
      provider,
      model: result.model,
      generatedAt: new Date().toISOString(),
      geminiDraft: result.geminiDraft,
      claudeRefinement: result.claudeRefinement,
    };
    const updated = [proposal, ...savedProposals];
    setSavedProposals(updated);
    saveProposals(updated);
    
    // DB INSERT
    try {
      const dbJobId = proposal.jobId === "manual" ? null : proposal.jobId;
      const { error } = await supabase.from('proposals').insert({
        job_id: dbJobId,
        job_title: proposal.jobTitle,
        content: proposal.content,
        style: proposal.style,
        provider: proposal.provider,
        model: proposal.model,
        outcome: proposal.outcome || 'pending',
        feedback: proposal.feedback,
        edited_content: editing ? editContent : undefined,
        gemini_draft: proposal.geminiDraft,
        claude_refinement: proposal.claudeRefinement,
        enrichment: selectedLeadId ? { original_job_id: proposal.jobId, lead_id: selectedLeadId } : { original_job_id: proposal.jobId }
      });
      if (error) {
        console.error("Supabase insert error:", error);
        toast({ title: "Saved locally (DB sync failed)", variant: "destructive" });
      } else {
        toast({ title: "Proposal saved!" });
        if (selectedLeadId) {
          const { error: statusError } = await supabase
            .from('leads')
            .update({ status: 'proposal_generated' })
            .eq('id', selectedLeadId);
          if (statusError) {
            console.error("Failed to update lead status:", statusError);
          } else {
            setDbLeads((prev) => prev.filter((l) => l.id !== selectedLeadId));
            setSelectedLeadId(null);
          }
        }
      }
    } catch (e) {
      console.error("Supabase insert exception:", e);
      toast({ title: "Saved locally (DB sync failed)", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const submitFeedback = async (sentiment: "positive" | "negative") => {
    if (!result) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "proposal",
        referenceId: "current",
        referenceTitle: jobTitle,
        rating: sentiment === "positive" ? 5 : 1,
        sentiment,
        provider,
      }),
    });
    toast({ title: `Feedback recorded: ${sentiment}` });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">Proposal Generator</h2>
        <p className="text-sm text-muted-foreground">
          Generate project proposals powered by Gemini, Claude, or the Gemini → Claude dual-AI pipeline
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="generate" className="px-4 py-2 font-semibold">Generate Proposal</TabsTrigger>
          <TabsTrigger value="saved" className="px-4 py-2 font-semibold">Saved Proposals</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left: form */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Job / Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Lead Picker */}
                  <div className="flex flex-col gap-1.5 mb-2">
                    <Label className="text-xs">Select Lead from CRM (Optional)</Label>
                    <div className="flex gap-2 items-center">
                      <Select value={selectedLeadId || ""} onValueChange={handleLeadSelect}>
                        <SelectTrigger className="w-full text-xs h-9">
                          <SelectValue placeholder="Select a lead to autofill..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dbLeads.map(l => (
                            <SelectItem key={l.id} value={l.id} className="text-xs">
                              {l.name} - {l.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedLeadId && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedLeadId(null);
                            setJobTitle("");
                            setJobDescription("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Project Title *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. React Developer for Dashboard Rebuild"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Project Description</Label>
                    <Textarea
                      className="mt-1 min-h-[100px] text-xs"
                      placeholder="Paste the full job description..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Required Skills</Label>
                    <Input
                      className="mt-1"
                      placeholder="React, TypeScript, Tailwind CSS"
                      value={jobSkills}
                      onChange={(e) => setJobSkills(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Your Skills & Experience</Label>
                    <Textarea
                      className="mt-1 min-h-[60px] text-xs"
                      placeholder="5 years React, built 3 SaaS dashboards, ex-Stripe..."
                      value={userSkills}
                      onChange={(e) => setUserSkills(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Settings Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Proposal Style</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {["premium", "technical", "concise", "friendly"].map((s) => (
                        <Button
                          key={s}
                          type="button"
                          variant={style === s ? "default" : "outline"}
                          className="text-xs capitalize font-medium py-1 h-8"
                          onClick={() => setStyle(s as ProposalStyle)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">AI Provider Model</Label>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {[
                        { id: "gemini", label: "Gemini 2.0 Flash (Fast)" },
                        { id: "claude", label: "Claude 3.5 Sonnet (Refined)" },
                        { id: "gemini-claude", label: "Dual-AI Pipeline (Premium)" },
                        { id: "openrouter-free", label: "OpenRouter Free (GPT-OSS-20b)" },
                        { id: "openrouter-gemini", label: "Gemini via OpenRouter (Fast)" },
                        { id: "openrouter-claude", label: "Claude via OpenRouter (Refined)" },
                        { id: "openrouter-pipeline", label: "Dual-AI via OpenRouter (Premium)" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={cn(
                            "flex items-center justify-between text-left text-xs p-2.5 rounded border transition-colors",
                            provider === p.id
                              ? "border-primary bg-primary/5 text-primary font-semibold"
                              : "border-border hover:bg-muted/40 text-muted-foreground"
                          )}
                          onClick={() => setProvider(p.id as AIProvider)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full mt-2 font-semibold"
                    onClick={generate}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Proposal"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right: output */}
            <div className="lg:col-span-3 space-y-4">
              {!result && !loading && (
                <Card className="shadow-sm h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">No proposal yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Fill in the project details and click Generate. The Gemini → Claude pipeline produces the highest quality output.
                    </p>
                  </CardContent>
                </Card>
              )}

              {result && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm font-semibold">Generated Proposal</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-[10px] border-0", providerClass(provider))}>
                          {providerLabel(provider)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{style}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Pipeline view: show both drafts if available */}
                    {result.geminiDraft && result.claudeRefinement && (
                      <Tabs defaultValue="final">
                        <TabsList className="h-7 text-xs">
                          <TabsTrigger value="final" className="text-xs">Final (Claude)</TabsTrigger>
                          <TabsTrigger value="draft" className="text-xs">Draft (Gemini)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="final">
                          {!editing ? (
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/50 p-4 rounded-lg">
                              {result.claudeRefinement}
                            </pre>
                          ) : (
                            <Textarea
                              className="min-h-[240px] text-sm font-sans"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                            />
                          )}
                        </TabsContent>
                        <TabsContent value="draft">
                          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/50 p-4 rounded-lg text-muted-foreground">
                            {result.geminiDraft}
                          </pre>
                        </TabsContent>
                      </Tabs>
                    )}

                    {/* Single provider output */}
                    {!result.geminiDraft && !editing && (
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/50 p-4 rounded-lg">
                        {result.content}
                      </pre>
                    )}
                    {!result.geminiDraft && editing && (
                      <Textarea
                        className="min-h-[240px] text-sm font-sans"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => copyToClipboard(editing ? editContent : (result.content ?? ""))}>
                        <CopyIcon className="h-3.5 w-3.5" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setEditing((e) => !e)}>
                        <EditIcon className="h-3.5 w-3.5" /> {editing ? "Done" : "Edit"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={generate} disabled={loading}>
                        <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                      </Button>
                      <Button size="sm" className="h-8 text-xs gap-1" onClick={saveProposal}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save
                      </Button>
                    </div>
                    {/* Feedback */}
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <span className="text-xs text-muted-foreground">Rate this output:</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => submitFeedback("positive")}>
                        <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => submitFeedback("negative")}>
                        <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4 space-y-3">
          {savedProposals.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No saved proposals yet.</p>
              </CardContent>
            </Card>
          ) : (
            savedProposals.map((p) => (
              <Card key={p.id} className="shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold">{p.jobTitle || "Untitled"}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <Badge className={cn("text-[10px] border-0", providerClass(p.provider))}>
                          {providerLabel(p.provider)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{p.style}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(p.generatedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed font-sans text-muted-foreground line-clamp-3 bg-muted/40 p-3 rounded-md">
                    {p.editedContent || p.content}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs gap-1"
                    onClick={() => copyToClipboard(p.editedContent || p.content)}
                  >
                    <CopyIcon className="h-3 w-3" /> Copy
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={<div>Loading Page...</div>}>
      <ProposalsContent />
    </Suspense>
  );
}
