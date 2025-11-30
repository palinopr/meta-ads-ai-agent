"use client";

import { useState } from "react";
import { AdAccount } from "@/types";
import { updateActiveAdAccount } from "@/app/(dashboard)/onboarding/actions";
import { Check, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccountSelectorProps {
  adAccounts: AdAccount[];
  currentAccountId?: string;
}

export function AccountSelector({ adAccounts, currentAccountId }: AccountSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(currentAccountId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group accounts by Business Manager
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

  const handleContinue = async () => {
    if (!selectedId) return;
    
    const selectedAccount = adAccounts.find(a => a.account_id === selectedId);
    if (!selectedAccount) return;

    setIsSubmitting(true);
    try {
      await updateActiveAdAccount(
        selectedAccount.account_id,
        selectedAccount.name,
        selectedAccount.business?.id,
        selectedAccount.business?.name
      );
      toast.success("Account connected successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update account");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Select Ad Account</h1>
        <p className="text-muted-foreground">
          Choose the ad account you want to manage with AI.
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedAccounts).map(([businessId, group]) => (
          <div key={businessId} className="space-y-3">
            <div className="flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {businessId === "personal" ? (
                <Briefcase className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              {group.name}
            </div>
            
            <div className="grid gap-3">
              {group.accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setSelectedId(account.account_id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left group",
                    selectedId === account.account_id
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-secondary/30 border-transparent hover:bg-secondary/50 hover:border-border"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{account.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      ID: {account.account_id}
                    </div>
                  </div>
                  
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                    selectedId === account.account_id
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
                  )}>
                    {selectedId === account.account_id && <Check className="w-3 h-3" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button
          onClick={handleContinue}
          disabled={!selectedId || isSubmitting}
          className="px-8 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? "Connecting..." : "Continue to Dashboard"}
        </button>
      </div>
    </div>
  );
}



