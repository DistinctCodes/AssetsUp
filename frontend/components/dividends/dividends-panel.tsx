"use client";

import { useState } from "react";
import { Users, DollarSign, TrendingUp, ArrowDownToLine } from "lucide-react";

interface Holder {
  address: string;
  shareCount: number;
  ownershipPercentage: number;
}

interface HoldersTableProps {
  holders: Holder[];
}

export function HoldersTable({ holders }: HoldersTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Token Holders</h3>
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
            {holders.length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Address
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                Shares
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                Ownership
              </th>
            </tr>
          </thead>
          <tbody>
            {holders.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No holders yet
                </td>
              </tr>
            ) : (
              holders.map((holder) => (
                <tr
                  key={holder.address}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-2">
                    <code className="text-xs text-gray-700 font-mono">
                      {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                    </code>
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900">
                    {holder.shareCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900">
                    {holder.ownershipPercentage.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DividendsPanelProps {
  claimableBalance: number;
  totalDistributed: number;
  distributionHistory: Array<{
    id: string;
    amount: number;
    date: string;
    claimed: boolean;
  }>;
  onClaim: () => Promise<void>;
}

export function DividendsPanel({
  claimableBalance,
  totalDistributed,
  distributionHistory,
  onClaim,
}: DividendsPanelProps) {
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await onClaim();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-green-600" />
            <span className="text-xs text-gray-500">Claimable</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {claimableBalance.toLocaleString()} XLM
          </p>
          {claimableBalance > 0 && (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="mt-2 w-full px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isClaiming ? "Claiming..." : "Claim Dividends"}
            </button>
          )}
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">Total Distributed</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {totalDistributed.toLocaleString()} XLM
          </p>
        </div>
      </div>

      {distributionHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Distribution History
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {distributionHistory.map((dist) => (
              <div
                key={dist.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-gray-900">
                    {dist.amount.toLocaleString()} XLM
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(dist.date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    dist.claimed
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {dist.claimed ? "Claimed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminDividendsPanelProps {
  totalHolders: number;
  totalShares: number;
  onDistribute: (amount: number) => Promise<void>;
}

export function AdminDividendsPanel({
  totalHolders,
  totalShares,
  onDistribute,
}: AdminDividendsPanelProps) {
  const [amount, setAmount] = useState("");
  const [isDistributing, setIsDistributing] = useState(false);

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setIsDistributing(true);
    try {
      await onDistribute(parseInt(amount, 10));
      setAmount("");
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          Distribute Dividends
        </h3>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {totalHolders} holders · {totalShares.toLocaleString()} total shares
      </div>

      <form onSubmit={handleDistribute} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Amount (XLM)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            placeholder="1000"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={isDistributing || !amount}
          className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isDistributing ? "Distributing..." : "Distribute to Holders"}
        </button>
      </form>
    </div>
  );
}
