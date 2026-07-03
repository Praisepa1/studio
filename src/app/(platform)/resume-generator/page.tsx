"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { generateResume, type GenerateResumeOutput } from "@/ai/flows/resume-generator";
import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileTextIcon, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const resumeGeneratorFormSchema = z.object({
  jobDescription: z.string().min(50, "Job description must be at least 50 characters."),
  userDetails: z.string().min(100, "User details must be at least 100 characters (include skills, experience, education)."),
});

type ResumeGeneratorFormValues = z.infer<typeof resumeGeneratorFormSchema>;

export default function ResumeGeneratorPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [editableResume, setEditableResume] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ResumeGeneratorFormValues>({
    resolver: zodResolver(resumeGeneratorFormSchema),
    defaultValues: {
      jobDescription: "",
      userDetails: "",
    },
  });

  useEffect(() => {
    if (generatedResume) {
      setEditableResume(generatedResume);
    }
  }, [generatedResume]);

  async function onSubmit(data: ResumeGeneratorFormValues) {
    setIsLoading(true);
    setGeneratedResume(null);
    setIsEditing(false);
    try {
      const result: GenerateResumeOutput = await generateResume(data);
      setGeneratedResume(result.resume);
      toast({
        title: "Resume Generated",
        description: "AI has crafted a resume based on your input.",
      });
    } catch (error) {
      console.error("Resume Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Generating Resume",
        description: `Failed to generate resume. ${errorMessage}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    // In a real app, you might want to save this edited version
    setGeneratedResume(editableResume); // Update the "official" generated resume with edits
    setIsEditing(false);
    toast({
      title: "Resume Updated",
      description: "Your changes to the resume have been saved locally.",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">AI Resume Generator</CardTitle>
          <CardDescription>
            Provide a job description and your details, and let AI craft a tailored resume for you.
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
                name="userDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide your skills, relevant experience, education, projects, etc."
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
              <LoadingButton type="submit" isLoading={isLoading} loadingText="Generating..." className="min-w-[180px]">
                <FileTextIcon className="mr-2 h-4 w-4" />
                Generate Resume
              </LoadingButton>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {generatedResume && (
        <Card className="shadow-md">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Generated Resume</CardTitle>
              <CardDescription>Review and edit the AI-generated resume below.</CardDescription>
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
              value={isEditing ? editableResume : generatedResume}
              onChange={(e) => isEditing && setEditableResume(e.target.value)}
              readOnly={!isEditing}
              className="min-h-[400px] bg-muted/30 rounded-md p-4 border border-input text-sm focus:ring-primary focus:border-primary"
              aria-label="Generated Resume Content"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
