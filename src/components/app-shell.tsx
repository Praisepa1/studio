"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Briefcase, Users, FileText, Mail,
  Settings as SettingsIcon, SearchCheck, UserCheck,
  Activity, MessageSquare, Cpu, Send, X, Menu,
  ChevronRight, LogOut, Bell, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Navigation Structure ────────────────────────────────────

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Discovery",
    items: [
      { href: "/discovery", icon: SearchCheck, label: "Search & Discover" },
      { href: "/companies", icon: Briefcase, label: "Companies" },
      { href: "/jobs", icon: Briefcase, label: "Jobs" },
    ],
  },
  {
    label: "Leads",
    items: [
      { href: "/leads", icon: Users, label: "Lead Database" },
      { href: "/crm", icon: UserCheck, label: "CRM" },
    ],
  },
  {
    label: "Generation",
    items: [
      { href: "/proposals", icon: FileText, label: "Proposals" },
      { href: "/outreach", icon: Send, label: "Outreach" },
      { href: "/resume-generator", icon: FileText, label: "Resume" },
      { href: "/cover-letter-generator", icon: Mail, label: "Cover Letter" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/ai-studio", icon: Cpu, label: "AI Studio" },
      { href: "/analytics", icon: Activity, label: "Analytics" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/scraping-jobs", icon: Activity, label: "Pipeline Monitor" },
      { href: "/feedback", icon: MessageSquare, label: "Feedback" },
      { href: "/settings", icon: SettingsIcon, label: "Settings" },
    ],
  },
];

// ─── Logo ─────────────────────────────────────────────────────

const Logo = ({ collapsed }: { collapsed: boolean }) => (
  <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
      <Zap className="h-4 w-4 text-white" />
    </div>
    {!collapsed && (
      <span className="text-[15px] font-bold text-white tracking-tight">JobJet</span>
    )}
  </Link>
);

// ─── Nav Item ─────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label, active, collapsed, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200",
      collapsed ? "justify-center px-2" : "",
      active
        ? "bg-primary text-white font-semibold shadow-sm scale-[1.02]"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
    )}
  >
    <Icon className="h-4 w-4 shrink-0" />
    {!collapsed && <span>{label}</span>}
  </Link>
);

// ─── Sidebar ─────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  pathname: string;
}

function Sidebar({ collapsed, mobileOpen, onClose, pathname }: SidebarProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await new Promise((r) => setTimeout(r, 300));
    toast({ title: "Logged out", description: "See you next time!" });
    router.push("/auth?view=login");
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] transition-all duration-300",
          // Desktop: controlled by collapsed state
          "lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-60",
          // Mobile: controlled by mobileOpen
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          "lg:static lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-4">
          <Logo collapsed={collapsed} />
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground hover:text-white p-1 rounded"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
                    collapsed={collapsed}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--sidebar-border))] p-3 space-y-1">
          <NavItem
            href="/settings"
            icon={SettingsIcon}
            label="Settings"
            active={pathname === "/settings"}
            collapsed={collapsed}
            onClick={onClose}
          />
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-colors",
              collapsed ? "justify-center px-2" : ""
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Header ───────────────────────────────────────────────────

function pageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/discovery": "Search & Discover",
    "/companies": "Companies",
    "/jobs": "Jobs",
    "/leads": "Lead Database",
    "/crm": "CRM",
    "/proposals": "Proposals",
    "/outreach": "Outreach",
    "/resume-generator": "Resume",
    "/cover-letter-generator": "Cover Letter",
    "/ai-studio": "AI Studio",
    "/analytics": "Analytics",
    "/scraping-jobs": "Pipeline Monitor",
    "/feedback": "Feedback",
    "/settings": "Settings",
    "/": "Home",
  };
  return map[pathname] ?? "JobJet";
}

interface HeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMobileOpen: () => void;
  pathname: string;
}

function Header({ collapsed, onToggleCollapse, onMobileOpen, pathname }: HeaderProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await new Promise((r) => setTimeout(r, 300));
    toast({ title: "Logged out" });
    router.push("/auth?view=login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — always visible on small screens */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileOpen}
          className="lg:hidden h-9 w-9"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="hidden lg:flex h-9 w-9"
          aria-label="Toggle sidebar"
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform duration-300", collapsed ? "" : "rotate-180")}
          />
        </Button>

        <h1 className="text-lg font-semibold hidden sm:block">{pageTitle(pathname)}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-primary text-white text-sm font-semibold">J</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ai-studio">AI Studio</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── App Shell ────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isAuthPage = pathname.startsWith("/auth");
  const isLandingPage = pathname === "/";

  // Landing and auth pages: no sidebar layout
  if (isAuthPage || isLandingPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onMobileOpen={() => setMobileOpen(true)}
          pathname={pathname}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
