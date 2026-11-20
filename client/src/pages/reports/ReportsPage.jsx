import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader.jsx';

export function ReportsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Quality analytics and metric reports."
      />
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-4">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No Reports Available Yet</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          Quality analytics reports and automated data export modules will be configured here.
        </p>
      </div>
    </div>
  );
}
