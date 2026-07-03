// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FileText, Zap, Copy, ThumbsUp, ThumbsDown, Edit3,
  Loader2, RefreshCw, Clock, CheckCircle2, Cpu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {  Proposal, ProposalStyle, AIProvider  } from '@/types';

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "jobjet_proposals";

function loadProposals(): Proposal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveProposals(p: Proposal[]) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function providerLabel(p: AIProvider) {
  if (p === "gemini") return "Gemini";
  if (p === "claude") return "Claude";
  return "Gemini → Claude";
}
function providerClass(p: AIProvider) {
  if (p === "gemini") return "provider-gemini";
  if (p === "claude") return "provider-claude";
  return "provider-pipeline";
}

function ProposalsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const prefillGigTitle = searchParams.get("gigTitle") ?? "";

  const [gigTitle, setGigTitle] = useState(prefillGigTitle);
  const [gigDescription, setGigDescription] = useState("");
  const [gigSkills, setGigSkills] = useState("");
  const [userSkills, setUserSkills] = useState("");
  const [style, setStyle] = useState<ProposalStyle>("premium");
  const [provider, setProvider] = useState<AIProvider>("gemini-claude");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<Proposal> | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savedProposals, setSavedProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState("generate");

  useEffect(() => {
    setSavedProposals(loadProposals());
  }, []);

  const generate = useCallback(async () => {
    if (!gigTitle.trim()) {
      toast({ variant: "destructive", title: "Add a gig title" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigTitle, gigDescription, gigSkills, userSkills, style, provider,
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
  }, [gigTitle, gigDescription, gigSkills, userSkills, style, provider, toast]);

  const saveProposal = () => {
    if (!result?.content) return;
    const proposal: Proposal = {
      id: `prop-${Date.now()}`,
      gigId: "manual",
      gigTitle,
      content: editing ? editContent : result.content,
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
    toast({ title: "Proposal saved!" });
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
        type: "proposal", referenceId: "current", referenceTitle: gigTitle,
        rating: sentiment === "positive" ? 4 : 2, sentiment, provider,
      }),
    });
    toast({ title: `Feedback recorded: ${sentiment}` });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">Proposal Generator</h2>
        <p className="text-sm text-muted-foreground">
          Generate Upwork proposals powered by Gemini, Claude, or the Gemini → Claude dual-AI pipeline
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedProposals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left: form */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Gig Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Gig Title *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. React Developer for Dashboard Rebuild"
                      value={gigTitle}
                      onChange={(e) => setGigTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Gig Description</Label>
                    <Textarea
                      className="mt-1 min-h-[100px] text-xs"
                      placeholder="Paste the full gig description..."
                      value={gigDescription}
                      onChange={(e) => setGigDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Required Skills</Label>
                    <Input
                      className="mt-1"
                      placeholder="React, TypeScript, Tailwind CSS"
                      value={gigSkills}
                      onChange={(e) => setGigSkills(e.target.value)}
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

              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-primary" /> AI Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Provider</Label>
                    <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Gemini (Fast)</SelectItem>
                        <SelectItem value="claude">Claude (Quality)</SelectItem>
                        <SelectItem value="gemini-claude">Gemini → Claude (Best)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {provider === "gemini-claude" ? "Gemini drafts, Claude refines. Requires both API keys." : ""}
                      {provider === "claude" ? "Requires ANTHROPIC_API_KEY in .env" : ""}
                      {provider === "gemini" ? "Uses GOOGLE_GENAI_API_KEY (default)" : ""}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Proposal Style</Label>
                    <Select value={style} onValueChange={(v) => setStyle(v as ProposalStyle)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium / Consultative</SelectItem>
                        <SelectItem value="concise">Concise & Punchy</SelectItem>
                        <SelectItem value="technical">Technical & Precise</SelectItem>
                        <SelectItem value="friendly">Friendly & Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={generate}
                    disabled={loading}
                  >
                    {loading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                      : <><Zap className="h-4 w-4 mr-2" /> Generate Proposal</>
                    }
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
                      Fill in the gig details and click Generate. The Gemini → Claude pipeline produces the highest quality output.
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
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => copyToClipboard(editing ? editContent : (result.content ?? ""))}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing((e) => !e)}>
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> {editing ? "Done" : "Edit"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={generate} disabled={loading}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
                      </Button>
                      <Button size="sm" className="h-8 text-xs" onClick={saveProposal}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Save
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
                      <p className="text-sm font-semibold">{p.gigTitle || "Untitled"}</p>
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
                    className="mt-2 h-7 text-xs"
                    onClick={() => copyToClipboard(p.editedContent || p.content)}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
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
    <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <ProposalsContent />
    </Suspense>
  );
}
