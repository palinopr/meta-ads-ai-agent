"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdAccount } from "@/types";
import { updateActiveAdAccount } from "@/app/(dashboard)/onboarding/actions";
import { Check, ChevronsUpDown, Building2, Briefcase, Search, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AccountSwitcherProps {
  adAccounts: AdAccount[];
  currentAccountId?: string;
}

export function AccountSwitcher({ adAccounts, currentAccountId }: AccountSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedAccount = adAccounts.find(a => a.account_id === currentAccountId);

  // Group accounts
  const groupedAccounts = adAccounts.reduce((acc, account) => {
    const businessName = account.business?.name || "Personal Ad Accounts";
    const businessId = account.business?.id || "personal";
    
    if (!acc[businessId]) {
      acc[businessId] = {
        name: businessName,
        accounts: []
      };
    }
    acc[businessId].accounts.push(account);
    return acc;
  }, {} as Record<string, { name: string; accounts: AdAccount[] }>);

  const handleSelect = async (account: AdAccount) => {
    try {
      const result = await updateActiveAdAccount(
        account.account_id,
        account.name,
        account.business?.id,
        account.business?.name
      );
      
      if (result?.success) {
        setOpen(false);
        toast.success(`Switched to ${account.name}`);
        router.refresh();
      } else {
        throw new Error("Server action failed");
      }
    } catch (_error) {
      console.error("Failed to switch account:", _error);
      toast.error("Failed to switch account");
    }
  };

  const filteredGroups = Object.entries(groupedAccounts).map(([id, group]) => ({
    id,
    name: group.name,
    accounts: group.accounts.filter(a => 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.account_id.includes(search)
    )
  })).filter(g => g.accounts.length > 0);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {selectedAccount?.name?.[0] || "M"}
          </div>
          <div className="flex flex-col items-start text-left overflow-hidden">
            <span className="truncate w-full font-semibold">
              {selectedAccount?.name || "Select Account"}
            </span>
            <span className="text-xs text-muted-foreground truncate w-full">
              {selectedAccount?.business?.name || "Personal"}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 w-[300px] mt-2 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 bg-background">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredGroups.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No accounts found
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.id} className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      {group.id === "personal" ? <Briefcase className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      {group.name}
                    </div>
                    <div className="space-y-0.5">
                      {group.accounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => handleSelect(account)}
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors",
                            selectedAccount?.account_id === account.account_id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-secondary text-foreground"
                          )}
                        >
                          <span className="truncate">{account.name}</span>
                          {selectedAccount?.account_id === account.account_id && (
                            <Check className="w-4 h-4 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-2 border-t border-border bg-secondary/30">
              <button className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
                <PlusCircle className="w-4 h-4" />
                Connect New Account
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
