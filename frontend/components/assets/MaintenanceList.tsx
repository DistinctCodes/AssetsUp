'use client';
import React from 'react';
import { MaintenanceRecord, MaintenanceStatus } from '@/lib/query/types/asset';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Wrench, Calendar, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

interface MaintenanceListProps {
  records: MaintenanceRecord[];
  onSchedule: () => void;
  isLoading?: boolean;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const statusColors: Record<MaintenanceStatus, BadgeVariant> = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const statusLabels: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function MaintenanceList({
  records,
  onSchedule,
  isLoading,
}: MaintenanceListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Maintenance Records</h3>
        <Button size="sm" onClick={onSchedule}>
          <Plus className="w-4 h-4 mr-2" /> Schedule
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No maintenance records</p>
          <Button size="sm" className="mt-3" onClick={onSchedule}>
            <Plus className="w-4 h-4 mr-2" /> Schedule Maintenance
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <Wrench className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{record.type}</span>
                      <Badge variant={statusColors[record.status]}>
                        {statusLabels[record.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {record.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-2 flex-wrap gap-3">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Scheduled:{' '}
                        {new Date(record.scheduledDate).toLocaleDateString()}
                      </span>
                      {record.completedDate && (
                        <span>
                          Completed:{' '}
                          {new Date(record.completedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        {record.notes}
                      </p>
                    )}
                  </div>
                </div>
                {record.cost !== null && record.cost !== undefined && (
                  <span className="text-sm font-medium">
                    ${record.cost.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
