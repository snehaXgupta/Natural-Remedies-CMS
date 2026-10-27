import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { complaintApi } from '../../api/endpoints.js';
import { useAsync } from '../../lib/useAsync.js';
import { formatDateTime } from '../../lib/format.js';
import { Loading } from '../../components/States.jsx';
import { NOTIFICATION_TYPES } from '../../lib/notifications.js';

export function EmailHistoryPanel({ complaintId, refreshKey }) {
  const navigate = useNavigate();
  const emailsQuery = useAsync(() => complaintApi.notifications(complaintId), [complaintId]);

  useEffect(() => {
    if (refreshKey) emailsQuery.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const emails = (emailsQuery.data || []).filter((n) => n.channel === 'email' || !n.channel);

  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand" />
          <h2 className="font-semibold text-slate-900">Email History</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {emails.length}
        </span>
      </div>

      {emailsQuery.loading && !emailsQuery.data ? (
        <div className="p-4">
          <Loading label="Loading email logs" />
        </div>
      ) : emails.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-ink-muted">
          No emails dispatched for this complaint yet.
        </div>
      ) : (
        <div className="divide-y divide-line max-h-80 overflow-y-auto">
          {emails.map((m) => {
            const isSuccess = m.status === 'SENT' || m.status === 'DELIVERED';
            const isFailed = m.status === 'FAILED';
            return (
              <div
                key={m._id}
                onClick={() => navigate(`/complaints/${complaintId}/emails/${m._id}`)}
                className="group flex cursor-pointer items-start gap-2.5 p-3 hover:bg-slate-50 transition-colors"
                title="Click to view full email"
              >
                <div className="mt-0.5 shrink-0">
                  {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : isFailed ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-xs font-semibold text-slate-800 group-hover:text-brand">
                      {m.subject || NOTIFICATION_TYPES[m.type] || 'Complaint Notification'}
                    </p>
                    <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="truncate text-xs text-ink-muted mt-0.5">
                    To: {m.recipient}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-ink-faint mt-1">
                    <span>From: Customer Experience</span>
                    <time>{formatDateTime(m.sentAt || m.createdAt)}</time>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
