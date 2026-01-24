'use client';
import React, { useState, useMemo } from 'react';
import { AssetHistoryEvent, AssetHistoryAction } from '@/lib/query/types/asset';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search } from 'lucide-react';

interface HistoryTimelineProps {
  events: AssetHistoryEvent[];
  isLoading?: boolean;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const actionColors: Record<AssetHistoryAction, BadgeVariant> = {
  CREATED: 'success',
  UPDATED: 'info',
  STATUS_CHANGED: 'warning',
  TRANSFERRED: 'info',
  MAINTENANCE: 'warning',
  NOTE_ADDED: 'default',
  DOCUMENT_UPLOADED: 'default',
};

const actionLabels: Record<AssetHistoryAction, string> = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  STATUS_CHANGED: 'Status Changed',
  TRANSFERRED: 'Transferred',
  MAINTENANCE: 'Maintenance',
  NOTE_ADDED: 'Note Added',
  DOCUMENT_UPLOADED: 'Document Uploaded',
};

export function HistoryTimeline({ events, isLoading }: HistoryTimelineProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !searchTerm ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.performedBy.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = !actionFilter || event.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [events, searchTerm, actionFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white"
        >
          <option value="">All Actions</option>
          <option value="CREATED">Created</option>
          <option value="UPDATED">Updated</option>
          <option value="STATUS_CHANGED">Status Changed</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="NOTE_ADDED">Note Added</option>
          <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
        </select>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No history events found</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="relative pl-10">
                <div className="absolute left-2.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" />
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <Badge variant={actionColors[event.action]}>
                        {actionLabels[event.action]}
                      </Badge>
                      <p className="mt-2 text-sm text-gray-900">
                        {event.description}
                      </p>
                    </div>
                    <time className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(event.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    By {event.performedBy.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
