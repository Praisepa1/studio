
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Lightbulb, Users, FileText, Mail, Send, SearchCheck, UserCheck, LogIn, Sparkles } from "lucide-react";

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  href,
  comingSoon,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  comingSoon?: boolean;
}) => (
  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
    <CardHeader className="flex-row items-center gap-4 pb-4">
      <div className="bg-primary/10 p-3 rounded-full">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <CardTitle className="text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
    <CardContent className="pt-0">
       <Button asChild variant="outline" className="w-full group">
        <Link href={href}>
          {comingSoon ? "Learn More" : "Explore Feature"}
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </Button>
      {comingSoon && <p className="text-xs text-center text-amber-600 mt-2">Coming Soon!</p>}
    </CardContent>
  </Card>
);

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Land Your Dream Job <span className="text-primary">Faster</span> with JobJet
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Your AI-powered copilot for smart job searching, profile optimization, and creating standout applications for platforms like Upwork & LinkedIn.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="shadow-lg hover:shadow-primary/40 transition-shadow">
              <Link href="/auth?view=signup"> 
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="shadow-md">
              <Link href="/auth?view=login"> 
                <LogIn className="mr-2 h-5 w-5" /> Login
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why JobJet? Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-foreground">Why Choose JobJet?</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Stop wasting time on tedious tasks. JobJet empowers you to focus on what truly matters – landing the perfect job.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Work Smarter, Not Harder</h3>
              <p className="text-muted-foreground">Leverage AI to automate repetitive tasks and gain a competitive edge in your job search.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Stand Out from the Crowd</h3>
              <p className="text-muted-foreground">Craft perfectly tailored resumes, cover letters, and profiles that capture attention.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Maximize Your Opportunities</h3>
              <p className="text-muted-foreground">Discover relevant jobs and optimize your applications for higher success rates.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Powerful AI Tools at Your Fingertips</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={SearchCheck}
              title="Smart Search"
              description="Discover hidden job gems with AI-driven matching and filter suggestions."
              href="/smart-search"
            />
            <FeatureCard
              icon={UserCheck}
              title="Profile Optimizer"
              description="Craft compelling Upwork & LinkedIn profiles tailored to specific job descriptions."
              href="/profile-optimizer"
            />
            <FeatureCard
              icon={FileText}
              title="Resume Generator"
              description="Generate professional, ATS-friendly resumes that highlight your strengths."
              href="/resume-generator"
            />
            <FeatureCard
              icon={Mail}
              title="Cover Letter Generator"
              description="Write persuasive and personalized cover letters in minutes, not hours."
              href="/cover-letter-generator"
            />
            <FeatureCard
              icon={Send}
              title="Automated Application"
              description="Streamline job submissions directly to platforms (feature in development)."
              href="/automated-application"
              comingSoon
            />
             <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center text-center p-6 md:p-8 bg-primary/5">
              <Image 
                src="https://placehold.co/300x200.png" 
                alt="AI working on tasks" 
                width={300} 
                height={200} 
                className="rounded-lg mb-6 shadow-md"
                data-ai-hint="AI assistant work"
              />
              <h3 className="text-xl font-semibold mb-2 text-primary">And More to Come!</h3>
              <p className="text-muted-foreground">We're constantly innovating to bring you the best AI job search tools.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Get Started in 3 Simple Steps</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="relative mb-4">
                <div className="absolute -top-2 -left-2 text-6xl font-bold text-primary/20">01</div>
                <Users className="h-12 w-12 text-primary mx-auto mb-2 relative" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Connect & Configure</h3>
              <p className="text-muted-foreground">Link your job platform accounts (conceptually) and set up your core profile information in JobJet settings.</p>
            </div>
            <div className="p-6">
               <div className="relative mb-4">
                <div className="absolute -top-2 -left-2 text-6xl font-bold text-primary/20">02</div>
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-2 relative" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Utilize AI Tools</h3>
              <p className="text-muted-foreground">Use Smart Search, generate resumes, cover letters, and optimize your professional profiles with AI assistance.</p>
            </div>
            <div className="p-6">
              <div className="relative mb-4">
                <div className="absolute -top-2 -left-2 text-6xl font-bold text-primary/20">03</div>
                <Send className="h-12 w-12 text-primary mx-auto mb-2 relative" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Apply with Confidence</h3>
              <p className="text-muted-foreground">Submit high-quality applications quickly and efficiently, maximizing your chances of success.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Supercharge Your Job Hunt?</h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Join JobJet today and transform your job search experience. It's time to let AI work for you.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-primary-foreground bg-background hover:bg-background/90 shadow-lg">
            <Link href="/auth?view=signup"> 
              Sign Up Now & Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer Placeholder - The AppShell might already provide a footer or this can be enhanced */}
      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} JobJet. All rights reserved.</p>
          <p className="mt-1">
            <Link href="#" className="hover:text-primary">Privacy Policy</Link> | <Link href="#" className="hover:text-primary">Terms of Service</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
