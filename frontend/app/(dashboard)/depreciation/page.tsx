'use client';

import { useState, useMemo } from 'react';

interface DepreciationRow {
  id: string;
  assetName: string;
  category: 'electronics' | 'furniture' | 'equipment' | 'vehicle' | 'other';
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  method: 'straight-line' | 'declining-balance';
}

const MOCK: DepreciationRow[] = [
  { id: '1', assetName: 'Dell Laptop #1', category: 'electronics', purchaseDate: '2022-01-01', purchaseCost: 1200, salvageValue: 0, usefulLifeYears: 4, method: 'straight-line' },
  { id: '2', assetName: 'HP Printer', category: 'electronics', purchaseDate: '2021-06-15', purchaseCost: 800, salvageValue: 0, usefulLifeYears: 5, method: 'straight-line' },
  { id: '3', assetName: 'Office Chair', category: 'furniture', purchaseDate: '2023-03-01', purchaseCost: 400, salvageValue: 0, usefulLifeYears: 7, method: 'straight-line' },
  { id: '4', assetName: 'MacBook Pro', category: 'electronics', purchaseDate: '2023-09-01', purchaseCost: 2400, salvageValue: 200, usefulLifeYears: 4, method: 'declining-balance' },
  { id: '5', assetName: 'Standing Desk', category: 'furniture', purchaseDate: '2022-11-01', purchaseCost: 950, salvageValue: 50, usefulLifeYears: 10, method: 'straight-line' },
];

const CATEGORY_COLORS: Record<DepreciationRow['category'], string> = {
  electronics: '#6366f1',
  furniture: '#f59e0b',
  equipment: '#10b981',
  vehicle: '#3b82f6',
  other: '#8b5cf6',
};

const CATEGORY_LABELS: Record<DepreciationRow['category'], string> = {
  electronics: 'Electronics',
  furniture: 'Furniture',
  equipment: 'Equipment',
  vehicle: 'Vehicle',
  other: 'Other',
};

