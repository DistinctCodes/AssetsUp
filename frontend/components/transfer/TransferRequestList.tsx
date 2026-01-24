'use client';

import React, { useState } from 'react';
import { AssetTransfer, TransferStatus } from '@/lib/query/types';

interface TransferRequestListProps {
  transfers: AssetTransfer[];
  onApprove: (transferId: string) => void;
  onReject: (transferId: string) => void;
  onCancel: (transferId: string) => void;
  onViewDetails: (transferId: string) => void;
  currentUserRole: string;
  isLoading?: boolean;
}

const TransferRequestList: React.FC<TransferRequestListProps> = ({
  transfers,
  onApprove,
  onReject,
  onCancel,
  onViewDetails,
  currentUserRole,
  isLoading = false
}) => {
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransfers = transfers.filter(transfer => {
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
    const matchesSearch = transfer.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.assetIds.some(id => id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: TransferStatus) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      executed: 'bg-green-100 text-green-800',
      scheduled: 'bg-purple-100 text-purple-800'
    };

    const statusText = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      executed: 'Executed',
      scheduled: 'Scheduled'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
        {statusText[status]}
      </span>
    );
  };

  const canApprove = (transfer: AssetTransfer) => {
    return currentUserRole === 'admin' || currentUserRole === 'manager';
  };

  const canCancel = (transfer: AssetTransfer) => {
    return transfer.createdBy === 'current_user_id' && 
           (transfer.status === 'pending' || transfer.status === 'approved');
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search transfers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TransferStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="executed">Executed</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transfer List */}
      <div className="divide-y divide-gray-200">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transfers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Get started by creating a new transfer request'}
            </p>
          </div>
        ) : (
          filteredTransfers.map((transfer) => (
            <div key={transfer.id} className="p-6 hover:bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      Transfer #{transfer.id.substring(0, 8)}
                    </h3>
                    {getStatusBadge(transfer.status)}
                  </div>
                  
                  <p className="text-gray-600 mb-2">{transfer.reason}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>{transfer.assetIds.length} asset(s)</span>
                    <span>•</span>
                    <span>{new Date(transfer.createdAt).toLocaleDateString()}</span>
                    {transfer.scheduledDate && (
                      <>
                        <span>•</span>
                        <span>Scheduled: {new Date(transfer.scheduledDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewDetails(transfer.id)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    View Details
                  </button>

                  {canApprove(transfer) && transfer.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApprove(transfer.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(transfer.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {canCancel(transfer) && (
                    <button
                      onClick={() => onCancel(transfer.id)}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {transfers.filter(t => t.status === 'pending').length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {transfers.filter(t => t.status === 'approved').length}
            </p>
            <p className="text-sm text-gray-600">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {transfers.filter(t => t.status === 'rejected').length}
            </p>
            <p className="text-sm text-gray-600">Rejected</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">
              {transfers.filter(t => t.status === 'executed').length}
            </p>
            <p className="text-sm text-gray-600">Executed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferRequestList;