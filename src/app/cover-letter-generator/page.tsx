"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { generateCoverLetter, type GenerateCoverLetterOutput } from "@/ai/flows/cover-letter-generator";
import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MailIcon, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const coverLetterFormSchema = z.object({
  jobDescription: z.string().min(50, "Job description must be at least 50 characters."),
  userName: z.string().min(2, "User name must be at least 2 characters."),
  userSkills: z.string().min(20, "Please list some key skills (at least 20 characters)."),
  userExperience: z.string().min(50, "Briefly describe relevant experience (at least 50 characters)."),
});

type CoverLetterFormValues = z.infer<typeof coverLetterFormSchema>;

export default function CoverLetterGeneratorPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);


  const form = useForm<CoverLetterFormValues>({
    resolver: zodResolver(coverLetterFormSchema),
    defaultValues: {
      jobDescription: "",
      userName: "",
      userSkills: "",
      userExperience: "",
    },
  });

  useEffect(() => {
    if (generatedCoverLetter) {
      setEditableCoverLetter(generatedCoverLetter);
    }
  }, [generatedCoverLetter]);

  async function onSubmit(data: CoverLetterFormValues) {
    setIsLoading(true);
    setGeneratedCoverLetter(null);
    setIsEditing(false);
    try {
      const result: GenerateCoverLetterOutput = await generateCoverLetter(data);
      setGeneratedCoverLetter(result.coverLetter);
      toast({
        title: "Cover Letter Generated",
        description: "AI has drafted a cover letter for you.",
      });
    } catch (error) {
      console.error("Cover Letter Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Generating Cover Letter",
        description: `Failed to generate cover letter. ${errorMessage}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setGeneratedCoverLetter(editableCoverLetter);
    setIsEditing(false);
    toast({
      title: "Cover Letter Updated",
      description: "Your changes have been saved locally.",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">AI Cover Letter Generator</CardTitle>
          <CardDescription>
            Craft a compelling cover letter tailored to a specific job description using AI.
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
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Alex Johnson" {...field} className="shadow-sm focus:ring-primary focus:border-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Key Skills</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., JavaScript, React, Project Management, Agile Methodologies"
                        className="min-h-[100px] rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Relevant Experience (Brief)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 5 years developing web applications, Led a team of 3 engineers..."
                        className="min-h-[120px] rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <LoadingButton type="submit" isLoading={isLoading} loadingText="Generating..." className="min-w-[200px]">
                <MailIcon className="mr-2 h-4 w-4" />
                Generate Cover Letter
              </LoadingButton>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {generatedCoverLetter && (
         <Card className="shadow-md">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Generated Cover Letter</CardTitle>
              <CardDescription>Review and edit the AI-generated cover letter.</CardDescription>
            </div>
            {!isEditing ? (
              <Button variant="outline" onClick={handleEdit} className="shadow-sm">
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </Button>
            ) : (
              <Button onClick={handleSaveEdit} className="shadow-sm bg-green-600 hover:bg-green-700">
                Save Changes
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Textarea
              value={isEditing ? editableCoverLetter : generatedCoverLetter}
              onChange={(e) => isEditing && setEditableCoverLetter(e.target.value)}
              readOnly={!isEditing}
              className="min-h-[400px] bg-muted/30 rounded-md p-4 border border-input text-sm whitespace-pre-wrap focus:ring-primary focus:border-primary"
              aria-label="Generated Cover Letter Content"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
