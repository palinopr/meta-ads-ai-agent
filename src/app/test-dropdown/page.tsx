"use client";

import { MetaAdsTable } from "@/components/dashboard/MetaAdsTable";

export default function TestDropdownPage() {
  const mockCampaigns = [
    {
      id: "1",
      name: "Test Campaign 1",
      status: "ACTIVE",
      daily_budget: "1000",
      spend: "500",
      impressions: "1000",
      clicks: "50",
    },
  ];

  return (
    <div className="p-10 h-screen bg-gray-100">
      <div className="h-[600px]">
        <MetaAdsTable
          campaigns={mockCampaigns}
          accountId="act_123"
          accessToken="mock_token"
          accountName="Test Account"
        />
      </div>
    </div>
  );
}

