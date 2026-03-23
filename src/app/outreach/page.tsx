"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send, Zap, Copy, ThumbsUp, ThumbsDown, Edit3,
  Loader2, RefreshCw, Clock, CheckCircle2, Cpu, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { OutreachMessage, OutreachType, OutreachChannel, OutreachTone, AIProvider } from "@/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "jobjet_outreach";

function loadMessages(): OutreachMessage[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveMessages(m: OutreachMessage[]) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
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

function OutreachContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const prefillName = searchParams.get("leadName") ?? "";

  const [leadName, setLeadName] = useState(prefillName);
  const [leadCompany, setLeadCompany] = useState("");
  const [leadRole, setLeadRole] = useState("");
  const [leadBio, setLeadBio] = useState("");
  const [offerValue, setOfferValue] = useState("");
  const [type, setType] = useState<OutreachType>("first_message");
  const [channel, setChannel] = useState<OutreachChannel>("linkedin");
  const [tone, setTone] = useState<OutreachTone>("direct");
  const [provider, setProvider] = useState<AIProvider>("gemini-claude");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<OutreachMessage> | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saved, setSaved] = useState<OutreachMessage[]>([]);
  const [activeTab, setActiveTab] = useState("generate");

  useEffect(() => { setSaved(loadMessages()); }, []);

  const generate = useCallback(async () => {
    if (!leadName.trim()) {
      toast({ variant: "destructive", title: "Add a lead name" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName, leadCompany, leadRole, leadBio, offerValue,
          type, channel, tone, provider,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setEditContent(data.content);
      toast({ title: "Message generated!" });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Generation failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  }, [leadName, leadCompany, leadRole, leadBio, offerValue, type, channel, tone, provider, toast]);

  const saveMessage = () => {
    if (!result?.content) return;
    const msg: OutreachMessage = {
      id: `out-${Date.now()}`,
      leadId: "manual",
      leadName,
      type,
      channel,
      tone,
      content: editing ? editContent : (result.content ?? ""),
      provider,
      model: result.model,
      generatedAt: new Date().toISOString(),
      geminiDraft: result.geminiDraft,
      claudeRefinement: result.claudeRefinement,
    };
    const updated = [msg, ...saved];
    setSaved(updated);
    saveMessages(updated);
    toast({ title: "Message saved!" });
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const submitFeedback = async (sentiment: "positive" | "negative") => {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "outreach", referenceId: "current", referenceTitle: `${type} to ${leadName}`,
        rating: sentiment === "positive" ? 4 : 2, sentiment, provider,
      }),
    });
    toast({ title: `Feedback recorded: ${sentiment}` });
  };

  const typeLabels: Record<OutreachType, string> = {
    first_message: "First Message",
    follow_up: "Follow-up",
    closing: "Closing",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">Outreach Generator</h2>
        <p className="text-sm text-muted-foreground">
          Create personalized first messages, follow-ups, and closing messages powered by AI
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="saved">Saved ({saved.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Form */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Lead Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Lead Name *</Label>
                    <Input className="mt-1" placeholder="Sarah Chen" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Company</Label>
                      <Input className="mt-1" placeholder="NexaScale" value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Input className="mt-1" placeholder="CEO" value={leadRole} onChange={(e) => setLeadRole(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Bio / Public Info</Label>
                    <Textarea className="mt-1 min-h-[70px] text-xs" placeholder="Paste their bio, LinkedIn about section, or key public info..." value={leadBio} onChange={(e) => setLeadBio(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Your Offer / Value Proposition</Label>
                    <Textarea className="mt-1 min-h-[60px] text-xs" placeholder="What specific value do you bring to this person?" value={offerValue} onChange={(e) => setOfferValue(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-primary" /> Message Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Message Type</Label>
                      <Select value={type} onValueChange={(v) => setType(v as OutreachType)}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first_message">First Message</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                          <SelectItem value="closing">Closing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Channel</Label>
                      <Select value={channel} onValueChange={(v) => setChannel(v as OutreachChannel)}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linkedin">LinkedIn DM</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="dm">Other DM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Tone</Label>
                    <Select value={tone} onValueChange={(v) => setTone(v as OutreachTone)}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">AI Provider</Label>
                    <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Gemini (Fast)</SelectItem>
                        <SelectItem value="claude">Claude (Quality)</SelectItem>
                        <SelectItem value="gemini-claude">Gemini → Claude (Best)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={generate} disabled={loading}>
                    {loading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                      : <><Zap className="h-4 w-4 mr-2" /> Generate Message</>
                    }
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Output */}
            <div className="lg:col-span-3 space-y-4">
              {!result && !loading && (
                <Card className="shadow-sm h-full">
                  <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <Send className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">No message yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Fill in the lead details and click Generate to create a personalized outreach message.
                    </p>
                  </CardContent>
                </Card>
              )}

              {result && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm font-semibold">{typeLabels[type]} — {channel}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-[10px] border-0", providerClass(provider))}>
                          {providerLabel(provider)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{tone}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.geminiDraft && result.claudeRefinement ? (
                      <Tabs defaultValue="final">
                        <TabsList className="h-7 text-xs">
                          <TabsTrigger value="final" className="text-xs">Final (Claude)</TabsTrigger>
                          <TabsTrigger value="draft" className="text-xs">Draft (Gemini)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="final">
                          {!editing ? (
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/50 p-4 rounded-lg">{result.claudeRefinement}</pre>
                          ) : (
                            <Textarea className="min-h-[200px] text-sm font-sans" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                          )}
                        </TabsContent>
                        <TabsContent value="draft">
                          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/50 p-4 rounded-lg text-muted-foreground">{result.geminiDraft}</pre>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      !editing
                        ? <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/50 p-4 rounded-lg">{result.content}</pre>
                        : <Textarea className="min-h-[200px] text-sm font-sans" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => copyText(editing ? editContent : (result.content ?? ""))}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing((e) => !e)}>
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> {editing ? "Done" : "Edit"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={generate} disabled={loading}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
                      </Button>
                      <Button size="sm" className="h-8 text-xs" onClick={saveMessage}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                    </div>
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
          {saved.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No saved messages yet.</p>
              </CardContent>
            </Card>
          ) : (
            saved.map((m) => (
              <Card key={m.id} className="shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold">{m.leadName ?? "Unknown"}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <Badge className={cn("text-[10px] border-0", providerClass(m.provider))}>
                          {providerLabel(m.provider)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{m.type.replace("_", " ")}</Badge>
                        <Badge variant="outline" className="text-[10px]">{m.channel}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(m.generatedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-xs font-sans text-muted-foreground line-clamp-3 bg-muted/40 p-3 rounded-md">
                    {m.editedContent || m.content}
                  </pre>
                  <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => copyText(m.editedContent || m.content)}>
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

export default function OutreachPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <OutreachContent />
    </Suspense>
  );
}
