import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader.jsx';

export function DashboardsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboards"
        description="Executive quality performance and complaint metrics."
      />
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
          <LayoutDashboard className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Dashboards</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          Dashboard views, KPI charts, and quality performance metrics will be configured here.
        </p>
      </div>
    </div>
  );
}
