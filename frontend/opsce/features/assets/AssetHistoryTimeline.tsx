'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
  PlusCircle,
  Edit,
  ArrowRightLeft,
  Wrench,
  FileText,
  MessageSquare,
  Upload,
  Clock,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import type { AssetHistoryEvent, AssetHistoryAction } from '@/lib/query/types/asset';

const actionConfig: Record<AssetHistoryAction, { icon: React.ReactNode; color: string }> = {
  CREATED: { icon: <PlusCircle size={14} />, color: 'bg-green-100 text-green-700' },
  UPDATED: { icon: <Edit size={14} />, color: 'bg-blue-100 text-blue-700' },
  STATUS_CHANGED: { icon: <ArrowRightLeft size={14} />, color: 'bg-yellow-100 text-yellow-700' },
  TRANSFERRED: { icon: <ArrowRightLeft size={14} />, color: 'bg-purple-100 text-purple-700' },
  MAINTENANCE: { icon: <Wrench size={14} />, color: 'bg-orange-100 text-orange-700' },
  NOTE_ADDED: { icon: <MessageSquare size={14} />, color: 'bg-gray-100 text-gray-600' },
  DOCUMENT_UPLOADED: { icon: <Upload size={14} />, color: 'bg-teal-100 text-teal-700' },
};

function ActionIcon({ action }: { action: AssetHistoryAction }) {
  const config = actionConfig[action] ?? actionConfig.UPDATED;
  return (
    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${config.color}`}>
      {config.icon}
    </span>
  );
}

function ActionBadge({ action }: { action: AssetHistoryAction }) {
  const config = actionConfig[action] ?? actionConfig.UPDATED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

interface AssetHistoryTimelineProps {
  assetId: string;
  limit?: number;
}

export function AssetHistoryTimeline({ assetId, limit = 20 }: AssetHistoryTimelineProps) {
  const [events, setEvents] = useState<AssetHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    if (!assetId) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await api.get<AssetHistoryEvent[]>(`/assets/${assetId}/history`, {
          params: { page: 1, limit },
        });
        setEvents(response.data);
        setHasMore(response.data.length >= limit);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        toast.error('Failed to load asset history');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [assetId, limit]);

  // Load more for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await api.get<AssetHistoryEvent[]>(`/assets/${assetId}/history`, {
        params: { page: nextPage, limit },
      });
      const newEvents = response.data;
      setEvents((prev) => [...prev, ...newEvents]);
      setHasMore(newEvents.length >= limit);
      setPage(nextPage);
    } catch (err) {
      console.error('Failed to load more history:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [assetId, limit, page, loadingMore, hasMore]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMore();
    }
  }, [loadingMore, hasMore, loadMore]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mr-2" />
          <span className="text-sm text-gray-400">Loading history...</span>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Change History</h2>
        <div className="flex flex-col items-center gap-2 py-12">
          <Clock size={28} className="text-gray-200" />
          <p className="text-sm text-gray-400">No history recorded yet.</p>
          <p className="text-xs text-gray-300">Changes to this asset will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Change History</h2>

      <div
        ref={scrollRef}
        className="max-h-[600px] overflow-y-auto pr-2"
        onScroll={handleScroll}
      >
        <ol className="relative border-l border-gray-200 ml-3 space-y-5">
          {events.map((event, index) => (
            <li key={event.id || index} className="ml-4">
              {/* Timeline dot */}
              <div className="absolute -left-[13.5px] mt-1">
                <ActionIcon action={event.action} />
              </div>

              <div className="pt-0.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <ActionBadge action={event.action} />
                </div>
                <p className="text-sm text-gray-900 mt-1">{event.description}</p>

                {/* Show value changes if available */}
                {event.previousValue && event.newValue && (
                  <div className="mt-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    {Object.keys(event.newValue).map((key) => {
                      const oldVal = String(event.previousValue?.[key] ?? '—');
                      const newVal = String(event.newValue?.[key] ?? '—');
                      if (oldVal === newVal) return null;
                      return (
                        <div key={key} className="text-xs text-gray-500 mb-0.5 last:mb-0">
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-gray-400 line-through mr-1">{oldVal}</span>
                          <span className="text-gray-900 font-medium">{newVal}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(event.createdAt), 'MMM d, yyyy · h:mm a')}
                  {event.performedBy && ` · ${event.performedBy.name}`}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mr-2" />
            <span className="text-xs text-gray-400">Loading more...</span>
          </div>
        )}

        {!hasMore && events.length > limit && (
          <p className="text-center text-xs text-gray-400 mt-4">
            All history loaded
          </p>
        )}
      </div>
    </div>
  );
}
