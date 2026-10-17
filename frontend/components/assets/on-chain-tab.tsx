"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useWalletStore } from "@/store/wallet.store";
import { TokenizationPanel } from "@/components/tokenization/tokenization-panel";
import { GovernancePanel } from "@/components/governance/governance-panel";
import { DividendsPanel } from "@/components/dividends/dividends-panel";

type Tab = "tokenization" | "governance" | "dividends";

export function OnChainTab({ assetId }: { assetId: string }) {
  const [tab, setTab] = useState<Tab>("tokenization");
  const { isConnected } = useWalletStore();

  if (!isConnected) {
    return (
      <div className="bg-white border rounded-xl p-12 text-center">
        <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Connect a Freighter wallet to view on-chain features.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(["tokenization", "governance", "dividends"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "tokenization" && <TokenizationPanel assetId={assetId} />}
      {tab === "governance" && <GovernancePanel assetId={assetId} />}
      {tab === "dividends" && <DividendsPanel assetId={assetId} />}
    </div>
  );
}