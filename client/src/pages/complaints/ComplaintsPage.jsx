import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Compass,
  Pin,
  Settings,
  Grid,
  RefreshCw,
  ArrowUpDown,
  Pencil,
  PieChart,
  Filter,
} from 'lucide-react';
import { complaintApi, adminApi } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync, useDebounced } from '../../lib/useAsync.js';
import { formatDate, formatDateTime, formatSfDateTime } from '../../lib/format.js';
import { Button } from '../../components/Button.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { NewComplaintModal } from './NewComplaintModal.jsx';

const COLUMNS = [
  { key: 'idx', label: '#', sortable: false, thClass: 'w-8 px-2.5 text-center' },
  { key: 'number', label: 'Complaint No', sortable: true, thClass: 'px-3 whitespace-nowrap' },
  { key: 'stage', label: 'Stage', sortable: true, thClass: 'px-2.5 whitespace-nowrap' },
  { key: 'date', label: 'Complaint date', sortable: true, thClass: 'px-3 whitespace-nowrap' },
  { key: 'sbu', label: 'SBU', sortable: true, thClass: 'px-3 whitespace-nowrap' },
  { key: 'product', label: 'Prod...', sortable: false, thClass: 'px-3 max-w-[14rem] truncate' },
  { key: 'description', label: 'Short Description of the Compl...', sortable: false, thClass: 'px-3 min-w-[14rem]' },
  { key: 'created', label: 'Created Date', sortable: true, thClass: 'px-3 whitespace-nowrap' },
  { key: 'updated', label: 'Last Modi...', sortable: true, thClass: 'px-3 whitespace-nowrap' },
  { key: 'requester', label: 'Requested By', sortable: false, thClass: 'px-3 max-w-[11rem] truncate' },
];

const FILTER_KEYS = ['search', 'status', 'stage', 'sbu', 'country', 'open', 'overdue'];

/**
 * Filters live in the URL, so a filtered list can be bookmarked or shared
 * and dashboard tiles can link straight to it.
 */
