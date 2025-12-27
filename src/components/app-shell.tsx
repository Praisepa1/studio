
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  SearchCheck,
  UserCheck,
  FileText,
  Mail,
  Send,
  Settings as SettingsIcon,
  Briefcase,
  PanelLeft,
  LogOut,
} from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";


const Logo = () => (
  <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary whitespace-nowrap">
    <Briefcase className="h-6 w-6 stroke-[1.5px]" />
    <span className="group-data-[collapsible=icon]:hidden group-[[data-sidebar=sidebar][data-mobile=true]]/sidebar-wrapper:inline">JobJet</span>
  </Link>
);

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  pathname: string;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label, pathname }) => (
  <SidebarMenuItem>
    <Link href={href} legacyBehavior passHref>
      <SidebarMenuButton isActive={pathname === href} tooltip={label}>
        <Icon className="stroke-[1.5px]" />
        <span>{label}</span>
      </SidebarMenuButton>
    </Link>
  </SidebarMenuItem>
);

const AppHeaderContent = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const { toggleSidebar, isMobile } = useSidebar();

    const navItemsList = [
        { href: "/", label: "Dashboard" },
        { href: "/smart-search", label: "Smart Search" },
        { href: "/profile-optimizer", label: "Profile Optimizer" },
        { href: "/resume-generator", label: "Resume Generator" },
        { href: "/cover-letter-generator", label: "Cover Letter Generator" },
        { href: "/automated-application", label: "Automated Application" },
        { href: "/settings", label: "Settings" },
        { href: "/auth", label: "Authentication"},
    ];
    
    let currentPageLabel = navItemsList.find(item => item.href === pathname)?.label || "JobJet";
    if (pathname.startsWith("/auth")) {
        currentPageLabel = "Authentication";
    }


    const handleLogout = async () => {
        // Placeholder for actual logout logic
        console.log("Logging out...");
        await new Promise(resolve => setTimeout(resolve, 500));
        toast({ title: "Logged Out (Mock)", description: "You have been successfully logged out." });
        router.push("/auth?view=login"); 
    };

    return (
        <>
            <div className="flex items-center gap-2">
                 {isMobile && (
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle Sidebar">
                        <PanelLeft />
                    </Button>
                 )}
                <div className="md:hidden">
                    <Logo />
                </div>
                <h1 className="hidden md:block text-xl font-semibold">{currentPageLabel}</h1>
            </div>
            <div className="flex items-center gap-4">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    )
}


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/smart-search", icon: SearchCheck, label: "Smart Search" },
    { href: "/profile-optimizer", icon: UserCheck, label: "Profile Optimizer" },
    { href: "/resume-generator", icon: FileText, label: "Resume Generator" },
    { href: "/cover-letter-generator", icon: Mail, label: "Cover Letter" },
    { href: "/automated-application", icon: Send, label: "Auto Apply" },
  ];

  // Hide sidebar for auth page or if it's the landing page and not nested
  const isAuthPage = pathname.startsWith("/auth");
  const isLandingPage = pathname === "/"; 
  // Simple check: if it's exactly the landing page or auth page, don't show sidebar for main content area
  // This might need refinement if you have a dashboard at "/" that IS NOT the landing page.
  const showSidebarLayout = !isAuthPage;


  if (!showSidebarLayout) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="p-2 flex-1">
          <SidebarMenu>
            {navItems.map((item) => (
              <NavItem key={item.href} {...item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarMenu>
             <SidebarMenuItem>
                <Link href="/settings" legacyBehavior passHref>
                    <SidebarMenuButton isActive={pathname === "/settings"} tooltip="Settings">
                        <SettingsIcon className="stroke-[1.5px]" />
                        <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
             </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-svh">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md sm:px-6">
            <AppHeaderContent />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
            {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
