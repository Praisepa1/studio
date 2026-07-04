"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { profileOptimizer, type ProfileOptimizerOutput } from "@/ai/flows/profile-optimizer";
import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ListChecks } from "lucide-react";

const profileOptimizerFormSchema = z.object({
  platform: z.enum(["Other", "LinkedIn"], { required_error: "Please select a platform." }),
  profileText: z.string().min(100, "Profile text must be at least 100 characters."),
  jobDescription: z.string().min(50, "Job description must be at least 50 characters."),
});

type ProfileOptimizerFormValues = z.infer<typeof profileOptimizerFormSchema>;

export default function ProfileOptimizerPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<ProfileOptimizerOutput | null>(null);

  const form = useForm<ProfileOptimizerFormValues>({
    resolver: zodResolver(profileOptimizerFormSchema),
    defaultValues: {
      platform: undefined,
      profileText: "",
      jobDescription: "",
    },
  });

  async function onSubmit(data: ProfileOptimizerFormValues) {
    setIsLoading(true);
    setOptimizationResult(null);
    try {
      const result = await profileOptimizer({
        ...data,
        platform: data.platform === "Other" ? ("Upwork" as any) : data.platform
      });
      setOptimizationResult(result);
      toast({
        title: "Profile Optimization Complete",
        description: "AI has generated optimization suggestions.",
      });
    } catch (error) {
      console.error("Profile Optimizer error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Optimizing Profile",
        description: `Failed to optimize profile. ${errorMessage}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">AI Profile Optimizer</CardTitle>
          <CardDescription>
            Optimize your LinkedIn or other portfolio profile based on a target job description.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="shadow-sm focus:ring-primary focus:border-primary">
                          <SelectValue placeholder="Select a platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Other">Other Portfolio</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="profileText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Profile Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste your current profile overview/summary here..."
                        className="min-h-[150px] rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the target job description here..."
                        className="min-h-[150px] rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <LoadingButton type="submit" isLoading={isLoading} loadingText="Optimizing..." className="min-w-[180px]">
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize Profile
              </LoadingButton>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {optimizationResult && (
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> Optimized Profile</CardTitle>
              <CardDescription>Review the AI-suggested improvements for your profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={optimizationResult.optimizedProfile}
                className="min-h-[200px] bg-muted/50 rounded-md p-4 border border-input text-sm"
              />
            </CardContent>
          </Card>

          {optimizationResult.suggestions && optimizationResult.suggestions.length > 0 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Specific Suggestions</CardTitle>
                <CardDescription>Consider these actionable tips to further enhance your profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
                  {optimizationResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
