// frontend/components/contracts/type-badge.tsx
import { ContractType } from "@/lib/query/types/contract";

interface Props {
  type: ContractType | string;
}

const TYPE_COLORS: Record<string, string> = {
  [ContractType.SERVICE]: "bg-blue-100 text-blue-700",
  [ContractType.MAINTENANCE]: "bg-purple-100 text-purple-700",
  [ContractType.SUPPORT]: "bg-indigo-100 text-indigo-700",
  [ContractType.LICENSE]: "bg-orange-100 text-orange-700",
  [ContractType.LEASE]: "bg-teal-100 text-teal-700",
  [ContractType.OTHER]: "bg-gray-100 text-gray-700",
};

export function ContractTypeBadge({ type }: Props) {
  const colorClass = TYPE_COLORS[type] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}
