"use client";

import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewLevel = "account" | "campaign" | "adset" | "ad";

interface BreadcrumbItem {
  level: ViewLevel;
  id: string;
  name: string;
}

interface InsightsBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (level: ViewLevel, id?: string) => void;
}

export function InsightsBreadcrumb({ items, onNavigate }: InsightsBreadcrumbProps) {
  const handleClick = (item: BreadcrumbItem, index: number) => {
    // Navigate to the clicked level
    if (index === 0) {
      // "All Campaigns" - navigate to account level
      onNavigate("account");
    } else {
      // Navigate to specific entity
      onNavigate(item.level, item.id);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate("account")}
        className="h-auto p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <Home className="h-4 w-4 mr-1" />
        All Campaigns
      </Button>

      {items.map((item, index) => (
        <div key={`${item.level}-${item.id}`} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleClick(item, index)}
            className="h-auto p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {item.name}
          </Button>
        </div>
      ))}
    </div>
  );
}

