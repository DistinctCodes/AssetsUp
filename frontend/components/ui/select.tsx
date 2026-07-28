import { SelectHTMLAttributes, forwardRef } from 'react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={`border rounded px-2 py-1 text-sm ${className || ''}`} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const SelectTrigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;
export const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const SelectItem = ({ children, value }: { children?: React.ReactNode; value?: string }) => (
  <option value={value}>{children}</option>
);
