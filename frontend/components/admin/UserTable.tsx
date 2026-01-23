import React, { useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { Edit, Trash2, ShieldCheck } from 'lucide-react';
import { User } from '../../../backend/src/types/admin'

interface UserTableProps {
    data: User[];
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
}

export const UserTable: React.FC<UserTableProps> = ({ data, onEdit, onDelete }) => {
    const columns = useMemo<ColumnDef<User>[]>(() => [
        { header: 'Name', accessorKey: 'name', cell: info => <span className="font-medium">{info.getValue() as string}</span> },
        { header: 'Email', accessorKey: 'email' },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: info => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <ShieldCheck className="w-3 h-3 mr-1" /> {info.getValue() as string}
                </span>
            )
        },
        { header: 'Department', accessorKey: 'department' },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: info => {
                const status = info.getValue() as string;
                return (
                    <span className={`px-2 py-1 rounded-full text-xs ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {status}
                    </span>
                );
            }
        },
        { header: 'Last Active', accessorKey: 'lastActive' },
        {
            id: 'actions',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <button onClick={() => onEdit(row.original)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(row.original.id)} className="p-1 hover:bg-red-100 rounded text-red-600">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ], []);

    const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <div className="rounded-md border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} className="px-6 py-3 font-medium text-gray-500">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50">
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="px-6 py-4">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};