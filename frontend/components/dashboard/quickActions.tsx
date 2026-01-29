import Link from 'next/link';
import { Plus, FileText, Upload, ArrowRightLeft, ChevronRight, Sparkles } from 'lucide-react';

const actions = [
  {
    label: 'Register new asset',
    description: 'Capture a new item into your asset inventory.',
    icon: Plus,
    color: 'from-sky-500 to-cyan-400',
    href: '/assets/new',
  },
  {
    label: 'Generate report',
    description: 'Export usage and ownership insights.',
    icon: FileText,
    color: 'from-emerald-500 to-teal-400',
    href: '/reports',
  },
  {
    label: 'Bulk import',
    description: 'Upload a CSV or sheet of multiple assets.',
    icon: Upload,
    color: 'from-violet-500 to-indigo-400',
    href: '/assets/import',
  },
  {
    label: 'Request asset',
    description: 'Log a request for a new asset or transfer.',
    icon: ArrowRightLeft,
    color: 'from-amber-500 to-orange-400',
    href: '/requests/new',
  },
];

export default function QuickActions() {
  return (
    <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 md:px-6 md:py-6 shadow-[0_18px_60px_rgba(15,23,42,0.8)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-slate-50">
            Quick actions
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Start the most common workflows directly from your overview.
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 text-slate-300">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-3 text-left text-slate-100 transition-all hover:border-slate-600 hover:bg-slate-900/90"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr ${action.color} text-white shadow-md shadow-slate-900/70`}
              >
                <action.icon size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{action.label}</span>
                <span className="text-[11px] text-slate-500">
                  {action.description}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-200" />
          </Link>
        ))}
      </div>
    </div>
  );
}