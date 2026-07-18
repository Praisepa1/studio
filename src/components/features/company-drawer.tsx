import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Company } from "@/types/company";
import { ScoreBadge } from "./score-badge";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Building2, MapPin, Layers, Mail, Phone, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CompanyDrawerProps {
  company: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDrawer({ company, open, onOpenChange }: CompanyDrawerProps) {
  if (!company) return null;

  const score = company.score ?? 50;
  const enrichment = company.enrichment;
  const contacts = company.contacts || [];
  const emails = contacts.filter((c: any) => c.type === 'email' || c.address);
  const phones = contacts.filter((c: any) => c.type === 'phone' || c.number);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <SheetTitle className="text-2xl font-bold">{company.name}</SheetTitle>
                  <a
                    href={company.domain?.startsWith("http") ? company.domain : `https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline font-medium"
                  >
                    {company.domain?.replace(/^https?:\/\/(www\.)?/, "")}
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </div>
                <ScoreBadge score={score} size="lg" />
              </div>
              
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {company.industry && (
                  <Badge variant="secondary" className="font-medium">
                    {company.industry}
                  </Badge>
                )}
                {company.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {company.location}
                  </span>
                )}
                {company.size && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {company.size}
                  </span>
                )}
              </div>
            </SheetHeader>

            <Separator />

            {/* AI Insight */}
            <div className="space-y-3">
              <h4 className="font-bold text-foreground">AI Positioning Insight</h4>
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20 space-y-3">
                <p className="text-sm italic text-foreground">
                  "{enrichment?.one_liner || company.description || 'No description available'}"
                </p>
                {enrichment?.pain_points && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Hypothesized Pain Points</span>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                      {enrichment.pain_points.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Contacts & Tech */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Contacts Found
                </h4>
                <div className="space-y-2">
                  {emails.slice(0, 5).map((e: any, i: number) => (
                    <div key={i} className="text-sm">{e.address || e.value}</div>
                  ))}
                  {emails.length === 0 && <span className="text-xs text-muted-foreground">No emails discovered</span>}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Tech Stack
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(company.techStack || []).map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs font-normal bg-card">
                      {t}
                    </Badge>
                  ))}
                  {!(company.techStack?.length) && <span className="text-xs text-muted-foreground">No tech detected</span>}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