function calcDerived(row: DepreciationRow, today = new Date()) {
  const purchaseDate = new Date(row.purchaseDate);
  const yearsElapsed = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const clampedYears = Math.min(yearsElapsed, row.usefulLifeYears);

  let bookValue: number;
  let annualDepreciation: number;

  if (row.method === 'straight-line') {
    annualDepreciation = (row.purchaseCost - row.salvageValue) / row.usefulLifeYears;
    bookValue = Math.max(row.purchaseCost - annualDepreciation * clampedYears, row.salvageValue);
  } else {
    // Double declining balance
    const rate = (2 / row.usefulLifeYears);
    bookValue = row.purchaseCost * Math.pow(1 - rate, clampedYears);
    bookValue = Math.max(bookValue, row.salvageValue);
    annualDepreciation = row.purchaseCost * rate * Math.pow(1 - rate, Math.max(0, clampedYears - 1));
  }

  const depPct = ((row.purchaseCost - bookValue) / row.purchaseCost) * 100;
  const remainingLife = Math.max(0, row.usefulLifeYears - yearsElapsed);
  const isFullyDepreciated = bookValue <= row.salvageValue + 1;

  return { bookValue, annualDepreciation, depPct, remainingLife, yearsElapsed: clampedYears, isFullyDepreciated };
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function DepreciationBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.03em',
      background: color + '18',
      color,
      border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

type SortKey = 'assetName' | 'purchaseCost' | 'bookValue' | 'annualDepreciation' | 'depPct' | 'remainingLife';

const MODAL_EMPTY: DepreciationRow = {
  id: '',
  assetName: '',
  category: 'electronics',
  purchaseDate: new Date().toISOString().split('T')[0],
  purchaseCost: 0,
  salvageValue: 0,
  usefulLifeYears: 5,
  method: 'straight-line',
};

export default function DepreciationPage() {
  const [rows, setRows] = useState<DepreciationRow[]>(MOCK);
  const [sortKey, setSortKey] = useState<SortKey>('assetName');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterCat, setFilterCat] = useState<DepreciationRow['category'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<DepreciationRow>(MODAL_EMPTY);
  const [activeTab, setActiveTab] = useState<'table' | 'schedule'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const enriched = useMemo(() => rows.map(r => ({ ...r, ...calcDerived(r) })), [rows]);

  const filtered = useMemo(() => {
    let out = enriched;
    if (filterCat !== 'all') out = out.filter(r => r.category === filterCat);
    if (search.trim()) out = out.filter(r => r.assetName.toLowerCase().includes(search.toLowerCase()));
    out = [...out].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      return sortAsc
        ? av < bv ? -1 : av > bv ? 1 : 0
        : av > bv ? -1 : av < bv ? 1 : 0;
    });
    return out;
  }, [enriched, filterCat, search, sortKey, sortAsc]);

  const totalCost = filtered.reduce((s, r) => s + r.purchaseCost, 0);
  const totalBook = filtered.reduce((s, r) => s + r.bookValue, 0);
  const totalDep = filtered.reduce((s, r) => s + r.annualDepreciation, 0);
  const totalAccumulated = filtered.reduce((s, r) => s + (r.purchaseCost - r.bookValue), 0);
  const avgDepPct = filtered.length ? filtered.reduce((s, r) => s + r.depPct, 0) / filtered.length : 0;

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  function openAdd() { setEditRow({ ...MODAL_EMPTY, id: Date.now().toString() }); setShowModal(true); }
  function openEdit(row: DepreciationRow) { setEditRow(row); setShowModal(true); }
  function deleteRow(id: string) { setRows(rs => rs.filter(r => r.id !== id)); }
  function saveRow() {
    if (!editRow.assetName || editRow.purchaseCost <= 0) return;
    setRows(rs => rs.some(r => r.id === editRow.id) ? rs.map(r => r.id === editRow.id ? editRow : r) : [...rs, editRow]);
    setShowModal(false);
  }

  // Generate depreciation schedule for expanded row
  function getSchedule(row: DepreciationRow) {
    const rows: { year: number; openingBV: number; depreciation: number; closingBV: number }[] = [];
    let bv = row.purchaseCost;
    const rate = row.method === 'declining-balance' ? 2 / row.usefulLifeYears : 0;
    const slDep = (row.purchaseCost - row.salvageValue) / row.usefulLifeYears;
    for (let y = 1; y <= row.usefulLifeYears; y++) {
      const dep = row.method === 'straight-line' ? slDep : bv * rate;
      const closingBV = Math.max(bv - dep, row.salvageValue);
      rows.push({ year: y, openingBV: bv, depreciation: bv - closingBV, closingBV });
      bv = closingBV;
      if (bv <= row.salvageValue) break;
    }
    return rows;
  }

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span style={{ marginLeft: 4, opacity: sortKey === k ? 1 : 0.3, fontSize: 10 }}>
      {sortKey === k ? (sortAsc ? '▲' : '▼') : '⇅'}
    </span>
  );

  const categories = Array.from(new Set(rows.map(r => r.category)));

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f8fafc', minHeight: '100vh', padding: '32px 24px', color: '#0f172a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Asset Depreciation</h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Track book value, depreciation schedules, and asset aging across your portfolio.</p>
          </div>
          <button onClick={openAdd} style={{
            padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(99,102,241,0.35)'
          }}>
            + Add Asset
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Asset Cost', value: fmt(totalCost), sub: `${filtered.length} assets`, accent: '#6366f1' },
            { label: 'Total Book Value', value: fmt(totalBook), sub: `${(100 - avgDepPct).toFixed(0)}% remaining`, accent: '#10b981' },
            { label: 'Accumulated Depreciation', value: fmt(totalAccumulated), sub: `${avgDepPct.toFixed(0)}% avg depreciated`, accent: '#f59e0b' },
            { label: 'Annual Depreciation', value: fmt(totalDep), sub: 'Current year expense', accent: '#ef4444' },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent, borderRadius: '14px 14px 0 0' }} />
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748b', fontWeight: 500 }}>{c.label}</p>
              <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>{c.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters + Tabs */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>🔍</span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search assets…"
                style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a' }}
              />
            </div>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', ...categories] as const).map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat as typeof filterCat)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: filterCat === cat ? (cat === 'all' ? '#0f172a' : CATEGORY_COLORS[cat as DepreciationRow['category']]) : 'transparent',
                  color: filterCat === cat ? '#fff' : '#64748b',
                  borderColor: filterCat === cat ? 'transparent' : '#e2e8f0',
                }}>
                  {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as DepreciationRow['category']]}
                </button>
              ))}
            </div>
            {/* Tabs */}
            <div style={{ marginLeft: 'auto', display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
              {(['table', 'schedule'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: activeTab === t ? '#fff' : 'transparent',
                  color: activeTab === t ? '#0f172a' : '#94a3b8',
                  boxShadow: activeTab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                  {t === 'table' ? 'Assets' : 'Schedule'}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Table */}
          {activeTab === 'table' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {[
                      { label: 'Asset', key: 'assetName' as SortKey },
                      { label: 'Category', key: null },
                      { label: 'Purchase Date', key: null },
                      { label: 'Cost', key: 'purchaseCost' as SortKey },
                      { label: 'Book Value', key: 'bookValue' as SortKey },
                      { label: 'Annual Dep.', key: 'annualDepreciation' as SortKey },
                      { label: 'Depreciated', key: 'depPct' as SortKey },
                      { label: 'Remaining Life', key: 'remainingLife' as SortKey },
                      { label: '', key: null },
                    ].map((col, i) => (
                      <th key={i} onClick={col.key ? () => handleSort(col.key!) : undefined}
                        style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', cursor: col.key ? 'pointer' : 'default', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' }}>
                        {col.label}{col.key && <SortIcon k={col.key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No assets match your filters.</td></tr>
                  )}
                  {filtered.map(r => {
                    const color = CATEGORY_COLORS[r.category];
                    const isExpanded = expandedId === r.id;
                    return (
                      <>
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: isExpanded ? '#fafbff' : undefined }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = isExpanded ? '#fafbff' : '')}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 6, height: 28, borderRadius: 99, background: color, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.assetName}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{r.method === 'straight-line' ? 'SL' : 'DDB'} · {r.usefulLifeYears}yr life</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}><Badge label={CATEGORY_LABELS[r.category]} color={color} /></td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{new Date(r.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{fmt(r.purchaseCost)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: r.isFullyDepreciated ? '#ef4444' : '#0f172a' }}>{fmt(r.bookValue)}</div>
                            {r.isFullyDepreciated && <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 1 }}>FULLY DEPRECIATED</div>}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{fmt(r.annualDepreciation)}<span style={{ color: '#94a3b8', fontSize: 11 }}>/yr</span></td>
                          <td style={{ padding: '12px 16px', minWidth: 120 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1 }}><DepreciationBar pct={r.depPct} color={r.depPct > 80 ? '#ef4444' : r.depPct > 50 ? '#f59e0b' : '#10b981'} /></div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', minWidth: 34 }}>{r.depPct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12 }}>
                            {r.isFullyDepreciated ? '—' : `${r.remainingLife.toFixed(1)}y`}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => setExpandedId(isExpanded ? null : r.id)} title="Schedule"
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: isExpanded ? '#6366f1' : '#fff', color: isExpanded ? '#fff' : '#64748b', cursor: 'pointer', fontSize: 12 }}>
                                📅
                              </button>
                              <button onClick={() => openEdit(r)} title="Edit"
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>
                                ✏️
                              </button>
                              <button onClick={() => deleteRow(r.id)} title="Delete"
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${r.id}-schedule`} style={{ background: '#fafbff' }}>
                            <td colSpan={9} style={{ padding: '0 16px 16px 48px' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 8, marginTop: 4 }}>Year-by-Year Schedule — {r.assetName}</div>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 420 }}>
                                  <thead>
                                    <tr>
                                      {['Year', 'Opening BV', 'Depreciation', 'Closing BV'].map(h => (
                                        <th key={h} style={{ padding: '6px 14px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getSchedule(r).map(s => (
                                      <tr key={s.year} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '6px 14px', color: '#6366f1', fontWeight: 700 }}>Y{s.year}</td>
                                        <td style={{ padding: '6px 14px', color: '#475569' }}>{fmt(s.openingBV)}</td>
                                        <td style={{ padding: '6px 14px', color: '#f59e0b', fontWeight: 600 }}>({fmt(s.depreciation)})</td>
                                        <td style={{ padding: '6px 14px', color: '#0f172a', fontWeight: 600 }}>{fmt(s.closingBV)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={3} style={{ padding: '12px 16px', fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Totals</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{fmt(totalCost)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{fmt(totalBook)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{fmt(totalDep)}<span style={{ color: '#94a3b8', fontSize: 11 }}>/yr</span></td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Schedule Summary Tab */}
          {activeTab === 'schedule' && (
            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>Consolidated depreciation by year across all filtered assets.</p>
              {(() => {
                const maxYear = Math.max(...filtered.map(r => r.usefulLifeYears));
                const yearTotals: { year: number; totalDep: number; totalBV: number }[] = [];
                for (let y = 1; y <= maxYear; y++) {
                  let dep = 0, bv = 0;
                  filtered.forEach(r => {
                    const sched = getSchedule(r);
                    const row = sched.find(s => s.year === y);
                    if (row) { dep += row.depreciation; bv += row.closingBV; }
                  });
                  if (dep > 0) yearTotals.push({ year: y, totalDep: dep, totalBV: bv });
                }
                const maxDep = Math.max(...yearTotals.map(y => y.totalDep));
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {yearTotals.map(y => (
                      <div key={y.year} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, fontSize: 12, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>Y{y.year}</div>
                        <div style={{ flex: 1, height: 24, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ width: `${(y.totalDep / maxDep) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 6, transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ minWidth: 90, fontSize: 12, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{fmt(y.totalDep)}</div>
                        <div style={{ minWidth: 90, fontSize: 12, color: '#64748b', textAlign: 'right' }}>BV {fmt(y.totalBV)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
            onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{rows.some(r => r.id === editRow.id) ? 'Edit Asset' : 'Add New Asset'}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Asset Name', key: 'assetName', type: 'text', colSpan: 2 },
                  { label: 'Purchase Date', key: 'purchaseDate', type: 'date' },
                  { label: 'Purchase Cost ($)', key: 'purchaseCost', type: 'number' },
                  { label: 'Salvage Value ($)', key: 'salvageValue', type: 'number' },
                  { label: 'Useful Life (years)', key: 'usefulLifeYears', type: 'number' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: (f as any).colSpan === 2 ? 'span 2' : undefined }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>{f.label}</label>
                    <input type={f.type}
                      value={(editRow as any)[f.key]}
                      onChange={e => setEditRow(r => ({ ...r, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Category</label>
                  <select value={editRow.category} onChange={e => setEditRow(r => ({ ...r, category: e.target.value as DepreciationRow['category'] }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a' }}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Method</label>
                  <select value={editRow.method} onChange={e => setEditRow(r => ({ ...r, method: e.target.value as DepreciationRow['method'] }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a' }}>
                    <option value="straight-line">Straight-Line</option>
                    <option value="declining-balance">Double Declining</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
                <button onClick={saveRow} style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {rows.some(r => r.id === editRow.id) ? 'Save Changes' : 'Add Asset'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}