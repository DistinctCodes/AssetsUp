// frontend/app/(dashboard)/contracts/page.tsx
"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractStatus, ContractType } from "@/lib/query/types/contract";
import { ContractStatusBadge } from "@/components/contracts/status-badge";
import { ContractTypeBadge } from "@/components/contracts/type-badge";
import { CreateContractModal } from "@/components/contracts/create-contract-modal";
import { ContractDetailDrawer } from "@/components/contracts/contract-detail-drawer";
import { useContracts } from "@/lib/query/hooks/useContracts";

const TABS = [
  { key: "all", label: "All" },
  { key: ContractStatus.ACTIVE, label: "Active" },
  { key: "expiring", label: "Expiring Soon" },
  { key: ContractStatus.EXPIRED, label: "Expired" },
];

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const statusFilter = useMemo(() => {
    if (activeTab === "all" || activeTab === "expiring") return undefined;
    return activeTab as ContractStatus;
  }, [activeTab]);

  const { data, isLoading, refetch } = useContracts({
    search: search || undefined,
    status: statusFilter,
    page,
    limit: 20,
  });

  const contracts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Filter expiring contracts (within 30 days)
  const expiringContracts = useMemo(() => {
    const now = new Date();
    return contracts.filter((contract) => {
      if (!contract.endDate) return false;
      const endDate = new Date(contract.endDate);
      const diffDays = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays >= 0 && diffDays <= 30;
    });
  }, [contracts]);

  const displayContracts =
    activeTab === "expiring" ? expiringContracts : contracts;

  const getDaysUntilExpiry = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total > 0
              ? `${total} contract${total !== 1 ? "s" : ""} managed`
              : "No contracts yet"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload size={16} className="mr-1.5" />
            Upload Document
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} className="mr-1.5" />
            New Contract
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {tab.key === "expiring" && expiringContracts.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {expiringContracts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by title, vendor, or contract ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Contract ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Title
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Vendor
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Value
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Start Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  End Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Days Until Expiry
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    Loading contracts...
                  </td>
                </tr>
              ) : displayContracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    {search || activeTab !== "all"
                      ? "No contracts match your filters."
                      : 'No contracts yet. Click "New Contract" to get started.'}
                  </td>
                </tr>
              ) : (
                displayContracts.map((contract) => {
                  const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
                  const isExpiringSoon =
                    daysUntilExpiry !== null &&
                    daysUntilExpiry >= 0 &&
                    daysUntilExpiry <= 30;

                  return (
                    <tr
                      key={contract.id}
                      onClick={() => setSelectedContract(contract)}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isExpiringSoon ? "bg-yellow-50 hover:bg-yellow-100" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {contract.contractId}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {contract.title}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {contract.vendor}
                      </td>
                      <td className="px-4 py-3">
                        {contract.contractType ? (
                          <ContractTypeBadge type={contract.contractType} />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatCurrency(contract.value)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(contract.startDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(contract.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <ContractStatusBadge status={contract.status} />
                      </td>
                      <td className="px-4 py-3">
                        {daysUntilExpiry !== null ? (
                          daysUntilExpiry < 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Expired
                            </span>
                          ) : daysUntilExpiry <= 30 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              {daysUntilExpiry} days
                            </span>
                          ) : (
                            <span className="text-gray-600">
                              {daysUntilExpiry} days
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} — {total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateContractModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Detail Drawer */}
      {selectedContract && (
        <ContractDetailDrawer
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onUpdate={() => refetch()}
        />
      )}
    </div>
  );
}
