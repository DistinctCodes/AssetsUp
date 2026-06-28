// frontend/components/contracts/status-badge.tsx
import { ContractStatus } from "@/lib/query/types/contract";

interface Props {
  status: ContractStatus | string;
}

const STATUS_COLORS: Record<string, string> = {
  [ContractStatus.DRAFT]: "bg-gray-100 text-gray-700",
  [ContractStatus.ACTIVE]: "bg-green-100 text-green-700",
  [ContractStatus.EXPIRED]: "bg-red-100 text-red-700",
  [ContractStatus.PENDING_RENEWAL]: "bg-yellow-100 text-yellow-700",
  [ContractStatus.TERMINATED]: "bg-gray-100 text-gray-500",
};

export function ContractStatusBadge({ status }: Props) {
  const colorClass = STATUS_COLORS[status] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
}
