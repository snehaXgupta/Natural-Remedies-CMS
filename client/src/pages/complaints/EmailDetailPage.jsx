import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  User,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { notificationApi, complaintApi } from '../../api/endpoints.js';
import { formatDateTime, formatDate } from '../../lib/format.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { NOTIFICATION_TYPES } from '../../lib/notifications.js';
import { Button } from '../../components/Button.jsx';

function formatEmailTime(date) {
  if (!date) return 'Today';
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes} ${ampm}`;
  if (isToday) return `${timeStr} | Today`;
  const pad = (n) => String(n).padStart(2, '0');
  return `${timeStr} | ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function cleanEmailHtml(html) {
  if (!html) return '';
  let cleaned = html;

  // Extract from full body tag if present
  if (cleaned.includes('<body') && cleaned.includes('</body>')) {
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) cleaned = bodyMatch[1];
  }

  // Strip old green banner table wrapper if present
  if (cleaned.includes('natural remedies') && cleaned.includes('Quality Assurance Department')) {
    const bodyTd = cleaned.match(/<tr><td style="padding:18px 28px 24px[^>]*>([\s\S]*?)<\/td><\/tr>/i);
    if (bodyTd && bodyTd[1]) {
      cleaned = bodyTd[1];
    }
  }

  // Remove any remaining outer container tables
  cleaned = cleaned.replace(/<table role="presentation" width="100%"[^>]*>[\s\S]*?<table role="presentation" width="600"[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/table>\s*<\/td><\/tr><\/table>/gi, '');

  return cleaned;
}

export function EmailDetailPage() {
  const { complaintId, emailId } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(null);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('message'); // 'message' | 'details'

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [emailRes, complaintRes] = await Promise.all([
          notificationApi.get(emailId),
          complaintId ? complaintApi.get(complaintId).catch(() => null) : null,
        ]);
        if (mounted) {
          setEmail(emailRes.data || emailRes);
          if (complaintRes) {
            setComplaint(complaintRes.data || complaintRes);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.error?.message || err.message || 'Failed to load email');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [emailId, complaintId]);

  if (loading) {
    return (
      <div className="p-8">
        <Loading label="Loading email record..." />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="p-8">
        <ErrorState
          message={error || 'Email record not found'}
          action={
            <Button
              onClick={() =>
                complaintId ? navigate(`/complaints/${complaintId}`) : navigate('/complaints')
              }
            >
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  const relatedComplaintId = complaintId || email.complaint?._id || email.complaint;
  const relatedComplaintNumber =
    complaint?.complaintNumber || email.complaint?.complaintNumber || 'Complaint';

  const isSuccess = email.status === 'SENT' || email.status === 'DELIVERED';
  const isFailed = email.status === 'FAILED';

  return (
    <div className="space-y-4 p-3 sm:p-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() =>
            relatedComplaintId
              ? navigate(`/complaints/${relatedComplaintId}`)
              : navigate(-1)
          }
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Complaint {relatedComplaintNumber ? `(${relatedComplaintNumber})` : ''}
        </button>
      </div>

      {/* Main Container styled matching the Salesforce Screenshot */}
      <div className="rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden">
        {/* Top Header Bar */}
        <div className="border-t-4 border-t-[#85a8dc] border-b border-slate-200 bg-[#f4f6f9] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-400 text-white shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <h1 className="truncate text-sm sm:text-base font-bold text-slate-800">
              {email.subject || 'Complaint Notification'}
            </h1>
          </div>
          {relatedComplaintId && (
            <Link
              to={`/complaints/${relatedComplaintId}`}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-blue-600 hover:underline shrink-0"
            >
              <span>View Complaint</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 bg-white px-4 flex gap-6 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('message')}
            className={`py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'message'
                ? 'border-[#0176d3] text-[#0176d3] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Message
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-[#0176d3] text-[#0176d3] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Details
          </button>
        </div>

        {/* Tab 1: Message View */}
        {activeTab === 'message' && (
          <div className="p-4 sm:p-6 bg-white">
            {/* Sender / Recipient Subheader matching the Screenshot */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-300 text-slate-600 shrink-0 mt-0.5">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 text-xs leading-relaxed space-y-0.5">
                  <div>
                    <span className="text-slate-500 font-normal">From: </span>
                    <span className="text-[#0176d3] font-semibold hover:underline cursor-pointer">
                      Customer Experience
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 pt-0.5">
                    <span className="text-slate-500 font-normal">To: </span>
                    <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-[#0176d3] font-medium shadow-2xs">
                      {email.recipient}
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Time matching screenshot: e.g. 2:14 pm | Today */}
              <div className="text-xs text-slate-500 font-normal shrink-0 pt-0.5">
                {formatEmailTime(email.sentAt || email.createdAt)}
              </div>
            </div>

            {/* Email Body: Clean, left-aligned standard business email format */}
            <div className="text-sm text-slate-800 leading-relaxed font-sans text-left">
              {email.bodyHtml ? (
                <div
                  className="space-y-4 max-w-none text-slate-800 [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:p-2 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_a]:text-blue-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: cleanEmailHtml(email.bodyHtml) }}
                />
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
                  {email.bodyText || 'No email content available.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Details Metadata View */}
        {activeTab === 'details' && (
          <div className="p-4 sm:p-6 bg-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Email Message Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs sm:text-sm">
              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Subject</span>
                <span className="font-semibold text-slate-900">{email.subject || '—'}</span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Status</span>
                <span className="inline-flex items-center gap-1.5 mt-0.5 font-medium">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Delivered / Sent
                    </span>
                  ) : isFailed ? (
                    <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" /> Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                      <Clock className="h-3.5 w-3.5" /> Queued
                    </span>
                  )}
                </span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">From Address</span>
                <span className="text-slate-800">
                  Customer Experience &lt;no-reply@naturalremedies.com&gt;
                </span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">To Address</span>
                <span className="text-slate-800 font-medium">{email.recipient}</span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Message Date</span>
                <span className="text-slate-800">
                  {formatDateTime(email.sentAt || email.createdAt)}
                </span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Related Complaint</span>
                {relatedComplaintId ? (
                  <Link
                    to={`/complaints/${relatedComplaintId}`}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    {relatedComplaintNumber}
                  </Link>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Notification Type</span>
                <span className="text-slate-800">
                  {NOTIFICATION_TYPES[email.type] || email.type || 'Standard Notification'}
                </span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Channel</span>
                <span className="text-slate-800 uppercase font-mono text-xs">
                  {email.channel || 'Email'}
                </span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Delivery Attempts</span>
                <span className="text-slate-800">{email.attempts || 1}</span>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-slate-500 text-xs">Message ID</span>
                <span className="font-mono text-[11px] text-slate-600 select-all">
                  {email._id}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
