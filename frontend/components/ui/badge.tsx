export function Badge({ children, variant, className }: { children?: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variant === 'outline' ? 'border' : 'bg-gray-100'} ${className || ''}`}>
      {children}
    </span>
  );
}
