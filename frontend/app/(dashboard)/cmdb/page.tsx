'use client';

import { useState } from 'react';
import { Server, Monitor, Wifi, Database } from 'lucide-react';

interface AssetNode { id: string; name: string; type: string; dependencies: string[] }

const NODES: AssetNode[] = [
  { id:'1', name:'Web Server', type:'server', dependencies:['3','4'] },
  { id:'2', name:'App Server', type:'server', dependencies:['3','4'] },
  { id:'3', name:'Database Server', type:'database', dependencies:[] },
  { id:'4', name:'Network Switch A', type:'network', dependencies:[] },
  { id:'5', name:'Dev Workstation', type:'computer', dependencies:['4'] },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  server: <Server size={16} className="text-blue-500"/>,
  database: <Database size={16} className="text-purple-500"/>,
  network: <Wifi size={16} className="text-green-500"/>,
  computer: <Monitor size={16} className="text-gray-500"/>,
};

export default function CMDBPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedNode = NODES.find(n => n.id === selected);
  const dependsOn = selectedNode ? NODES.filter(n => selectedNode.dependencies.includes(n.id)) : [];
  const dependents = selected ? NODES.filter(n => n.dependencies.includes(selected)) : [];

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Asset Dependencies (CMDB)</h1><p className="text-sm text-gray-500 mt-1">Link assets and visualise dependencies</p></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Assets</div>
          {NODES.map(n => (
            <button key={n.id} onClick={() => setSelected(n.id)}
              className={w-full text-left px-4 py-3 flex items-center gap-2 border-b border-gray-100 hover:bg-gray-50 }>
              {TYPE_ICON[n.type]}
              <div><p className="text-sm font-medium text-gray-900">{n.name}</p><p className="text-xs text-gray-400 capitalize">{n.type}</p></div>
            </button>
          ))}
        </div>
        <div className="col-span-2 space-y-4">
          {selectedNode ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-1">{TYPE_ICON[selectedNode.type]}<h2 className="text-base font-semibold text-gray-900">{selectedNode.name}</h2></div>
                <p className="text-xs text-gray-400 capitalize">{selectedNode.type}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Depends On</h3>
                {dependsOn.length === 0 ? <p className="text-sm text-gray-400">No dependencies</p> : dependsOn.map(d=><div key={d.id} className="flex items-center gap-2 py-1">{TYPE_ICON[d.type]}<span className="text-sm text-gray-700">{d.name}</span></div>)}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Used By</h3>
                {dependents.length === 0 ? <p className="text-sm text-gray-400">No dependents</p> : dependents.map(d=><div key={d.id} className="flex items-center gap-2 py-1">{TYPE_ICON[d.type]}<span className="text-sm text-gray-700">{d.name}</span></div>)}
              </div>
            </>
          ) : <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">Select an asset to view its dependencies</div>}
        </div>
      </div>
    </div>
  );
}