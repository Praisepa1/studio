"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export interface SearchQuery {
  keywords: string;
  targetType: "company" | "job" | "smb" | "individual" | "rfp";
  industry?: string;
  location?: string;
  providers: string[];
  maxResults: number;
}

interface DiscoveryFormProps {
  onSubmit: (query: SearchQuery) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function DiscoveryForm({ onSubmit, isLoading, disabled = false }: DiscoveryFormProps) {
  // Controlled form states
  const [keywords, setKeywords] = useState("");
  const [targetType, setTargetType] = useState<SearchQuery["targetType"]>("company");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [providers, setProviders] = useState<string[]>(["Brave"]);
  const [maxResults, setMaxResults] = useState(20);
  const [error, setError] = useState<string | null>(null);

  const handleProviderChange = (provider: string, checked: boolean) => {
    if (checked) {
      setProviders((prev) => [...prev, provider]);
    } else {
      setProviders((prev) => prev.filter((p) => p !== provider));
    }
  };

  const handleSearchClick = () => {
    // Validation: keywords required, min 3 chars
    if (!keywords || keywords.trim().length < 3) {
      setError("Keywords must be at least 3 characters.");
      return;
    }
    if (!targetType) {
      setError("Please select a target type.");
      return;
    }
    setError(null);

    onSubmit({
      keywords: keywords.trim(),
      targetType,
      industry: industry.trim() || undefined,
      location: location.trim() || undefined,
      providers,
      maxResults,
    });
  };

  const isFormDisabled = isLoading || disabled;

  return (
    <Card className="w-full shadow-sm border border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">Configure Discovery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Keywords */}
        <div className="space-y-1.5">
          <Label htmlFor="keywords" className="text-sm font-medium">
            Keywords <span className="text-destructive">*</span>
          </Label>
          <Input
            id="keywords"
            placeholder="e.g. hiring developers"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            disabled={isFormDisabled}
            className={error ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>

        {/* Target Type */}
        <div className="space-y-1.5">
          <Label htmlFor="targetType" className="text-sm font-medium">Target Type</Label>
          <Select
            value={targetType}
            onValueChange={(val: SearchQuery["targetType"]) => setTargetType(val)}
            disabled={isFormDisabled}
          >
            <SelectTrigger id="targetType" className="w-full">
              <SelectValue placeholder="Select target type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="job">Job</SelectItem>
              <SelectItem value="smb">SMB</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="rfp">RFP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Industry */}
        <div className="space-y-1.5">
          <Label htmlFor="industry" className="text-sm font-medium">Industry (Optional)</Label>
          <Input
            id="industry"
            placeholder="e.g. Logistics, Fintech"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={isFormDisabled}
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-sm font-medium">Location (Optional)</Label>
          <Input
            id="location"
            placeholder="e.g. Lagos, Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isFormDisabled}
          />
        </div>

        {/* Providers */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Search Providers</Label>
          <div className="flex flex-wrap gap-4 pt-1">
            {["Brave", "Google", "Bing"].map((provider) => {
              const isChecked = providers.includes(provider);
              return (
                <div key={provider} className="flex items-center space-x-2">
                  <Checkbox
                    id={`provider-${provider}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleProviderChange(provider, !!checked)}
                    disabled={isFormDisabled}
                  />
                  <Label
                    htmlFor={`provider-${provider}`}
                    className="text-sm font-normal cursor-pointer select-none"
                  >
                    {provider}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Max Results */}
        <div className="space-y-1.5">
          <Label htmlFor="maxResults" className="text-sm font-medium">Max Results (5 - 50)</Label>
          <Input
            id="maxResults"
            type="number"
            min={5}
            max={50}
            value={maxResults}
            onChange={(e) => setMaxResults(Math.max(5, Math.min(50, parseInt(e.target.value, 10) || 5)))}
            disabled={isFormDisabled}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSearchClick}
          disabled={isFormDisabled}
          className="w-full mt-2 font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Discovering...
            </>
          ) : (
            "Start Discovery"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
