"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Cpu, Zap, CheckCircle2, AlertCircle, Loader2, Copy,
  ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AIProvider } from "@/types";
import { cn } from "@/lib/utils";

function ProviderStatusCard({
  name, model, available, description, envKey,
}: {
  name: string;
  model: string;
  available: boolean;
  description: string;
  envKey: string;
}) {
  return (
    <Card className={cn("shadow-sm border-2", available ? "border-green-200 dark:border-green-800" : "border-amber-200 dark:border-amber-800")}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {available
              ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            }
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">{model}</p>
            </div>
          </div>
          <Badge className={available ? "score-high border-0" : "score-mid border-0"}>
            {available ? "Active" : "Not configured"}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        {!available && (
          <div className="mt-3 rounded-md bg-muted p-2.5 text-xs text-muted-foreground font-mono">
            Add <span className="text-primary font-semibold">{envKey}</span> to your .env file
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  template: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "proposal-concise",
    label: "Proposal — Concise",
    description: "Short, punchy Upwork proposal (150-200 words)",
    template: "Write a concise Upwork proposal for a [GIG TITLE] role. Skills: [SKILLS]. Client needs: [PAIN POINTS]. Keep it under 200 words, lead with their problem, end with a low-friction CTA.",
  },
  {
    id: "proposal-premium",
    label: "Proposal — Premium",
    description: "Consultative premium proposal (250-320 words)",
    template: "You are a high-value consultant. Write a premium Upwork proposal for [GIG TITLE]. Diagnose their business problem, position as an expert, include 2-3 proof points. Be specific, no filler.",
  },
  {
    id: "outreach-first",
    label: "Outreach — First Message",
    description: "Personalized LinkedIn/email first message",
    template: "Write a personalized first outreach message to [NAME], [ROLE] at [COMPANY]. They likely need [PAIN POINT]. Your offer: [VALUE PROP]. Channel: LinkedIn DM. Tone: direct. Under 140 words.",
  },
  {
    id: "lead-research",
    label: "Lead Research",
    description: "Client intelligence analysis",
    template: "Analyze this lead: [NAME] is [ROLE] at [COMPANY]. Bio: [BIO]. Return their likely pain points, communication style, best outreach angle, and confidence level for each inference.",
  },
  {
    id: "gig-analysis",
    label: "Gig Analysis",
    description: "Upwork gig intelligence breakdown",
    template: "Analyze this Upwork gig: [TITLE]. Description: [DESCRIPTION]. Return: pain points, client tone, best proposal angle, conversion likelihood, and recommended proposal style.",
  },
];

interface GenerationLog {
  id: string;
  provider: AIProvider;
  prompt: string;
  output: string;
  duration: number;
  timestamp: string;
}

export default function AIStudioPage() {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const activeTemplate = PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate);

  const runGeneration = async () => {
    const prompt = customPrompt.trim();
    if (!prompt) {
      toast({ variant: "destructive", title: "Enter a prompt first" });
      return;
    }
    setLoading(true);
    const start = Date.now();
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigTitle: "AI Studio Test",
          gigDescription: prompt,
          gigSkills: "",
          userSkills: "",
          style: "concise",
          provider: selectedProvider,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const outputText = data.content;
      setOutput(outputText);

      const log: GenerationLog = {
        id: `log-${Date.now()}`,
        provider: selectedProvider,
        prompt,
        output: outputText,
        duration: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [log, ...prev.slice(0, 19)]);
      toast({ title: "Generation complete" });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">AI Studio</h2>
        <p className="text-sm text-muted-foreground">
          Configure providers, test prompts, and monitor generation quality
        </p>
      </div>

      {/* Provider Status */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Provider Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ProviderStatusCard
            name="Gemini (Google AI)"
            model="gemini-2.0-flash"
            available={true}
            description="Fast generation, broad knowledge. Used for planning, first-pass drafts, and classification."
            envKey="GOOGLE_GENAI_API_KEY"
          />
          <ProviderStatusCard
            name="Claude (Anthropic)"
            model="claude-opus-4-6"
            available={!!process.env.ANTHROPIC_API_KEY}
            description="Deeper writing quality, persuasion, structured reasoning. Used for proposal refinement and outreach personalization."
            envKey="ANTHROPIC_API_KEY"
          />
        </div>
      </div>

      {/* Prompt Playground */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Prompt Playground</CardTitle>
          <CardDescription>Test prompts against any configured provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Provider</Label>
              <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as AIProvider)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="gemini-claude">Gemini → Claude Pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Load Template</Label>
              <Select value={selectedTemplate} onValueChange={(v) => {
                setSelectedTemplate(v);
                const t = PROMPT_TEMPLATES.find((p) => p.id === v);
                if (t) setCustomPrompt(t.template);
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeTemplate && (
            <div className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/20 p-3 text-xs">
              <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{activeTemplate.description}</span>
            </div>
          )}

          <div>
            <Label className="text-xs">Prompt</Label>
            <Textarea
              className="mt-1 min-h-[140px] text-sm font-mono"
              placeholder="Enter your prompt here, or load a template above..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>

          <Button onClick={runGeneration} disabled={loading} className="w-full sm:w-auto">
            {loading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
              : <><Zap className="h-4 w-4 mr-2" /> Run Generation</>
            }
          </Button>

          {output && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Output</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(output); toast({ title: "Copied" }); }}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/50 p-4 rounded-lg border">
                {output}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt Templates Reference */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Prompt Template Library</CardTitle>
          <CardDescription>All built-in prompt templates used across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PROMPT_TEMPLATES.map((t) => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => {
                  setCustomPrompt(t.template);
                  setSelectedTemplate(t.id);
                }}>
                  Use
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Generation Logs */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Generation Logs ({logs.length})</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowLogs((v) => !v)}>
              {showLogs ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide</> : <><ChevronDown className="h-3 w-3 mr-1" /> Show</>}
            </Button>
          </div>
        </CardHeader>
        {showLogs && (
          <CardContent className="space-y-2">
            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground">No logs yet. Run a generation to see logs here.</p>
            )}
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn("border-0", log.provider === "gemini" ? "provider-gemini" : log.provider === "claude" ? "provider-claude" : "provider-pipeline")}>
                    {log.provider}
                  </Badge>
                  <span className="text-muted-foreground">{log.duration}ms</span>
                  <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-muted-foreground truncate">Prompt: {log.prompt.slice(0, 80)}...</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
