import React from 'react';
import { Role, Permission } from '../../../backend/src/types/admin'
import { Check, X } from 'lucide-react';

interface RoleMatrixProps {
    roles: Role[];
    permissions: Permission[];
    rolePermissions: Record<string, string[]>; // roleId -> permissionId[]
    onToggle: (roleId: string, permissionId: string) => void;
}

export const RoleMatrix: React.FC<RoleMatrixProps> = ({ roles, permissions, rolePermissions, onToggle }) => {
    // Group permissions by category
    const groupedPerms = permissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                            Permission
                        </th>
                        {roles.map(role => (
                            <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {role.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(groupedPerms).map(([category, perms]) => (
                        <React.Fragment key={category}>
                            <tr className="bg-gray-100">
                                <td colSpan={roles.length + 1} className="px-6 py-2 text-xs font-bold text-gray-700 uppercase">
                                    {category}
                                </td>
                            </tr>
                            {perms.map(perm => (
                                <tr key={perm.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900 sticky left-0 bg-white">
                                        {perm.name}
                                    </td>
                                    {roles.map(role => {
                                        const hasPerm = rolePermissions[role.id]?.includes(perm.id);
                                        const isSystem = role.isSystem; // Prevent editing super admin
                                        return (
                                            <td key={`${role.id}-${perm.id}`} className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => !isSystem && onToggle(role.id, perm.id)}
                                                    disabled={isSystem}
                                                    className={`p-1 rounded transition-colors ${hasPerm
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-red-50 text-red-300 hover:bg-red-100'
                                                        } ${isSystem ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {hasPerm ? <Check size={16} /> : <X size={16} />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};