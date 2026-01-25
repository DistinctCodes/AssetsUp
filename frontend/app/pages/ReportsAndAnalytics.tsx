import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, Calendar, Filter, Save, Play, Clock, TrendingUp, Package, DollarSign, Activity, X, Plus, Trash2, Eye, Mail } from 'lucide-react';

// Type Definitions
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface CustomReport {
  id?: string;
  name: string;
  description: string;
  fields: string[];
  filters: Record<string, any>;
  groupBy: string;
  sortBy: string;
  createdAt?: string;
}

interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: string;
  time: string;
  recipients: string[];
  format: string;
  isActive: boolean;
  nextRunAt: string;
  createdAt: string;
}

interface FieldDefinition {
  id: string;
  label: string;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface ValueData {
  month: string;
  value: number;
}

interface DepartmentData {
  department: string;
  count: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface TopAsset {
  name: string;
  value: number;
}

// Declare window.storage for TypeScript
declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ key: string; value: string } | null>;
      set: (key: string, value: string) => Promise<{ key: string; value: string } | null>;
      delete: (key: string) => Promise<{ key: string; deleted: boolean } | null>;
      list: (prefix?: string) => Promise<{ keys: string[] } | null>;
    };
  }
}

// Simulated API calls
const mockApi = {
  async getTemplates(): Promise<ReportTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { id: 'asset-inventory', name: 'Asset Inventory Report', description: 'Complete list of all assets with full details', type: 'INVENTORY' },
      { id: 'asset-value', name: 'Asset Value Report', description: 'Asset values grouped by department, location, or category', type: 'VALUE' },
      { id: 'depreciation', name: 'Depreciation Report', description: 'Asset value depreciation over time', type: 'DEPRECIATION' },
      { id: 'utilization', name: 'Asset Utilization Report', description: 'Assigned vs unassigned assets', type: 'UTILIZATION' },
      { id: 'warranty', name: 'Warranty Expiration Report', description: 'Upcoming warranty expirations', type: 'WARRANTY' },
      { id: 'maintenance', name: 'Maintenance Schedule Report', description: 'Scheduled and completed maintenance activities', type: 'MAINTENANCE' },
      { id: 'transfer-history', name: 'Transfer History Report', description: 'Asset transfer and assignment history', type: 'TRANSFER' },
      { id: 'audit-trail', name: 'Audit Trail Report', description: 'All changes by user and date', type: 'AUDIT' }
    ];
  },

  async getSavedReports(): Promise<CustomReport[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const result = await window.storage.get('saved-custom-reports');
      return result ? JSON.parse(result.value) : [];
    } catch {
      return [];
    }
  },

  async saveCustomReport(report: CustomReport): Promise<CustomReport> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const saved = await this.getSavedReports();
    const newReport: CustomReport = { ...report, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const updated = [...saved, newReport];
    await window.storage.set('saved-custom-reports', JSON.stringify(updated));
    return newReport;
  },

  async deleteCustomReport(id: string): Promise<void> {
    const saved = await this.getSavedReports();
    const updated = saved.filter((r: CustomReport) => r.id !== id);
    await window.storage.set('saved-custom-reports', JSON.stringify(updated));
  },

  async getScheduledReports(): Promise<ScheduledReport[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const result = await window.storage.get('scheduled-reports');
      return result ? JSON.parse(result.value) : [];
    } catch {
      return [];
    }
  },

  async scheduleReport(schedule: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextRunAt'>): Promise<ScheduledReport> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const scheduled = await this.getScheduledReports();
    const newSchedule: ScheduledReport = { 
      ...schedule, 
      id: Date.now().toString(), 
      createdAt: new Date().toISOString(),
      nextRunAt: this.calculateNextRun(schedule.frequency, schedule.time)
    };
    const updated = [...scheduled, newSchedule];
    await window.storage.set('scheduled-reports', JSON.stringify(updated));
    return newSchedule;
  },

  async deleteScheduledReport(id: string): Promise<void> {
    const scheduled = await this.getScheduledReports();
    const updated = scheduled.filter((r: ScheduledReport) => r.id !== id);
    await window.storage.set('scheduled-reports', JSON.stringify(updated));
  },

  calculateNextRun(frequency: string, time: string): string {
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const next = new Date(now);
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (next <= now) {
      if (frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    }
    
    return next.toISOString();
  },

  async generateReport(templateId: string, format: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      id: Date.now().toString(),
      templateId,
      format,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      fileSize: Math.floor(Math.random() * 1000) + 100
    };
  }
};

const ReportsAndAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'custom' | 'analytics' | 'scheduled'>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customReport, setCustomReport] = useState<CustomReport>({
    name: '', description: '', fields: [], filters: {}, groupBy: '', sortBy: ''
  });
  const [savedReports, setSavedReports] = useState<CustomReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [scheduleForm, setScheduleForm] = useState({
    frequency: 'daily', time: '09:00', recipients: '', format: 'PDF'
  });

  const availableFields: FieldDefinition[] = [
    { id: 'id', label: 'Asset ID' },
    { id: 'name', label: 'Asset Name' },
    { id: 'assetTag', label: 'Asset Tag' },
    { id: 'serialNumber', label: 'Serial Number' },
    { id: 'category', label: 'Category' },
    { id: 'department', label: 'Department' },
    { id: 'location', label: 'Location' },
    { id: 'status', label: 'Status' },
    { id: 'purchaseDate', label: 'Purchase Date' },
    { id: 'purchasePrice', label: 'Purchase Price' },
    { id: 'currentValue', label: 'Current Value' },
    { id: 'assignedTo', label: 'Assigned To' },
    { id: 'warrantyExpiry', label: 'Warranty Expiry' }
  ];

  // Analytics mock data
  const analyticsData = {
    totalAssets: 1400,
    totalValue: 580000,
    utilization: 84,
    expiringWarranties: 23,
    categoryData: [
      { name: 'Computers', value: 450, color: '#3b82f6' },
      { name: 'Furniture', value: 320, color: '#10b981' },
      { name: 'Equipment', value: 280, color: '#f59e0b' },
      { name: 'Vehicles', value: 150, color: '#ef4444' },
      { name: 'Others', value: 200, color: '#8b5cf6' }
    ] as CategoryData[],
    valueData: [
      { month: 'Jan', value: 450000 }, { month: 'Feb', value: 480000 },
      { month: 'Mar', value: 520000 }, { month: 'Apr', value: 490000 },
      { month: 'May', value: 550000 }, { month: 'Jun', value: 580000 }
    ] as ValueData[],
    departmentData: [
      { department: 'IT', count: 425 }, { department: 'HR', count: 180 },
      { department: 'Finance', count: 220 }, { department: 'Operations', count: 310 },
      { department: 'Sales', count: 265 }
    ] as DepartmentData[],
    statusData: [
      { status: 'Active', count: 980 }, { status: 'In Maintenance', count: 180 },
      { status: 'Retired', count: 140 }, { status: 'In Storage', count: 100 }
    ] as StatusData[],
    topAssets: [
      { name: 'Server Rack A1', value: 45000 },
      { name: 'Company Vehicle 1', value: 38000 },
      { name: 'Conference System', value: 32000 },
      { name: 'Network Core Switch', value: 28000 },
      { name: 'Production Printer', value: 25000 },
      { name: 'Server Rack B2', value: 23000 },
      { name: 'Video Wall Display', value: 21000 },
      { name: 'Security System', value: 19000 },
      { name: 'HVAC Unit', value: 18000 },
      { name: 'Backup Generator', value: 17000 }
    ] as TopAsset[]
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, savedData, scheduledData] = await Promise.all([
        mockApi.getTemplates(),
        mockApi.getSavedReports(),
        mockApi.getScheduledReports()
      ]);
      setTemplates(templatesData);
      setSavedReports(savedData);
      setScheduledReports(scheduledData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (format: string) => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      await mockApi.generateReport(selectedTemplate.id, format);
      
      const filename = `${selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')}.${format.toLowerCase()}`;
      alert(`Report generated successfully!\nFile: ${filename}\n\nIn production, this would download the ${format} file.`);
    } catch (error) {
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomReport = async () => {
    if (!customReport.name || customReport.fields.length === 0) {
      alert('Please provide a report name and select at least one field');
      return;
    }
    
    setLoading(true);
    try {
      await mockApi.saveCustomReport(customReport);
      alert('Custom report saved successfully!');
      await loadData();
      setCustomReport({ name: '', description: '', fields: [], filters: {}, groupBy: '', sortBy: '' });
    } catch (error) {
      alert('Failed to save custom report');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    setLoading(true);
    try {
      await mockApi.deleteCustomReport(id);
      await loadData();
      alert('Report deleted successfully');
    } catch (error) {
      alert('Failed to delete report');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleReport = async () => {
    if (!scheduleForm.recipients) {
      alert('Please add at least one recipient email');
      return;
    }
    
    setLoading(true);
    try {
      const schedule = {
        reportId: selectedTemplate?.id || savedReports[0]?.id || '',
        reportName: selectedTemplate?.name || savedReports[0]?.name || '',
        frequency: scheduleForm.frequency,
        time: scheduleForm.time,
        recipients: scheduleForm.recipients.split(',').map(e => e.trim()),
        format: scheduleForm.format,
        isActive: true
      };
      
      await mockApi.scheduleReport(schedule);
      alert('Report scheduled successfully!');
      await loadData();
      setShowScheduleModal(false);
      setScheduleForm({ frequency: 'daily', time: '09:00', recipients: '', format: 'PDF' });
    } catch (error) {
      alert('Failed to schedule report');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;
    
    setLoading(true);
    try {
      await mockApi.deleteScheduledReport(id);
      await loadData();
      alert('Scheduled report deleted successfully');
    } catch (error) {
      alert('Failed to delete scheduled report');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    setCustomReport(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldId) 
        ? prev.fields.filter((f: string) => f !== fieldId) 
        : [...prev.fields, fieldId]
    }));
  };

  const tabs = [
    { id: 'templates' as const, label: 'Report Templates', icon: FileText },
    { id: 'custom' as const, label: 'Custom Builder', icon: Filter },
    { id: 'analytics' as const, label: 'Analytics Dashboard', icon: TrendingUp },
    { id: 'scheduled' as const, label: 'Scheduled Reports', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Generate comprehensive reports, visualize analytics, and schedule automated reporting</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-6 shadow-sm">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Pre-built Templates</h2>
                <span className="text-sm text-gray-500">{templates.length} templates</span>
              </div>
              
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id 
                        ? 'border-blue-600 bg-blue-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start">
                      <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {savedReports.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Saved Custom Reports</h3>
                  <div className="space-y-3">
                    {savedReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-green-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{report.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{report.description || 'Custom report'}</p>
                            <p className="text-xs text-gray-500 mt-1">{report.fields.length} fields selected</p>
                          </div>
                          <button
                            onClick={() => report.id && handleDeleteSavedReport(report.id)}
                            className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              {selectedTemplate ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h3>
                      <p className="text-gray-600 mt-1">{selectedTemplate.description}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['PDF', 'Excel', 'CSV', 'JSON'].map(format => (
                          <button
                            key={format}
                            onClick={() => handleGenerateReport(format)}
                            disabled={loading}
                            className="py-3 px-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {format}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule This Report
                      </button>
                    </div>

                    <div className="pt-4 border-t">
                      <button
                        onClick={() => setShowPreviewModal(true)}
                        className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all font-medium flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Report
                      </button>
                    </div>

                    {loading && (
                      <div className="text-center py-6">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-gray-600 mt-3 font-medium">Generating report...</p>
                        <p className="text-sm text-gray-500 mt-1">This may take a moment for large datasets</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <FileText className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Select a template to get started</p>
                  <p className="text-sm mt-2">Choose from pre-built templates or create a custom report</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Builder Tab */}
        {activeTab === 'custom' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Custom Report Builder</h2>
            
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={customReport.name}
                    onChange={(e) => setCustomReport({...customReport, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Monthly IT Assets Report"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={customReport.description}
                    onChange={(e) => setCustomReport({...customReport, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the report"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Fields to Include <span className="text-red-600">*</span>
                  <span className="text-gray-500 font-normal ml-2">({customReport.fields.length} selected)</span>
                </label>
                <div className="grid md:grid-cols-3 gap-3">
                  {availableFields.map(field => (
                    <label 
                      key={field.id} 
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        customReport.fields.includes(field.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={customReport.fields.includes(field.id)}
                        onChange={() => handleFieldToggle(field.id)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
                  <select 
                    value={customReport.groupBy}
                    onChange={(e) => setCustomReport({...customReport, groupBy: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Grouping</option>
                    <option value="category">Category</option>
                    <option value="department">Department</option>
                    <option value="location">Location</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select 
                    value={customReport.sortBy}
                    onChange={(e) => setCustomReport({...customReport, sortBy: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Default Order</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="date-desc">Purchase Date (Newest First)</option>
                    <option value="date-asc">Purchase Date (Oldest First)</option>
                    <option value="value-desc">Value (Highest First)</option>
                    <option value="value-asc">Value (Lowest First)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t flex gap-3">
                <button
                  onClick={handleSaveCustomReport}
                  disabled={!customReport.name || customReport.fields.length === 0 || loading}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Report Configuration
                </button>
                <button
                  onClick={() => setCustomReport({ name: '', description: '', fields: [], filters: {}, groupBy: '', sortBy: '' })}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
// Missing Analytics Tab Section and Modals

{/* Analytics Tab - COMPLETE VERSION */}
{activeTab === 'analytics' && (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid md:grid-cols-4 gap-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-100 text-sm font-medium">Total Assets</span>
          <Package className="w-5 h-5 text-blue-200" />
        </div>
        <div className="text-3xl font-bold">{analyticsData.totalAssets.toLocaleString()}</div>
        <div className="text-sm text-blue-100 mt-2">+12% from last month</div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-green-100 text-sm font-medium">Total Value</span>
          <DollarSign className="w-5 h-5 text-green-200" />
        </div>
        <div className="text-3xl font-bold">${(analyticsData.totalValue / 1000).toFixed(0)}K</div>
        <div className="text-sm text-green-100 mt-2">+5.4% from last month</div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-orange-100 text-sm font-medium">Utilization Rate</span>
          <Activity className="w-5 h-5 text-orange-200" />
        </div>
        <div className="text-3xl font-bold">{analyticsData.utilization}%</div>
        <div className="text-sm text-orange-100 mt-2">-2% from last month</div>
      </div>

      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-red-100 text-sm font-medium">Expiring Soon</span>
          <Clock className="w-5 h-5 text-red-200" />
        </div>
        <div className="text-3xl font-bold">{analyticsData.expiringWarranties}</div>
        <div className="text-sm text-red-100 mt-2">Warranties in 90 days</div>
      </div>
    </div>

    {/* Charts */}
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Distribution by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={analyticsData.categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {analyticsData.categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Value Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analyticsData.valueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value: any) => `$${(value / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department-wise Allocation</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyticsData.departmentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyticsData.statusData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" />
            <YAxis dataKey="status" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="#f59e0b" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Most Expensive Assets</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={analyticsData.topAssets} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
            <YAxis tickFormatter={(value: any) => `$${(value / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
)}

{/* Scheduled Reports Tab */}
{activeTab === 'scheduled' && (
  <div className="bg-white rounded-lg shadow-sm">
    <div className="p-6 border-b flex justify-between items-center">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Scheduled Reports</h2>
        <p className="text-sm text-gray-600 mt-1">Automate report generation and delivery</p>
      </div>
      <button
        onClick={() => setShowScheduleModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Schedule
      </button>
    </div>

    <div className="p-6">
      {scheduledReports.length > 0 ? (
        <div className="space-y-4">
          {scheduledReports.map(schedule => (
            <div key={schedule.id} className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{schedule.reportName}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    schedule.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {schedule.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} at {schedule.time}
                  </div>
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-1" />
                    {schedule.format}
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {schedule.recipients.length} recipient(s)
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Next run: {new Date(schedule.nextRunAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteScheduled(schedule.id)}
                className="ml-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <Calendar className="w-20 h-20 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No scheduled reports</p>
          <p className="text-sm mt-2">Create automated report schedules to save time</p>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Schedule
          </button>
        </div>
      )}
    </div>
  </div>
)}

{/* Schedule Modal */}
{showScheduleModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div className="flex justify-between items-center p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Schedule Report</h3>
        <button 
          onClick={() => setShowScheduleModal(false)} 
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
          <select
            value={scheduleForm.frequency}
            onChange={(e) => setScheduleForm({...scheduleForm, frequency: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (Every Monday)</option>
            <option value="monthly">Monthly (1st of month)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
          <input
            type="time"
            value={scheduleForm.time}
            onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
          <select
            value={scheduleForm.format}
            onChange={(e) => setScheduleForm({...scheduleForm, format: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="PDF">PDF</option>
            <option value="Excel">Excel</option>
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Recipients <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={scheduleForm.recipients}
            onChange={(e) => setScheduleForm({...scheduleForm, recipients: e.target.value})}
            placeholder="email1@example.com, email2@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
        </div>
      </div>

      <div className="p-6 border-t flex gap-3">
        <button
          onClick={() => setShowScheduleModal(false)}
          className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleScheduleReport}
          disabled={!scheduleForm.recipients || loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Scheduling...' : 'Schedule Report'}
        </button>
      </div>
    </div>
  </div>
)}

{/* Preview Modal */}
{showPreviewModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Report Preview</h3>
        <button 
          onClick={() => setShowPreviewModal(false)} 
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <div className="mb-4 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate?.name}</h2>
          <p className="text-gray-600 mt-1">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-center text-gray-600 py-8">
            Report preview would display sample data here based on the selected template and filters.
          </p>
          <div className="mt-4 space-y-2">
            <div className="bg-white p-3 rounded border">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <span className="font-semibold">Asset ID</span>
                <span className="font-semibold">Name</span>
                <span className="font-semibold">Category</span>
                <span className="font-semibold">Value</span>
              </div>
            </div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white p-3 rounded border">
                <div className="grid grid-cols-4 gap-2 text-sm text-gray-700">
                  <span>AST-{String(i).padStart(5, '0')}</span>
                  <span>Sample Asset {i}</span>
                  <span>Equipment</span>
                  <span>${(Math.random() * 5000 + 1000).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 border-t">
        <button
          onClick={() => setShowPreviewModal(false)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
        >
          Close Preview
        </button>
      </div>
    </div>
  </div>
)}

// Component closing tags
      </div>
    </div>
  );
};

export default ReportsAndAnalytics;