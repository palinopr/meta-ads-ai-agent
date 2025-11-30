"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdAccount } from "@/types";
import { AccountSwitcher } from "./AccountSwitcher";
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  BarChart3, 
  Settings, 
  Wallet,
  Layers,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  adAccounts: AdAccount[];
  currentAccountId?: string;
}

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Campaigns",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    title: "Ad Sets",
    href: "/ad-sets",
    icon: Layers,
  },
  {
    title: "Ads",
    href: "/ads",
    icon: ImageIcon,
  },
  {
    title: "Audiences",
    href: "/audiences",
    icon: Users,
  },
  {
    title: "Insights",
    href: "/insights",
    icon: BarChart3,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: Wallet,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ adAccounts, currentAccountId }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-background border-r border-border flex flex-col h-full flex-shrink-0">
      {/* Header / Switcher */}
      <div className="p-4 border-b border-border">
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">AI</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Meta Ads AI</span>
        </div>
        <AccountSwitcher adAccounts={adAccounts} currentAccountId={currentAccountId} />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href === "/dashboard" ? "/dashboard" : "#"} // Only dashboard works for now
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  item.href !== "/dashboard" && "opacity-50 cursor-not-allowed"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile / Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
            ME
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">My Account</span>
            <span className="text-xs text-muted-foreground">Pro Plan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
