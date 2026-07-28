import { ReactNode } from 'react';

export function Sheet({
  children,
  open,
  onOpenChange,
}: {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} />
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl p-5">{children}</div>
    </div>
  );
}

export function SheetContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function SheetHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function SheetTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold text-gray-900 ${className || ''}`}>{children}</h3>;
}
