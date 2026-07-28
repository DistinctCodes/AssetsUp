import { TableHTMLAttributes, forwardRef } from 'react';

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  ({ className, children, ...props }, ref) => (
    <table ref={ref} className={`w-full text-sm ${className || ''}`} {...props}>
      {children}
    </table>
  ),
);
Table.displayName = 'Table';

export const TableHeader = ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>;
export const TableBody = ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>;
export const TableRow = ({ children }: { children?: React.ReactNode }) => <tr>{children}</tr>;
export const TableHead = ({ children }: { children?: React.ReactNode }) => <th className="text-left px-2 py-1">{children}</th>;
export const TableCell = ({ children }: { children?: React.ReactNode }) => <td className="px-2 py-1">{children}</td>;
