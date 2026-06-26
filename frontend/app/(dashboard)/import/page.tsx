'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Step = 'upload' | 'map' | 'preview' | 'confirm';

const ASSET_FIELDS = ['name','assetId','category','status','department','serialNumber','purchaseDate'];
const SAMPLE_CSV_HEADERS = ['Asset Name','ID','Type','State','Team','Serial','Bought'];
const SAMPLE_ROWS = [['Laptop A','AST-100','IT','ACTIVE','Engineering','SN-1001','2023-01-01'],['Printer B','AST-101','IT','ACTIVE','Admin','SN-1002','2023-06-15']];

const STEPS: Step[] = ['upload','map','preview','confirm'];

export default function CSVImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFileName(file.name); setStep('map'); }
  };

  const stepIdx = STEPS.indexOf(step);

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Import Assets</h1><p className="text-sm text-gray-500 mt-1">CSV and Excel import wizard</p></div>
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={lex items-center gap-1.5 text-sm }>
              <span className={w-6 h-6 rounded-full flex items-center justify-center text-xs }>{i < stepIdx ? '✓' : i+1}</span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
            {i < STEPS.length-1 && <ChevronRight size={14} className="text-gray-300"/>}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Upload size={32} className="mx-auto text-gray-300 mb-3"/>
          <p className="text-sm font-medium text-gray-700 mb-1">Drop your CSV or Excel file here</p>
          <p className="text-xs text-gray-400 mb-4">Supports .csv, .xlsx</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Browse File</Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFile}/>
        </div>
      )}

      {step === 'map' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Map Columns — {fileName}</h2>
          <div className="space-y-3">
            {SAMPLE_CSV_HEADERS.map(header => (
              <div key={header} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-40">{header}</span>
                <span className="text-gray-300">→</span>
                <select value={mapping[header] ?? ''} onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">Skip</option>
                  {ASSET_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3"><Button onClick={() => setStep('preview')}>Next: Preview</Button><Button variant="outline" onClick={() => setStep('upload')}>Back</Button></div>
        </div>
      )}

      {step === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900">Preview — {SAMPLE_ROWS.length} rows</span>
            <div className="flex gap-3"><Button onClick={() => setStep('confirm')}>Confirm Import</Button><Button variant="outline" onClick={() => setStep('map')}>Back</Button></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50">{SAMPLE_CSV_HEADERS.map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>{SAMPLE_ROWS.map((row,i)=><tr key={i} className="border-b border-gray-100">{row.map((cell,j)=><td key={j} className="px-4 py-3 text-gray-600">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}

      {step === 'confirm' && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CheckCircle size={40} className="mx-auto text-green-500 mb-3"/>
          <h2 className="text-lg font-semibold text-gray-900">Import Successful</h2>
          <p className="text-sm text-gray-500 mt-1">{SAMPLE_ROWS.length} assets imported successfully.</p>
          <Button className="mt-4" onClick={() => setStep('upload')}>Import Another File</Button>
        </div>
      )}
    </div>
  );
}