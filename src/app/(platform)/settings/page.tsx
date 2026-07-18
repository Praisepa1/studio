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
import { useState, useEffect, useCallback } from "react";
import { LoadingButton } from "@/components/loading-button";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name must not exceed 50 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  linkedinProfile: z.string().url({ message: "Invalid LinkedIn URL (must include http/https)." }).optional().or(z.literal('')),
  portfolioProfile: z.string().url({ message: "Invalid Portfolio URL (must include http/https)." }).optional().or(z.literal('')),
  defaultResumeInfo: z.string().max(5000, { message: "Default resume info is too long (max 5000 chars)." }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Default values before hydration
const defaultValues: Partial<ProfileFormValues> = {
  name: "",
  email: "",
  linkedinProfile: "",
  portfolioProfile: "",
  defaultResumeInfo: "",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        form.reset({
          name: meta.full_name || meta.name || user.email?.split('@')[0] || "",
          email: user.email || "",
          linkedinProfile: meta.linkedinProfile || "",
          portfolioProfile: meta.portfolioProfile || "",
          defaultResumeInfo: meta.defaultResumeInfo || "",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsClient(true);
    }
  }, [form, supabase.auth]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  
  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.name,
          linkedinProfile: data.linkedinProfile,
          portfolioProfile: data.portfolioProfile,
          defaultResumeInfo: data.defaultResumeInfo,
        }
      });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your settings have been successfully saved.",
        variant: "default", 
      });
      router.refresh(); // Refresh to update the layout header
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile.",
        variant: "destructive", 
      });
    } finally {
      setIsSaving(false);
    }
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
