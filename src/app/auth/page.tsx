
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LoadingButton } from "@/components/loading-button";
import { LogIn, Mail, UserPlus } from "lucide-react";
import { auth } from "@/lib/firebase"; // Import Firebase auth
import { GoogleAuthProvider, signInWithPopup, User } from "firebase/auth"; // Import GoogleAuthProvider and signInWithPopup

const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.54-.88 2.48-1.76 3.34C16.96 19.12 14.96 20 12.48 20s-4.48-.88-6.16-2.48C4.24 15.92 3.44 14 3.44 12s.8-3.92 2.48-5.52C7.84 4.88 9.92 4 12.48 4c2.08 0 3.76.72 4.96 1.84l2.72-2.72C18.4 1.2 15.84 0 12.48 0S4.64 1.84 2.48 4.08 0 8.32 0 12s2.48 7.92 4.96 10.16C7.36 24.24 9.84 24 12.48 24s5.84-.8 7.84-2.64c2.24-2 3.28-4.4 3.28-7.36 0-.56-.08-1.12-.16-1.68z" fill="currentColor"/></svg>
);

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignUpFormValues = z.infer<typeof signupSchema>;

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const initialView = searchParams.get("view") === "signup" ? "signup" : "login";
  const [activeTab, setActiveTab] = useState(initialView);

  useEffect(() => {
    setActiveTab(searchParams.get("view") === "signup" ? "signup" : "login");
  }, [searchParams]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const handleLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    console.log("Login data:", data);
    // Placeholder for actual login logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Login Successful (Mock)", description: "Welcome back!" });
    // router.push("/"); // Redirect to dashboard after successful login
    setIsLoading(false);
  };

  const handleSignupSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);
    console.log("Signup data:", data);
    // Placeholder for actual signup logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Signup Successful (Mock)", description: "Your account has been created." });
    // router.push("/"); // Redirect to dashboard after successful signup
    setIsLoading(false);
  };

  const handleGoogleAuth = async (authType: "login" | "signup") => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      toast({ 
        title: `Google ${authType} Successful`, 
        description: `Welcome, ${user.displayName || user.email}!` 
      });
      router.push("/"); // Redirect to dashboard or desired page
    } catch (error: any) {
      console.error(`Google ${authType} error:`, error);
      toast({
        variant: "destructive",
        title: `Google ${authType} Failed`,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen py-12 bg-gradient-to-br from-background via-primary/5 to-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {activeTab === "login" ? "Welcome Back!" : "Create an Account"}
          </CardTitle>
          <CardDescription>
            {activeTab === "login"
              ? "Sign in to access your JobJet dashboard."
              : "Join JobJet and supercharge your job search."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-6 pt-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <LoadingButton type="submit" isLoading={isLoading} loadingText="Signing In..." className="w-full">
                    <LogIn className="mr-2 h-5 w-5" /> Login
                  </LoadingButton>
                </form>
              </Form>
              <div className="my-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
              </div>
              <LoadingButton variant="outline" className="w-full" onClick={() => handleGoogleAuth("login")} isLoading={isGoogleLoading} loadingText="Please wait...">
                <GoogleIcon /> Sign in with Google
              </LoadingButton>
            </TabsContent>
            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-6 pt-4">
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <LoadingButton type="submit" isLoading={isLoading} loadingText="Creating Account..." className="w-full">
                    <UserPlus className="mr-2 h-5 w-5" /> Create Account
                  </LoadingButton>
                </form>
              </Form>
               <div className="my-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or sign up with
                    </span>
                  </div>
                </div>
              </div>
              <LoadingButton variant="outline" className="w-full" onClick={() => handleGoogleAuth("signup")} isLoading={isGoogleLoading} loadingText="Please wait...">
                 <GoogleIcon /> Sign up with Google
              </LoadingButton>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          {activeTab === "login" ? (
            <p>
              Don't have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("signup")}>
                Sign up
              </Button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("login")}>
                Login
              </Button>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  // Suspense boundary is required for useSearchParams usage in Next.js App Router
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}
