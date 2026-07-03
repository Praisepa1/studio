"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bot, ExternalLink } from "lucide-react";
import Image from "next/image";

export default function AutomatedApplicationPage() {
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <div className="relative h-56 w-full">
            <Image 
                src="https://placehold.co/1200x400.png" 
                alt="Abstract representation of automated processes"
                layout="fill"
                objectFit="cover"
                className="opacity-80"
                data-ai-hint="automation abstract"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Automated Application</h1>
                <p className="text-lg md:text-xl text-muted-foreground mt-1">Streamline your job submissions (Feature Coming Soon)</p>
            </div>
        </div>
        <CardContent className="p-6 md:p-8">
          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-primary prose-a:text-primary hover:prose-a:text-accent">
            <p className="lead text-foreground/90">
              This upcoming feature aims to revolutionize how you apply for jobs by enabling direct application submissions to platforms like Upwork and LinkedIn.
              Imagine JobJet intelligently filling out application forms and submitting your pre-approved resume and cover letter for you!
            </p>
            
            <h3 className="mt-8 text-2xl">How It Might Work (Conceptual)</h3>
            <ul className="text-foreground/80 space-y-2">
              <li>Securely connect your Upwork and LinkedIn accounts through JobJet.</li>
              <li>Create and manage application templates (customized resumes, cover letters, common Q&A).</li>
              <li>Review and approve AI-identified job matches for automated application.</li>
              <li>JobJet&apos;s AI would intelligently populate forms based on job requirements and your profile data.</li>
              <li>Receive real-time notifications upon successful submission or if manual intervention is required for specific questions.</li>
            </ul>

            <div className="mt-8 p-4 border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800 rounded-md shadow">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 mr-3 mt-0.5 text-yellow-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg">Important Considerations & Challenges</h4>
                  <p className="text-sm mt-1">
                    Direct platform automation is a highly complex feature. It requires robust solutions for handling user credentials securely, interacting with platform APIs (where available and permitted), or employing sophisticated browser automation techniques. Crucially, any such feature must meticulously respect platform Terms of Service to ensure user accounts remain in good standing.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="mt-6 text-foreground/80">
              While full automation is a significant undertaking and a future goal, you can already leverage JobJet&apos;s existing AI tools to generate high-quality resumes and cover letters. This preparation will allow you to apply manually with significantly greater speed, efficiency, and impact.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
                <Button disabled size="lg" className="w-full sm:w-auto shadow-md">
                    <Bot className="mr-2 h-5 w-5" /> Connect Upwork (Coming Soon)
                </Button>
                <Button disabled size="lg" className="w-full sm:w-auto shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    Connect LinkedIn (Coming Soon)
                </Button>
            </div>
            <p className="mt-6 text-sm text-center text-muted-foreground">
              We are dedicated to exploring safe, ethical, and effective ways to bring this powerful automation to JobJet. Stay tuned for future updates!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
