'use client';

import { useState } from 'react';

export default function TransfersPage() {
  const [filter, setFilter] = useState('ALL');

  const mockTransfers = [
    { id: 'tr-1', assetName: 'MacBook Pro M2', from: 'Engineering', to: 'Design', requester: 'Alex Johnson', status: 'PENDING', date: '2026-07-28' },
    { id: 'tr-2', assetName: 'Dell UltraSharp Monitor', from: 'Marketing', to: 'Sales', requester: 'Sam Lee', status: 'APPROVED', date: '2026-07-27' },
  ];

  const filteredTransfers = filter === 'ALL' ? mockTransfers : mockTransfers.filter(t => t.status === filter);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Asset Transfers Inbox</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
              backgroundColor: filter === status ? '#0070f3' : '#fff',
              color: filter === status ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ padding: '0.5rem' }}>ID</th>
            <th style={{ padding: '0.5rem' }}>Asset</th>
            <th style={{ padding: '0.5rem' }}>From → To</th>
            <th style={{ padding: '0.5rem' }}>Requester</th>
            <th style={{ padding: '0.5rem' }}>Date</th>
            <th style={{ padding: '0.5rem' }}>Status</th>
            <th style={{ padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransfers.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{item.id}</td>
              <td style={{ padding: '0.5rem' }}>{item.assetName}</td>
              <td style={{ padding: '0.5rem' }}>{item.from} → {item.to}</td>
              <td style={{ padding: '0.5rem' }}>{item.requester}</td>
              <td style={{ padding: '0.5rem' }}>{item.date}</td>
              <td style={{ padding: '0.5rem' }}><strong>{item.status}</strong></td>
              <td style={{ padding: '0.5rem' }}>
                {item.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer' }}>Approve</button>
                    <button style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer' }}>Reject</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
