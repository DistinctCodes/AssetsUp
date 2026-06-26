'use client';

import { useState } from 'react';
import { Building2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrganisationSettingsPage() {
  const [orgName, setOrgName] = useState('Acme Corporation');
  const [tagline, setTagline] = useState('Asset Management Platform');
  const [plan] = useState('Business');

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Organisation Settings</h1><p className="text-sm text-gray-500 mt-1">Manage org name, branding, and plan information</p></div>
      <div className="space-y-4 max-w-xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building2 size={16}/>Organisation Details</h2>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-gray-500 block mb-1">Organisation Name</label>
              <input value={orgName} onChange={e=>setOrgName(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"/></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">Tagline</label>
              <input value={tagline} onChange={e=>setTagline(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"/></div>
          </div>
          <Button className="mt-4">Save Changes</Button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Branding</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center"><Building2 size={24} className="text-gray-400"/></div>
            <div><p className="text-sm text-gray-700 mb-1">Organisation Logo</p><p className="text-xs text-gray-400 mb-2">PNG or SVG, max 2MB</p>
              <Button variant="outline" size="sm"><Upload size={14} className="mr-1.5"/>Upload Logo</Button></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Plan Information</h2>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-700">Current Plan</p><p className="text-2xl font-bold text-gray-900 mt-0.5">{plan}</p></div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">Active</span>
          </div>
          <Button variant="outline" className="mt-3 text-sm">Upgrade Plan</Button>
        </div>
      </div>
    </div>
  );
}