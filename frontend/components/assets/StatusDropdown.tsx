'use client';
import React from 'react';
import { AssetStatus } from '@/lib/query/types/asset';
import { Dropdown } from '@/components/ui/Dropdown';
import { Circle } from 'lucide-react';

interface StatusDropdownProps {
  value: AssetStatus;
  onChange: (status: AssetStatus) => void;
  disabled?: boolean;
}

const statusConfig = [
  { value: AssetStatus.ACTIVE, label: 'Active', color: 'text-green-500' },
  { value: AssetStatus.ASSIGNED, label: 'Assigned', color: 'text-blue-500' },
  {
    value: AssetStatus.MAINTENANCE,
    label: 'Maintenance',
    color: 'text-yellow-500',
  },
  { value: AssetStatus.RETIRED, label: 'Retired', color: 'text-gray-500' },
];

export function StatusDropdown({
  value,
  onChange,
  disabled,
}: StatusDropdownProps) {
  const options = statusConfig.map((s) => ({
    value: s.value,
    label: s.label,
    icon: <Circle className={`w-3 h-3 fill-current ${s.color}`} />,
  }));

  return (
    <Dropdown
      value={value}
      options={options}
      onChange={(v) => onChange(v as AssetStatus)}
      disabled={disabled}
    />
  );
}
