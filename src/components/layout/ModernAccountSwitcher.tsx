"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdAccount } from "@/types";
import { updateActiveAdAccount } from "@/app/(dashboard)/onboarding/actions";
import { 
  Check, 
  ChevronsUpDown, 
  Building2, 
  User2, 
  Search, 
  Plus,
  Briefcase,
  ChevronRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ModernAccountSwitcherProps {
  adAccounts: AdAccount[];
  currentAccountId?: string;
}

export function ModernAccountSwitcher({ adAccounts, currentAccountId }: ModernAccountSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const selectedAccount = adAccounts.find(a => a.account_id === currentAccountId);

  // Group accounts by business manager
  const groupedAccounts = adAccounts.reduce((acc, account) => {
    const businessName = account.business?.name || "Personal Ad Accounts";
    const businessId = account.business?.id || "personal";
    
    if (!acc[businessId]) {
      acc[businessId] = {
        name: businessName,
        id: businessId,
        accounts: []
      };
    }
    acc[businessId].accounts.push(account);
    return acc;
  }, {} as Record<string, { name: string; id: string; accounts: AdAccount[] }>);

  const handleSelect = async (account: AdAccount) => {
    if (account.account_id === currentAccountId) {
      setOpen(false);
      return;
    }

    setIsLoading(account.account_id);
    
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
      toast.error("Failed to switch account. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  const filteredGroups = Object.entries(groupedAccounts)
    .map(([id, group]) => ({
      id,
      name: group.name,
      accounts: group.accounts.filter(a => 
        a.name.toLowerCase().includes(search.toLowerCase()) || 
        a.account_id.includes(search)
      )
    }))
    .filter(g => g.accounts.length > 0);

  const totalAccounts = adAccounts.length;
  const totalBusinesses = Object.keys(groupedAccounts).length;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
          "bg-gradient-to-r from-sidebar-accent/80 to-sidebar-accent/40",
          "border border-sidebar-border hover:border-primary/30",
          "hover:shadow-md hover:from-sidebar-accent hover:to-sidebar-accent/60",
          open && "border-primary/40 shadow-md"
        )}
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center text-primary font-bold shrink-0 shadow-inner">
          {selectedAccount?.name?.[0]?.toUpperCase() || "M"}
        </div>
        
        {/* Account Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {selectedAccount?.name || "Select Account"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {selectedAccount?.business?.name ? (
              <>
                <Building2 className="w-3 h-3" />
                <span className="truncate">{selectedAccount.business.name}</span>
              </>
            ) : (
              <>
                <User2 className="w-3 h-3" />
                <span>Personal Account</span>
              </>
            )}
          </div>
        </div>

        <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute top-full left-0 w-[320px] mt-2 z-50 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="p-3 bg-muted/30 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Switch Account</h3>
                <span className="text-[10px] text-muted-foreground">
                  {totalAccounts} accounts • {totalBusinesses} {totalBusinesses === 1 ? "business" : "businesses"}
                </span>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search accounts or business..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Accounts List */}
            <div className="max-h-[350px] overflow-y-auto p-2">
              {filteredGroups.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-1">No accounts found</p>
                  <p className="text-xs text-muted-foreground">Try a different search term</p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.id} className="mb-3 last:mb-0">
                    {/* Business Group Header */}
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.id === "personal" ? (
                        <Briefcase className="w-3.5 h-3.5" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5" />
                      )}
                      <span className="truncate">{group.name}</span>
                      <span className="ml-auto text-[10px] font-normal lowercase">
                        {group.accounts.length} {group.accounts.length === 1 ? "account" : "accounts"}
                      </span>
                    </div>
                    
                    {/* Account Items */}
                    <div className="space-y-1">
                      {group.accounts.map((account) => {
                        const isSelected = selectedAccount?.account_id === account.account_id;
                        const isAccountLoading = isLoading === account.account_id;
                        
                        return (
                          <button
                            key={account.id}
                            onClick={() => handleSelect(account)}
                            disabled={isLoading !== null}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                              isSelected
                                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                : "hover:bg-accent text-foreground",
                              isLoading !== null && !isAccountLoading && "opacity-50"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                              isSelected 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {account.name[0]?.toUpperCase() || "A"}
                            </div>
                            
                            <div className="flex-1 text-left min-w-0">
                              <span className="text-sm font-medium block truncate">
                                {account.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                ID: {account.account_id}
                              </span>
                            </div>

                            {isAccountLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : isSelected ? (
                              <Check className="w-4 h-4 text-primary" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer - Connect New */}
            <div className="p-2 border-t border-border bg-muted/20">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                Connect New Ad Account
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


