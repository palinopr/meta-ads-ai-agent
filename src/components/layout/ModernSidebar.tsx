"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdAccount } from "@/types";
import { ModernAccountSwitcher } from "./ModernAccountSwitcher";
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  BarChart3, 
  Settings, 
  Wallet,
  Layers,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  HelpCircle,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernSidebarProps {
  adAccounts: AdAccount[];
  currentAccountId?: string;
}

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Dashboard & KPIs",
  },
  {
    title: "Campaigns",
    href: "/campaigns",
    icon: Megaphone,
    description: "Manage campaigns",
  },
  {
    title: "Ad Sets",
    href: "/ad-sets",
    icon: Layers,
    description: "Targeting & budget",
  },
  {
    title: "Ads",
    href: "/ads",
    icon: ImageIcon,
    description: "Creative assets",
  },
  {
    title: "Audiences",
    href: "/audiences",
    icon: Users,
    description: "Target audiences",
  },
  {
    title: "Insights",
    href: "/insights",
    icon: BarChart3,
    description: "Analytics & reports",
  },
];

const SECONDARY_NAV = [
  { title: "Billing", href: "/billing", icon: Wallet },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function ModernSidebar({ adAccounts, currentAccountId }: ModernSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-[280px] bg-sidebar-background border-r border-sidebar-border flex flex-col h-full flex-shrink-0">
      {/* Logo & Brand */}
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-chart-3 rounded-xl flex items-center justify-center ai-glow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight gradient-text">Meta Ads AI</span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">Intelligent Ad Management</span>
          </div>
        </Link>
      </div>

      {/* Account Switcher */}
      <div className="p-3">
        <ModernAccountSwitcher adAccounts={adAccounts} currentAccountId={currentAccountId} />
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-2 px-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Ads Manager
          </span>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const isDisabled = item.href !== "/dashboard";
            
            return (
              <Link
                key={item.href}
                href={"/dashboard"}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent",
                  isDisabled && "opacity-60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  isActive 
                    ? "bg-primary/20" 
                    : "bg-sidebar-accent group-hover:bg-sidebar-accent"
                )}>
                  <item.icon className={cn(
                    "w-4 h-4",
                    isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-foreground"
                  )} />
                </div>
                <div className="flex flex-col">
                  <span className={isActive ? "text-primary" : ""}>{item.title}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{item.description}</span>
                </div>
                {isDisabled && (
                  <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="mt-6 pt-4 border-t border-sidebar-border">
          <div className="mb-2 px-3">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Account
            </span>
          </div>
          <nav className="space-y-1">
            {SECONDARY_NAV.map((item) => (
              <Link
                key={item.href}
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors opacity-60"
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        {/* Help & Resources */}
        <div className="flex items-center gap-1 mb-3">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            Help
          </button>
          <a 
            href="https://business.facebook.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Meta Business
          </a>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            U
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">My Account</span>
            <span className="text-xs text-muted-foreground block truncate">Pro Plan</span>
          </div>
          <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

