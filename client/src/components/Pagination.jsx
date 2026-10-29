import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);

  // Generate numbered pages array
  const pages = [];
  const current = meta.page;
  const total = meta.totalPages;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    if (!pages.includes(total)) pages.push(total);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs text-slate-600 select-none">
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="font-semibold text-slate-800">{from}–{to}</strong> of <strong className="font-semibold text-slate-800">{meta.total}</strong> entries
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex items-center gap-1 rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPage(meta.page - 1)}
          disabled={meta.page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-1.5 py-1 text-slate-400">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`min-w-[28px] h-7 rounded-xs text-xs font-medium transition-colors ${
                  p === meta.page
                    ? 'bg-[#0176d3] text-white font-semibold shadow-2xs'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => onPage(p)}
                aria-current={p === meta.page ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="flex items-center gap-1 rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPage(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
