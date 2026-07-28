'use client';

interface AuditLogDiffProps {
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export function AuditLogDiff({ oldValues = {}, newValues = {} }: AuditLogDiffProps) {
  const allKeys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]));

  return (
    <div className="bg-gray-50 p-4 rounded-md text-xs font-mono border">
      <div className="grid grid-cols-2 gap-4 font-semibold pb-2 border-b text-gray-700">
        <div>Previous Value</div>
        <div>New Value</div>
      </div>
      <div className="space-y-1 mt-2">
        {allKeys.length === 0 ? (
          <p className="text-gray-400 italic">No value changes recorded.</p>
        ) : (
          allKeys.map((key) => {
            const prevVal = JSON.stringify(oldValues[key]);
            const newVal = JSON.stringify(newValues[key]);
            const isChanged = prevVal !== newVal;

            return (
              <div
                key={key}
                className={`grid grid-cols-2 gap-4 py-1 px-2 rounded ${
                  isChanged ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-gray-600'
                }`}
              >
                <div>
                  <span className="text-gray-500">{key}: </span>
                  {prevVal ?? <span className="italic text-gray-400">null</span>}
                </div>
                <div>
                  <span className="text-gray-500">{key}: </span>
                  {newVal ?? <span className="italic text-gray-400">null</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}