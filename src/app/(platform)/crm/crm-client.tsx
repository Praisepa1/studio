"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Users, Building, Mail, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface CrmClientProps {
  initialCompanies: any[];
  initialLeads: any[];
}

export default function CrmClient({ initialCompanies, initialLeads }: CrmClientProps) {
  const [activeTab, setActiveTab] = useState("companies");

  // Filter States
  const [scoreRange, setScoreRange] = useState<number[]>([0, 100]);
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection States
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // ─── Filter Logic ──────────────────────────────────────────

  const filteredCompanies = initialCompanies.filter((c) => {
    const score = c.score ?? 50;
    const matchesScore = score >= scoreRange[0] && score <= scoreRange[1];
    const matchesTier = tierFilter === "all" || c.tier === tierFilter;

    const isHiring = c.isActivelyHiring === true || c.hiringStatus === "active";
    const status = isHiring ? "active" : (c.hiringStatus === "passive" ? "passive" : "unknown");
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesScore && matchesTier && matchesStatus;
  });

  const filteredLeads = initialLeads.filter((l) => {
    const score = l.outreachScore ?? 50;
    const matchesScore = score >= scoreRange[0] && score <= scoreRange[1];
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;

    return matchesScore && matchesStatus;
  });

  // ─── Bulk Select Actions ───────────────────────────────────

  const toggleSelectCompany = (id: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCompanies = () => {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(filteredCompanies.map((c) => c.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLeads = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((l) => l.id));
    }
  };

  // ─── Export Actions ────────────────────────────────────────

  const handleExportSelected = () => {
    const ids = activeTab === "companies" ? selectedCompanies : selectedLeads;
    if (ids.length === 0) {
      toast({
        title: "Export Cancelled",
        description: "Please select at least one record to export.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Exporting Selected Records",
      description: `Downloading CSV for ${ids.length} selected ${activeTab}...`,
    });

    // Mock direct download triggers
    window.open(`/api/export?type=${activeTab}&ids=${ids.join(",")}`, "_blank");
  };

  const handleExportAll = () => {
    toast({
      title: "Exporting All Records",
      description: `Downloading consolidated CSV for all ${activeTab}...`,
    });
    window.open(`/api/export?type=${activeTab}&all=true`, "_blank");
  };

  // ─── Summaries ─────────────────────────────────────────────

  // Companies summaries
  const compTotalCount = initialCompanies.length;
  const compHighPriority = initialCompanies.filter((c) => c.tier === "high_priority").length;
  const compActiveHiring = initialCompanies.filter((c) => c.isActivelyHiring === true || c.hiringStatus === "active").length;

  // Leads summaries
  const leadTotalCount = initialLeads.length;
  const leadNotContacted = initialLeads.filter((l) => l.status === "new").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        // Reset filters & selects on tab switch
        setScoreRange([0, 100]);
        setTierFilter("all");
        setStatusFilter("all");
        setSelectedCompanies([]);
        setSelectedLeads([]);
      }} className="w-full">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="companies" className="px-4 py-2 font-semibold">Companies</TabsTrigger>
            <TabsTrigger value="leads" className="px-4 py-2 font-semibold">Leads</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSelected}
              disabled={activeTab === "companies" ? selectedCompanies.length === 0 : selectedLeads.length === 0}
              className="text-xs font-semibold gap-1.5 h-9"
            >
              <Download className="h-3.5 w-3.5" />
              Export Selected
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportAll}
              className="text-xs font-semibold gap-1.5 h-9"
            >
              <Download className="h-3.5 w-3.5" />
              Export All
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card border rounded-lg p-5 mt-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Score Range</span>
              <span>{scoreRange[0]} - {scoreRange[1]}</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={scoreRange}
              onValueChange={setScoreRange}
              className="pt-2"
            />
          </div>

          {activeTab === "companies" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter by Tier</label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="high_priority">High Priority</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="h-4" /> // Spacing matching columns
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter by Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {activeTab === "companies" ? (
                  <>
                    <SelectItem value="all">All Hiring Status</SelectItem>
                    <SelectItem value="active">Active Hiring</SelectItem>
                    <SelectItem value="passive">Passive Hiring</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="all">All Outreach Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Companies Tab Content */}
        <TabsContent value="companies" className="mt-4 space-y-4">
          <div className="text-sm font-medium text-muted-foreground bg-primary/5 border border-primary/10 px-4 py-3 rounded-lg flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            <span>{compTotalCount} companies tracked. {compHighPriority} high priority. {compActiveHiring} actively hiring.</span>
          </div>

          <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3.5 text-center w-12">
                      <Checkbox
                        checked={filteredCompanies.length > 0 && selectedCompanies.length === filteredCompanies.length}
                        onCheckedChange={toggleSelectAllCompanies}
                      />
                    </th>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5 text-center">Score</th>
                    <th className="px-6 py-3.5">Tier</th>
                    <th className="px-6 py-3.5">Hiring Status</th>
                    <th className="px-6 py-3.5">Pitch Angle</th>
                    <th className="px-6 py-3.5 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCompanies.map((c) => {
                    const isSelected = selectedCompanies.includes(c.id);
                    const isHiring = c.isActivelyHiring === true || c.hiringStatus === "active";
                    const isPassive = c.hiringStatus === "passive";
                    const pitch = c.enrichment?.pitch_angle || "No AI pitch mapped yet.";
                    
                    return (
                      <tr key={c.id} className={isSelected ? "bg-primary/5 hover:bg-primary/5" : "hover:bg-muted/30"}>
                        <td className="px-4 py-4 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectCompany(c.id)}
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground">
                          {c.name}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold">
                          {c.score ?? 50}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="rounded capitalize text-[10px]">
                            {(c.tier || "neutral").replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {isHiring ? (
                            <Badge className="bg-green-500 rounded text-[10px]">Active</Badge>
                          ) : isPassive ? (
                            <Badge className="bg-yellow-500 rounded text-[10px]">Passive</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground rounded text-[10px]">Unknown</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground max-w-[220px] truncate" title={pitch}>
                          {pitch}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCompanies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No companies found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Leads Tab Content */}
        <TabsContent value="leads" className="mt-4 space-y-4">
          <div className="text-sm font-medium text-muted-foreground bg-primary/5 border border-primary/10 px-4 py-3 rounded-lg flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>{leadTotalCount} leads tracked. {leadNotContacted} not yet contacted.</span>
          </div>

          <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3.5 text-center w-12">
                      <Checkbox
                        checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                        onCheckedChange={toggleSelectAllLeads}
                      />
                    </th>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Company</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5 text-center">Outreach Score</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map((l) => {
                    const isSelected = selectedLeads.includes(l.id);
                    const companyName = l.companyName || l.company || "Unknown Company";
                    return (
                      <tr key={l.id} className={isSelected ? "bg-primary/5 hover:bg-primary/5" : "hover:bg-muted/30"}>
                        <td className="px-4 py-4 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectLead(l.id)}
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground">
                          {l.name}
                        </td>
                        <td className="px-6 py-4 font-medium text-primary">
                          {companyName}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {l.title}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold">
                          {l.outreachScore ?? 50}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="rounded capitalize text-[10px]">
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {l.email ? (
                            <a href={`mailto:${l.email}`} className="text-primary hover:underline flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {l.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/45 italic">Not found</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(l.updatedAt || l.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        No leads found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