export function ComplaintsPage({ mine = false }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const get = (k, d = '') => params.get(k) || d;
  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const [searchText, setSearchText] = useState(get('search'));
  const search = useDebounced(searchText);
  useEffect(() => {
    if (search !== get('search')) set({ search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const query = useMemo(() => {
    const q = { sort: get('sort', 'updated'), order: get('order', 'desc'), page: get('page', '1'), limit: 20 };
    for (const k of FILTER_KEYS) if (params.get(k)) q[k] = params.get(k);
    if (mine) q.mine = 'true';
    return q;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, mine]);

  const list = useAsync(() => complaintApi.list(query), [JSON.stringify(query)]);
  const [options, setOptions] = useState({ sbus: [], countries: [], statuses: [] });
  useEffect(() => {
    Promise.all([complaintApi.filters(), adminApi.meta()])
      .then(([f, m]) => setOptions({ ...f.data, statuses: m.data.statuses }))
      .catch(() => {});
  }, []);

  const [creating, setCreating] = useState(false);
  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const canCreate = !mine && can('complaint.create.manual');

  const sortBy = (key) => {
    if (query.sort === key) set({ order: query.order === 'asc' ? 'desc' : 'asc' });
    else set({ sort: key, order: key === 'number' ? 'asc' : 'desc' });
  };

  const empty = hasFilters ? (
    <EmptyState title="No complaints match these filters">Clear the filters or change the search to see more.</EmptyState>
  ) : mine ? (
    <EmptyState title="Nothing is assigned to you">Complaints appear here when a Quality Coordinator makes you the First Responsible Person.</EmptyState>
  ) : (
    <EmptyState
      title="No complaints registered yet"
      action={canCreate && <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New</Button>}
    >
      Complaints arrive here from WhatsApp, or can be registered by staff.
    </EmptyState>
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-6.5rem)] space-y-2.5">
      {/* Salesforce Standard Object List Header (Matching Screenshot) */}
      <div className="rounded-t-md border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Object icon + Title + View Selector */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#0176d3] text-white shadow-2xs">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Complaints
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex items-center gap-1 text-lg font-bold text-slate-900 hover:text-blue-700"
                >
                  All <ChevronDown className="h-4 w-4 text-slate-600" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Pin this list view"
                >
                  <Pin className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons (New, Import, Printable View) */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded border border-slate-300 bg-white shadow-2xs overflow-hidden">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="border-r border-slate-300 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  New
                </button>
              )}
              <button
                type="button"
                className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Import
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Printable View
              </button>
            </div>
          </div>
        </div>

        {/* Subtitle & Search / Utility Bar */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          <p className="text-slate-500 text-[11px]">
            <strong className="font-semibold text-slate-700">{list.meta?.total ?? list.data?.length ?? 0} items</strong> • Sorted by Created Date • Updated a few seconds ago
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search this list */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-7.5 w-48 sm:w-60 rounded border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search this list..."
                aria-label="Search complaints"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            {/* Quick Filter dropdowns */}
            <select className="h-7.5 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700" value={get('sbu')} onChange={(e) => set({ sbu: e.target.value })}>
              <option value="">All SBUs</option>
              {options.sbus.map((s) => <option key={s}>{s}</option>)}
            </select>

            <select className="h-7.5 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700" value={get('status')} onChange={(e) => set({ status: e.target.value })}>
              <option value="">All Statuses</option>
              {options.statuses.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>

            {/* Utilities Toolbar (Gear, Table, Refresh, Sort, Edit, Chart, Filter) */}
            <div className="inline-flex items-center rounded border border-slate-300 bg-white divide-x divide-slate-200">
              <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-50" title="List View Controls">
                <Settings className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-50" title="Display as Table">
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => list.reload()} className="p-1.5 text-slate-500 hover:bg-slate-50" title="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => sortBy('created')} className="p-1.5 text-slate-500 hover:bg-slate-50" title="Sort">
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-50" title="Inline Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-50" title="Charts">
                <PieChart className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-50" title="Filters">
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Table (Matching Screenshot Columns & Style) */}
      <div className="flex-1 flex flex-col border border-slate-200 bg-white shadow-2xs rounded-b-md overflow-hidden">
        {list.loading && !list.data ? (
          <div className="p-8">
            <Loading label="Loading complaints" />
          </div>
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.data.length === 0 ? (
          empty
        ) : (
          <div className="w-full flex-1 overflow-x-hidden">
            <table className={`w-full text-left text-xs ${list.loading ? 'opacity-60' : ''}`}>
              <thead className="border-b border-slate-200 bg-[#fafafc] text-slate-600 font-semibold select-none">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`py-2.5 font-semibold border-r border-slate-100 last:border-r-0 ${col.thClass || 'px-3 whitespace-nowrap'}`}
                      aria-sort={query.sort === col.key ? (query.order === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {col.sortable ? (
                        <button type="button" onClick={() => sortBy(col.key)} className="inline-flex items-center gap-1 hover:text-blue-600">
                          <span>{col.label}</span>
                          <ChevronDown className="h-3 w-3 text-slate-400" />
                          {query.sort === col.key && (query.order === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />)}
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.key !== 'idx' && <ChevronDown className="h-3 w-3 text-slate-400" />}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.map((c, idx) => (
                  <tr
                    key={c._id}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                    onClick={() => navigate(`/complaints/${c._id}`)}
                  >
                    <td className="whitespace-nowrap py-2.5 px-2.5 text-slate-400 text-[11px] font-mono text-center">
                      {idx + 1}
                    </td>
                    <td className="whitespace-nowrap py-2.5 px-3">
                      <Link
                        to={`/complaints/${c._id}`}
                        className="font-medium text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.complaintNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 font-medium text-slate-800">
                      {c.stage === 'CLOSED' ? 'Closed' : c.stage}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {formatSfDateTime(c.complaintDate || c.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">
                      {c.sbu || '—'}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2.5 text-slate-700" title={c.d2?.verifiedProduct?.productName || c.reportedProduct?.name}>
                      {c.d2?.verifiedProduct?.productName || c.reportedProduct?.name || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600" title={c.shortDescription}>
                      <span className="line-clamp-1">{c.shortDescription || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {formatSfDateTime(c.createdAt || c.complaintDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {formatSfDateTime(c.lastActivityAt || c.updatedAt)}
                    </td>
                    <td className="max-w-[11rem] truncate px-3 py-2.5">
                      <span className="font-medium text-blue-600 hover:underline" title={c.requester?.name}>
                        {c.requester?.name || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-auto border-t border-slate-200 bg-white">
          <Pagination meta={list.meta} onPage={(page) => set({ page: String(page) })} />
        </div>
      </div>

      <NewComplaintModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(c) => {
          setCreating(false);
          navigate(`/complaints/${c._id}`);
        }}
      />
    </div>
  );
}
