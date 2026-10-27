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
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
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
          <div className="p-4 sm:p-6 space-y-5 bg-white">
            {/* Sender / Recipient Subheader with User Avatar */}
            <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-300 text-slate-600 shrink-0 mt-0.5">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 text-xs leading-relaxed">
                <div>
                  <span className="text-slate-500">From: </span>
                  <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                    Customer Experience
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-700">
                  <span className="text-slate-500">To: </span>
                  <span className="font-medium text-slate-800">{email.recipient}</span>
                  <ChevronDown className="h-3 w-3 text-slate-400 inline" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {formatDateTime(email.sentAt || email.createdAt)}
                </div>
              </div>
            </div>

            {/* Email Body Content */}
            <div className="text-xs sm:text-sm text-slate-800">
              {email.bodyHtml ? (
                <div
                  className="prose prose-sm max-w-none text-slate-800 [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:p-2 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_a]:text-blue-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800">
                  {email.bodyText || 'No email content available.'}
                </pre>
              )}
            </div>

            {/* View Complaint Record Direct Button */}
            {relatedComplaintId && (
              <div className="pt-2">
                <Link to={`/complaints/${relatedComplaintId}`}>
                  <Button variant="primary">View Complaint Record</Button>
                </Link>
              </div>
            )}
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
