"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { smartSearch, type SmartSearchOutput } from "@/ai/flows/smart-search";
import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";

const smartSearchFormSchema = z.object({
  jobDescription: z.string().min(50, { message: "Job description must be at least 50 characters." }),
});

type SmartSearchFormValues = z.infer<typeof smartSearchFormSchema>;

export default function SmartSearchPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SmartSearchOutput | null>(null);

  const form = useForm<SmartSearchFormValues>({
    resolver: zodResolver(smartSearchFormSchema),
    defaultValues: {
      jobDescription: "",
    },
  });

  async function onSubmit(data: SmartSearchFormValues) {
    setIsLoading(true);
    setSearchResult(null);
    try {
      const result = await smartSearch(data);
      setSearchResult(result);
      toast({
        title: "Smart Search Complete",
        description: "AI has generated filter suggestions.",
      });
    } catch (error) {
      console.error("Smart Search error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Generating Suggestions",
        description: `Failed to generate search suggestions. ${errorMessage}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Smart Search Filter Suggestions</CardTitle>
          <CardDescription>
            Paste a job description below, and our AI will suggest relevant search filters to help you find similar jobs.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="jobDescriptionTextarea">Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        id="jobDescriptionTextarea"
                        placeholder="Paste the full job description here..."
                        className="min-h-[200px] rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <LoadingButton type="submit" isLoading={isLoading} loadingText="Analyzing..." className="min-w-[180px]">
                <Lightbulb className="mr-2 h-4 w-4" />
                Suggest Filters
              </LoadingButton>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {searchResult && searchResult.searchFilters && searchResult.searchFilters.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Suggested Search Filters</CardTitle>
            <CardDescription>Use these terms to refine your job search on platforms like LinkedIn or Upwork.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchResult.searchFilters.map((filter, index) => (
                <Badge key={index} variant="secondary" className="text-sm px-3 py-1.5 rounded-full shadow-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                  {filter}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {searchResult && searchResult.searchFilters && searchResult.searchFilters.length === 0 && (
         <Card className="shadow-md">
          <CardHeader>
            <CardTitle>No Specific Filters Found</CardTitle>
            <CardDescription>The AI could not extract specific filter terms. Try a more detailed job description or check the input.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
