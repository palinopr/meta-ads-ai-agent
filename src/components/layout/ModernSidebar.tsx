"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdAccount } from "@/types";
import { ModernAccountSwitcher } from "./ModernAccountSwitcher";
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  Wallet,
  Sparkles,
  ExternalLink,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernSidebarProps {
  adAccounts: AdAccount[];
  currentAccountId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV_ITEMS: Array<{
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Dashboard & KPIs",
  },
  {
    title: "Insights",
    href: "/insights",
    icon: BarChart3,
    description: "Analytics & trends",
  },
];

const SECONDARY_NAV = [
  { title: "Billing", href: "/billing", icon: Wallet },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function ModernSidebar({ 
  adAccounts, 
  currentAccountId,
  collapsed = false,
  onToggleCollapse
}: ModernSidebarProps) {
  const pathname = usePathname();

  return (
    <div 
      className={cn(
        "bg-sidebar-background border-r border-sidebar-border flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      {/* Logo & Brand */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className={cn("flex items-center gap-3", collapsed ? "justify-center w-full" : "px-2")}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-chart-3 rounded-xl flex items-center justify-center ai-glow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight gradient-text">Meta Ads AI</span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">Intelligent Ad Management</span>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <div className={cn("px-3 py-2", collapsed && "flex justify-center")}>
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors w-full",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Account Switcher - Hidden when collapsed */}
      {!collapsed && (
        <div className="p-3">
          <ModernAccountSwitcher adAccounts={adAccounts} currentAccountId={currentAccountId} />
        </div>
      )}

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!collapsed && (
          <div className="mb-2 px-3">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Ads Manager
            </span>
          </div>
        )}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href as "/dashboard" | "/insights"}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "group flex items-center gap-3 text-sm font-medium rounded-xl transition-all",
                  collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                  isActive 
                    ? "bg-primary/20" 
                    : "bg-sidebar-accent group-hover:bg-sidebar-accent"
                )}>
                  <item.icon className={cn(
                    "w-4 h-4",
                    isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-foreground"
                  )} />
                </div>
                {!collapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn(isActive ? "text-primary" : "", "truncate")}>{item.title}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight truncate">{item.description}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className={cn("mt-6 pt-4 border-t border-sidebar-border", collapsed && "mt-4 pt-3")}>
          {!collapsed && (
            <div className="mb-2 px-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Account
              </span>
            </div>
          )}
          <nav className="space-y-1">
            {SECONDARY_NAV.map((item) => (
              <Link
                key={item.href}
                href="/dashboard"
                title={collapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 text-sm font-medium rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors opacity-60",
                  collapsed ? "px-2 py-2 justify-center" : "px-3 py-2"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && item.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        {/* Help & Resources */}
        {!collapsed ? (
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
        ) : (
          <div className="flex flex-col items-center gap-1 mb-3">
            <button 
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <a 
              href="https://business.facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
              title="Meta Business"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* User Profile */}
        <div className={cn(
          "flex items-center rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-pointer group",
          collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
        )}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
            U
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">My Account</span>
                <span className="text-xs text-muted-foreground block truncate">Pro Plan</span>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

