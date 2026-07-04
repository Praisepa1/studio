"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { LoadingButton } from "@/components/loading-button";
import { Save } from "lucide-react";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name must not exceed 50 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  linkedinProfile: z.string().url({ message: "Invalid LinkedIn URL (must include http/https)." }).optional().or(z.literal('')),
  portfolioProfile: z.string().url({ message: "Invalid Portfolio URL (must include http/https)." }).optional().or(z.literal('')),
  defaultResumeInfo: z.string().max(5000, { message: "Default resume info is too long (max 5000 chars)." }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Mock user data - in a real app, this would come from an auth provider or API
const defaultValues: Partial<ProfileFormValues> = {
  name: "Alex Johnson",
  email: "alex.johnson@example.com",
  linkedinProfile: "https://www.linkedin.com/in/alexjohnson",
  portfolioProfile: "",
  defaultResumeInfo: "Experienced software developer with 5+ years in web technologies including React, Node.js, and Python. Proven ability to deliver high-quality software solutions in agile environments. Strong problem-solving skills and a passion for learning new technologies.",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensures form defaultValues are applied only on client
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues, // Will be correctly initialized after isClient is true
    mode: "onChange",
  });
  
  // Re-initialize form when isClient becomes true and defaultValues are available
  useEffect(() => {
    if (isClient) {
        form.reset(defaultValues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, form.reset]);


  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Saving profile data:", data);
    toast({
      title: "Profile Updated",
      description: "Your settings have been successfully saved.",
      variant: "default", 
    });
    setIsSaving(false);
  }

  if (!isClient) {
    // Render a loading state or null to avoid hydration mismatch with form's defaultValues
    return (
      <div className="space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Profile Settings</CardTitle>
            <CardDescription>Manage your account settings and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-10">
                <Save className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4 text-muted-foreground">Loading settings...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Profile Settings</CardTitle>
          <CardDescription>Manage your account settings and professional preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Full Name" {...field} className="shadow-sm focus:ring-primary focus:border-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} className="shadow-sm focus:ring-primary focus:border-primary"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedinProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn Profile URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.linkedin.com/in/yourprofile" {...field} className="shadow-sm focus:ring-primary focus:border-primary"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="portfolioProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio Website URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://myportfolio.com" {...field} className="shadow-sm focus:ring-primary focus:border-primary"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultResumeInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Resume Information</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste your general skills, experience, achievements, and other core resume content here. This will be used as a base for AI generation."
                        className="min-h-[150px] rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This information helps AI generate tailored resumes and cover letters more effectively.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <LoadingButton type="submit" isLoading={isSaving} loadingText="Saving..." className="min-w-[150px]">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </LoadingButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
