"use client";

import { useState } from "react";
import { Coins, ArrowRightLeft, Lock, Unlock } from "lucide-react";

interface TokenizationSummaryProps {
  totalSupply: number;
  holdersCount: number;
  userBalance: number;
  assetId: string;
  isTokenized: boolean;
}

export function TokenizationSummary({
  totalSupply,
  holdersCount,
  userBalance,
  assetId,
  isTokenized,
}: TokenizationSummaryProps) {
  if (!isTokenized) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Coins size={20} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">
            Asset not tokenized
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Tokenize this asset to enable fractional ownership, transfer shares,
          and participate in governance.
        </p>
        <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          Tokenize this asset
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-green-600" />
          <span className="text-sm font-medium text-gray-900">Tokenized</span>
        </div>
        <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">
          On-chain
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Total Supply</p>
          <p className="text-lg font-semibold text-gray-900">
            {totalSupply.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Holders</p>
          <p className="text-lg font-semibold text-gray-900">{holdersCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Your Balance</p>
          <p className="text-lg font-semibold text-gray-900">
            {userBalance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

interface TokenTransferFormProps {
  assetId: string;
  userBalance: number;
  onTransfer: (recipient: string, amount: number) => Promise<void>;
}

export function TokenTransferForm({
  assetId,
  userBalance,
  onTransfer,
}: TokenTransferFormProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    setIsSubmitting(true);
    try {
      await onTransfer(recipient, parseInt(amount, 10));
      setRecipient("");
      setAmount("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <ArrowRightLeft size={16} className="text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">Transfer Tokens</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="G..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Amount (max: {userBalance.toLocaleString()})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={userBalance}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !recipient || !amount}
          className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Transferring..." : "Transfer Tokens"}
        </button>
      </div>
    </form>
  );
}
