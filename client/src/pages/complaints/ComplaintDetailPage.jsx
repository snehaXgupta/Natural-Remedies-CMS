import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  Check,
  Pencil,
  Lock,
  Compass,
  User,
  Info,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { complaintApi } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { readError } from '../../api/client.js';
import { useAsync } from '../../lib/useAsync.js';
import { formatDate, formatDateTime, formatSfDateTime } from '../../lib/format.js';
import { Button } from '../../components/Button.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { Loading, ErrorState } from '../../components/States.jsx';
import { useToast } from '../../components/Toast.jsx';
import { D1Form, toForm, toBody } from './D1Form.jsx';
import { FilesTab } from './FilesTab.jsx';
import { HistoryPanel } from './HistoryPanel.jsx';
import { EmailHistoryPanel } from './EmailHistoryPanel.jsx';
import { AcknowledgeModal } from './AcknowledgeModal.jsx';
import { D2Tab } from './D2Tab.jsx';
import { D3Tab } from './D3Tab.jsx';
import { SubmitD3Modal } from './D3Review.jsx';
import { d3Api } from '../../api/endpoints.js';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import { NotificationStatus } from '../../components/NotificationStatus.jsx';
import { NOTIFICATION_TYPES } from '../../lib/notifications.js';
import { D4Tab } from './D4Tab.jsx';
import { generateComplaintReport } from '../../lib/generateReportPdf.js';

/* ---------------- Stage tracker (Salesforce Chevron Ribbon) ---------------- */

const SF_CHEVRON_STAGES = [
  { key: 'D1', label: 'D1' },
  { key: 'D2', label: 'D2' },
  { key: 'D3', label: 'D3' },
  { key: 'D4', label: 'D4' },
  { key: 'CLOSED', label: 'Closed' },
];

function StageTracker({ stage, status, onSelectTab }) {
  const currentIndex = SF_CHEVRON_STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="w-full bg-[#f8fafc] border-t border-b border-slate-200 py-1.5 px-3 sm:px-5 overflow-x-auto no-scrollbar">
      <div className="flex items-center min-w-[500px]">
        {SF_CHEVRON_STAGES.map((s, idx) => {
          const isDone = idx < currentIndex || stage === 'CLOSED';
          const isCurrent = s.key === stage;
          const isFirst = idx === 0;

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelectTab && onSelectTab(s.key === 'CLOSED' ? 'D4' : s.key)}
              style={{ zIndex: 30 - idx }}
              className={`flex-1 sf-chevron ${isFirst ? 'sf-chevron-first' : 'sf-chevron-inner -ml-3'} ${
                isCurrent
                  ? 'bg-[#002b49] text-white font-bold shadow-xs'
                  : isDone
                  ? 'bg-[#014486] text-white hover:bg-[#01356a]'
                  : 'bg-[#f1f3f5] text-[#54698d] hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 px-3">
                {isDone && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                <span className="truncate">{s.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Next step ---------------- */

function NextStep({ actions, status, handlers, extraBlockers = {} }) {
  if (status === 'CLOSED') return null;
  if (!actions.length) {
    return <p className="text-ink-muted">No action is available on this complaint from your role at this stage.</p>;
  }
  return (
    <div className="space-y-2">
      {actions.map((a) => {
        const extra = extraBlockers[a.action];
        const handler = extra ? null : handlers[a.action];
        const blockers = extra ? [...a.blockers, extra] : a.blockers;
        return (
          <div key={a.action} className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800">Next step: {a.label}</p>
              {blockers.length > 0 ? (
                <ul className="mt-0.5 text-xs text-ink-muted">
                  {blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              ) : handler ? (
                <p className="text-xs text-ink-muted">Moves the complaint to “{a.toLabel}”.</p>
              ) : (
                <p className="text-xs text-ink-muted">This step is switched on in build phase {a.phase}.</p>
              )}
            </div>
            <Button variant={a.action === 'rejectD3' ? 'danger' : 'primary'} size="sm" disabled={!a.allowed || !handler} onClick={handler}>
              {a.label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Reusable Salesforce Record UI Elements ---------------- */

function SfSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200/80 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 bg-[#f4f6f9] hover:bg-[#edf2f7] px-4 py-2 border-y border-slate-200/90 text-left transition-colors select-none"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-600 transition-transform duration-150 ${
            open ? '' : '-rotate-90'
          }`}
        />
        <span className="text-xs font-bold text-slate-800 tracking-wide">{title}</span>
      </button>
      {open && <div className="bg-white">{children}</div>}
    </div>
  );
}

function SfFieldRow({ left, right }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 border-b border-slate-200/60 last:border-b-0 text-xs">
      <div>{left}</div>
      <div>{right || <div className="px-4 py-2 text-slate-300 font-light min-h-[38px]">&nbsp;</div>}</div>
    </div>
  );
}

function SfFieldItem({ label, apiName, value, onEdit, canEdit = true, customValue }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 hover:bg-slate-50/80 group transition-colors min-h-[38px]">
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="w-44 sm:w-52 shrink-0 text-slate-600 font-medium text-xs truncate">
          <span>{label}</span>{' '}
          {apiName && <span className="text-[10px] text-slate-400 font-normal">({apiName})</span>}
        </div>
        <div className="text-slate-900 font-normal text-xs truncate flex-1 min-w-0">
          {customValue ? customValue : (value || <span className="text-slate-300 font-light">&nbsp;</span>)}
        </div>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={`Edit ${label}`}
          className="opacity-40 group-hover:opacity-100 hover:text-blue-600 text-slate-400 p-1 shrink-0 transition-opacity"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function Item({ label, children, empty = 'Not provided' }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-xs">{children || <span className="text-ink-faint">{empty}</span>}</dd>
    </div>
  );
}

function EmailStatus({ complaintId, refreshKey }) {
  const emails = useAsync(() => complaintApi.notifications(complaintId), [complaintId, refreshKey]);
  const ack = emails.data?.filter((n) => n.type === 'D1_ACKNOWLEDGEMENT') || [];
  if (emails.loading && !emails.data) return null;
  if (!ack.length) return null;
  return (
    <ul className="mt-3 space-y-2 px-4 pb-3">
      {ack.map((n) => (
        <li key={n._id} className="rounded border border-line px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span>{NOTIFICATION_TYPES[n.type]} email to {n.recipient}</span>
            <NotificationStatus status={n.status} />
          </div>
          <p className="mt-0.5 text-ink-muted">
            {n.status === 'SENT' || n.status === 'DELIVERED'
              ? `Sent ${formatDateTime(n.sentAt)}${n.attempts > 1 ? ` after ${n.attempts} attempts` : ''}.`
              : n.status === 'FAILED'
                ? `Failed after ${n.attempts} attempts: ${n.lastError}`
                : n.attempts > 0
                  ? `Attempt ${n.attempts} failed (${n.lastError}). Next try ${formatDateTime(n.nextAttemptAt)}.`
                  : 'Queued; usually sent within a few seconds.'}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- D1 Tab (Salesforce Record Details View) ---------------- */

function D1Tab({ detail, onSaved, refreshKey, onStartAcknowledge, startEditTrigger }) {
  const { complaint: c, can } = detail;
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(toForm(c));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (startEditTrigger > 0 && can.editD1) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startEditTrigger]);

  const start = () => {
    setForm(toForm(c));
    setErrors({});
    setMessage(null);
    setConflict(false);
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await complaintApi.updateD1(c._id, { ...toBody(form, { includeOrigin: false, original: c }), version: c.__v });
      notify('D1 details saved.');
      setEditing(false);
      onSaved(res.data);
    } catch (err) {
      const e = readError(err);
      setErrors(e.fields);
      setConflict(e.code === 'CONFLICT');
      setMessage(Object.keys(e.fields).length ? 'Some fields need attention.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="p-4 sm:p-5">
        {message && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-bad/20 bg-bad-soft px-3 py-2 text-xs text-bad" role="alert">
            <span>{message}</span>
            {conflict && <Button size="sm" onClick={() => window.location.reload()}>Reload</Button>}
          </div>
        )}
        <D1Form value={form} onChange={setForm} errors={errors} />
        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={busy} onClick={save}>Save D1 details</Button>
        </div>
      </div>
    );
  }

  const isAck = Boolean(c.acknowledgement?.approvedAt);

  return (
    <div className="divide-y divide-slate-200/80">
      {/* 1. Requestor Information */}
      <SfSection title="Requestor Information">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Complaint date"
              apiName="Complaint_date__c"
              value={formatSfDateTime(c.complaintDate)}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
          right={
            <SfFieldItem
              label="Short Description of the Complaint"
              apiName="Short_Description__c"
              value={c.shortDescription}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="Requested By"
              apiName="Raised_By__c"
              canEdit={can.editD1}
              onEdit={start}
              customValue={
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-[#0176d3] text-white shrink-0 shadow-2xs">
                    <User className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                    {c.requester?.name || '—'}
                  </span>
                </div>
              }
            />
          }
          right={
            <SfFieldItem
              label="SBU"
              apiName="SBU__c"
              value={c.sbu}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="Requestor E-mail"
              apiName="Raised_by_e_mail_address__c"
              canEdit={can.editD1}
              onEdit={start}
              customValue={
                c.requester?.email ? (
                  <a href={`mailto:${c.requester.email}`} className="text-blue-600 hover:underline">
                    {c.requester.email}
                  </a>
                ) : '—'
              }
            />
          }
          right={
            <SfFieldItem
              label="Country"
              apiName="Country__c"
              value={c.country}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="Requestor Mobile Number"
              apiName="Raised_Mobile_Number__c"
              value={c.requester?.mobile || '—'}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
          right={
            <SfFieldItem
              label="Complaint Head Quarter"
              apiName="Complaint_Head_Quarter__c"
              value={c.headQuarter || ' '}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="origin"
              apiName="origin__c"
              value={c.origin}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
          right={
            <SfFieldItem
              label="Coordinator"
              apiName="Coordinator__c"
              canEdit={can.editD1}
              onEdit={start}
              customValue={
                c.coordinator ? (
                  <span className="text-slate-800 font-medium">
                    {c.coordinator.name || c.coordinator.email}
                  </span>
                ) : (
                  <span className="text-amber-600">Not assigned</span>
                )
              }
            />
          }
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="Additional remarks"
              apiName="Additional_remarks__c"
              canEdit={can.editD1}
              onEdit={start}
              customValue={
                <div className="flex items-start gap-1.5 text-xs text-slate-800">
                  <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{c.additionalRemarks || `complaintHeadQuarter = ${(c.country || 'India').toLowerCase()}`}</span>
                </div>
              }
            />
          }
          right={
            <SfFieldItem
              label="Category"
              apiName="Category__c"
              value={c.category || '—'}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
        />
      </SfSection>

      {/* 2. Customer Information */}
      <SfSection title="Customer Information">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Distributor / Retailer Name"
              apiName="Distributor_Retailer_Name__c"
              value={c.customer?.name || '—'}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
          right={
            <SfFieldItem
              label="Customer Code"
              apiName="Customer_Code__c"
              value={c.customer?.code || ' '}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
        />
      </SfSection>

      {/* 3. Acknowledgement */}
      <SfSection title="Acknowledgement">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Acknowledgement"
              apiName="Acknowledgement__c"
              canEdit={can.editD1 && !isAck}
              onEdit={onStartAcknowledge}
              customValue={
                isAck ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>
                      Acknowledged by <strong>{c.acknowledgement.approvedBy?.name || 'Quality Team'}</strong> on {formatSfDateTime(c.acknowledgement.approvedAt)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 italic">Pending acknowledgement</span>
                    {can.acknowledge && (
                      <button
                        type="button"
                        onClick={onStartAcknowledge}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                )
              }
            />
          }
          right={null}
        />
        {c.acknowledgement?.remarks && (
          <div className="px-4 py-2 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50">
            <strong>Acknowledgement Remarks:</strong> {c.acknowledgement.remarks}
          </div>
        )}
        <EmailStatus complaintId={c._id} refreshKey={refreshKey} />
      </SfSection>

      {/* 4. Product Information */}
      <SfSection title="Product Information">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Product Name"
              apiName="Product_name__c"
              value={c.reportedProduct?.name || '—'}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
          right={
            <SfFieldItem
              label="Batch Number"
              apiName="Batch_Number__c"
              value={c.reportedProduct?.batchNumber || '—'}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
        />
      </SfSection>

      {/* 5. System Information */}
      <SfSection title="System Information">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Created By"
              apiName="CreatedById"
              canEdit={false}
              customValue={
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-[#0176d3] text-white shrink-0 shadow-2xs">
                    <User className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {c.origin === 'WhatsApp' ? 'complaintCapture Site Guest User' : (c.createdBy?.name || 'complaintCapture Site Guest User')}, {formatSfDateTime(c.createdAt || c.complaintDate)}
                  </span>
                </div>
              }
            />
          }
          right={
            <SfFieldItem
              label="Last Modified By"
              apiName=""
              canEdit={false}
              customValue={
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-[#0176d3] text-white shrink-0 shadow-2xs">
                    <User className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {c.origin === 'WhatsApp' ? 'complaintCapture Site Guest User' : (c.updatedBy?.name || c.createdBy?.name || 'complaintCapture Site Guest User')}, {formatSfDateTime(c.lastActivityAt || c.updatedAt || c.createdAt)}
                  </span>
                </div>
              }
            />
          }
        />
      </SfSection>
    </div>
  );
}

/* ---------------- Later-stage and SLA tabs ---------------- */

function SlaTab({ complaint: c }) {
  return (
    <div className="p-4 sm:p-5">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 text-xs">
        <Item label="Registered">{formatDateTime(c.createdAt)}</Item>
        <Item label="Last activity">{formatDateTime(c.lastActivityAt)}</Item>
        <Item label="Current stage due">
          {c.stageDueAt ? formatDateTime(c.stageDueAt) : <span className="text-ink-muted">No deadline. SLA rules are not configured yet.</span>}
        </Item>
        <Item label="Closed">{c.closedAt ? formatDateTime(c.closedAt) : <span className="text-ink-muted">Open</span>}</Item>
      </dl>
    </div>
  );
}

/* ---------------- Main Page ---------------- */

const TABS = [
  { key: 'files', label: 'Synced Files' },
  { key: 'D1', label: 'D1-Define The Problem' },
  { key: 'D2', label: 'D2-Grasp The Situation' },
  { key: 'D3', label: 'D3- RCA & CAPA' },
  { key: 'D4', label: 'D4- Effectiveness Review' },
  { key: 'sla', label: 'SLA' },
];

export function ComplaintDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [historyKey, setHistoryKey] = useState(0);
  const { user } = useAuth();
  const [acking, setAcking] = useState(false);
  const [completingD2, setCompletingD2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deciding, setDeciding] = useState(null); // 'approve' | 'reject'
  const [extensionModal, setExtensionModal] = useState(false);
  const [extHours, setExtHours] = useState('');
  const [extReason, setExtReason] = useState('');
  const [savingExt, setSavingExt] = useState(false);
  const [editD1Trigger, setEditD1Trigger] = useState(0);
  const [organizerOpen, setOrganizerOpen] = useState(false);
  const [organizerTab, setOrganizerTab] = useState('assignment'); // 'assignment' | 'history' | 'emails'

  const notify = useToast();
  const load = useAsync(() => complaintApi.get(id), [id]);
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (load.data) setDetail(load.data);
  }, [load.data]);

  if (load.loading && !detail) return <Loading label="Loading complaint" />;
  if (load.error && !detail) {
    return (
      <div className="panel">
        <ErrorState message={load.error} onRetry={load.reload} />
        <p className="pb-6 text-center">
          <Link to="/complaints" className="text-brand hover:underline">Back to complaints</Link>
        </p>
      </div>
    );
  }
  if (!detail) return null;

  const c = detail.complaint;
  const defaultTab = ['D1', 'D2', 'D3', 'D4'].includes(c.stage) ? c.stage : 'D1';
  const tab = TABS.find((t) => t.key === params.get('tab'))?.key || defaultTab;
  const refreshed = (next) => {
    setDetail(next);
    setHistoryKey((k) => k + 1);
  };

  const sfRecordId = c.salesforceId || (c._id ? `a0QC4${String(c._id).slice(-13).padStart(13, '0')}` : 'a0QC4000001l0BhMAJ');

  const handleGeneratePdf = async () => {
    try {
      const d3Data = await d3Api.get(c._id).catch(() => null);
      generateComplaintReport(c, d3Data);
      notify('Complaint Management Report PDF downloaded successfully.');
    } catch (err) {
      notify(readError(err).message, 'bad');
    }
  };

  const handleRequestExtension = async (e) => {
    e.preventDefault();
    try {
      setSavingExt(true);
      await complaintApi.requestSlaExtension(c._id, { hours: Number(extHours), reason: extReason });
      notify('D2 SLA extension request submitted to FRP manager.');
      setExtensionModal(false);
      refreshed({ ...detail, complaint: { ...c, d2: { ...c.d2, slaExtension: { requestedHours: Number(extHours), reason: extReason, status: 'PENDING' } } } });
    } catch (err) {
      notify(readError(err).message, 'bad');
    } finally {
      setSavingExt(false);
    }
  };

  const handlers = {
    acknowledge: () => setAcking(true),
    startD2: async () => {
      try {
        const res = await complaintApi.startD2(c._id, { idempotencyKey: `d2-${crypto.randomUUID()}` });
        refreshed(res.data);
        setParams({ tab: 'D2' }, { replace: true });
        notify('D2 started. Record the verified product details and assign the First Responsible Person.');
      } catch (err) {
        notify(readError(err).message, 'bad');
      }
    },
    completeD2: () => setCompletingD2(true),
    submitD3: () => setSubmitting(true),
    resubmitD3: () => setSubmitting(true),
    approveD3: () => setDeciding('approve'),
    rejectD3: () => setDeciding('reject'),
    startD3: async () => {
      try {
        const res = await complaintApi.startD3(c._id, { idempotencyKey: `d3-${crypto.randomUUID()}` });
        refreshed(res.data);
        setParams({ tab: 'D3' }, { replace: true });
        notify('Analysis started. Choose Why-Why, Fishbone or both.');
      } catch (err) {
        notify(readError(err).message, 'bad');
      }
    },
  };

  return (
    <div className="pb-16 space-y-3">
      {/* Breadcrumb back */}
      <Link to="/complaints" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Complaints
      </Link>

      {/* Salesforce Record Page Card */}
      <div className="bg-white border border-slate-200/90 rounded-md shadow-2xs overflow-hidden">
        {/* Record Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0176d3] text-white shadow-2xs">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>Complaint</span>
                <span className="text-slate-400">(Complaint_Management__c)</span>
                <span className="text-slate-400">({sfRecordId})</span>
              </div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {c.complaintNumber}
                </h1>
                <StatusBadge status={c.status} label={c.statusLabel} />
              </div>
            </div>
          </div>

          {/* Salesforce Action Group (Top Right) */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded border border-slate-300 bg-white shadow-2xs overflow-hidden">
              {detail.can?.editD1 && (
                <button
                  type="button"
                  onClick={() => {
                    setParams({ tab: 'D1' }, { replace: true });
                    setEditD1Trigger((t) => t + 1);
                  }}
                  className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Edit
                </button>
              )}
              {detail.can?.acknowledge && (
                <button
                  type="button"
                  onClick={() => setAcking(true)}
                  className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Acknowledge
                </button>
              )}
              {c.stage === 'D2' && (
                <button
                  type="button"
                  onClick={() => setExtensionModal(true)}
                  className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  D2 SLA Extension
                </button>
              )}
              {c.stage === 'D3' && (
                <button
                  type="button"
                  onClick={() => setSubmitting(true)}
                  className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Submit for Approval
                </button>
              )}
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>

        {/* Chevron Stage Path Ribbon (D1, D2, D3, ...) */}
        <StageTracker stage={c.stage} status={c.status} onSelectTab={(t) => setParams({ tab: t }, { replace: true })} />

        {/* Action Guidance (if next action exists) */}
        {detail.nextActions?.length > 0 && (
          <div className="bg-[#f0f8ff] border-t border-b border-[#b9e0fd] px-5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white font-bold text-[10px]">
                i
              </span>
              <span className="font-semibold text-slate-800">
                Action Required:
              </span>
              <span className="text-slate-600">
                {detail.nextActions.map((a) => a.label).join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {detail.nextActions.map((a) => (
                <Button
                  key={a.action}
                  size="sm"
                  variant={a.action === 'rejectD3' ? 'danger' : 'primary'}
                  onClick={handlers[a.action]}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs Bar directly underneath Chevron Ribbon (Matching Screenshot) */}
        <div className="flex border-b border-slate-200 bg-white px-2 sm:px-4 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setParams({ tab: 'files' }, { replace: true })}
            className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
              tab === 'files'
                ? 'border-[#0176d3] text-[#0176d3] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Synced Files {detail.attachmentCount > 0 && `(${detail.attachmentCount})`}
          </button>
          <button
            type="button"
            onClick={() => setParams({ tab: 'D1' }, { replace: true })}
            className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
              tab === 'D1'
                ? 'border-[#0176d3] text-[#0176d3] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            D1-Define The Problem
          </button>
          {(c.stage === 'D2' || tab === 'D2') && (
            <button
              type="button"
              onClick={() => setParams({ tab: 'D2' }, { replace: true })}
              className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
                tab === 'D2'
                  ? 'border-[#0176d3] text-[#0176d3] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              D2-Grasp The Situation
            </button>
          )}
          {(c.stage === 'D3' || tab === 'D3') && (
            <button
              type="button"
              onClick={() => setParams({ tab: 'D3' }, { replace: true })}
              className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
                tab === 'D3'
                  ? 'border-[#0176d3] text-[#0176d3] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              D3- RCA & CAPA
            </button>
          )}
          {(c.stage === 'D4' || tab === 'D4') && (
            <button
              type="button"
              onClick={() => setParams({ tab: 'D4' }, { replace: true })}
              className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
                tab === 'D4'
                  ? 'border-[#0176d3] text-[#0176d3] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              D4- Effectiveness Review
            </button>
          )}
          <button
            type="button"
            onClick={() => setParams({ tab: 'sla' }, { replace: true })}
            className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
              tab === 'sla'
                ? 'border-[#0176d3] text-[#0176d3] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            SLA
          </button>
        </div>

        {/* Tab Content Panel (Full Width Salesforce Lightning Record View) */}
        <div>
          {tab === 'files' && (
            <div className="p-4 sm:p-5">
              <FilesTab complaint={c} canUpload={detail.can.upload} onChange={() => { load.reload(); setHistoryKey((k) => k + 1); }} />
            </div>
          )}
          {tab === 'D1' && (
            <D1Tab
              detail={detail}
              onSaved={refreshed}
              refreshKey={historyKey}
              onStartAcknowledge={() => setAcking(true)}
              startEditTrigger={editD1Trigger}
            />
          )}
          {tab === 'D2' && (
            <div className="p-4 sm:p-5">
              <D2Tab key={c.__v} detail={detail} onSaved={refreshed} refreshKey={historyKey} />
            </div>
          )}
          {tab === 'D3' && (
            <div className="p-4 sm:p-5">
              <D3Tab complaint={c} review={detail.review} refreshKey={historyKey} onChanged={() => setHistoryKey((k) => k + 1)} />
            </div>
          )}
          {tab === 'D4' && (
            <div className="p-4 sm:p-5">
              <D4Tab complaint={c} onRefresh={() => load.reload()} />
            </div>
          )}
          {tab === 'sla' && <SlaTab complaint={c} />}
        </div>
      </div>

      {/* Docked Salesforce Utility Bar (Bottom Organizer) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#f3f4f6] border-t border-slate-300 h-9 flex items-center justify-between px-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOrganizerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors border ${
              organizerOpen
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>organizer</span>
            {organizerOpen ? <ChevronDown className="h-3 w-3 ml-0.5" /> : null}
          </button>
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          Natural Remedies CMS • {c.complaintNumber}
        </div>
      </footer>

      {/* Slide-up Organizer Drawer */}
      {organizerOpen && (
        <div className="fixed bottom-9 left-0 right-0 sm:left-auto sm:right-4 sm:w-[480px] bg-white border border-slate-300 rounded-t-md sm:rounded-md shadow-overlay z-40 max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#f8fafc] px-4 py-2.5">
            <div className="flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOrganizerTab('assignment')}
                className={`px-2.5 py-1 rounded ${organizerTab === 'assignment' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                Assignment
              </button>
              <button
                type="button"
                onClick={() => setOrganizerTab('history')}
                className={`px-2.5 py-1 rounded ${organizerTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                History
              </button>
              <button
                type="button"
                onClick={() => setOrganizerTab('emails')}
                className={`px-2.5 py-1 rounded ${organizerTab === 'emails' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                Email Logs
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOrganizerOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {organizerTab === 'assignment' && (
              <section className="space-y-3 text-xs">
                <h3 className="font-semibold text-slate-800 text-sm">Complaint Assignment</h3>
                <dl className="grid grid-cols-2 gap-3">
                  <Item label="First Responsible Person" empty="Not assigned yet">
                    {c.frp && (
                      <span className="font-medium text-slate-800">
                        {c.frp.name}
                        {c.frp.designation && <span className="block text-slate-500 font-normal">{c.frp.designation}</span>}
                      </span>
                    )}
                  </Item>
                  <Item label="Priority" empty="Not set">{c.priority}</Item>
                  <Item label="SBU">{c.sbu}</Item>
                  <Item label="Country">{c.country}</Item>
                  <Item label="Coordinator">{c.coordinator?.name || c.coordinator?.email || 'Not assigned'}</Item>
                  <Item label="Origin">{c.origin}</Item>
                </dl>
              </section>
            )}
            {organizerTab === 'history' && <HistoryPanel complaintId={c._id} refreshKey={historyKey} />}
            {organizerTab === 'emails' && <EmailHistoryPanel complaintId={c._id} refreshKey={historyKey} />}
          </div>
        </div>
      )}

      {/* D2 SLA Extension Pop-up Modal */}
      {extensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg p-5 max-w-md w-full shadow-overlay space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Request D2 SLA Extension</h3>
            <form onSubmit={handleRequestExtension} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Extension Hours Requested <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 52"
                  value={extHours}
                  onChange={(e) => setExtHours(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Extension <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. laboratory analysis requires additional incubation..."
                  value={extReason}
                  onChange={(e) => setExtReason(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" size="sm" onClick={() => setExtensionModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingExt || !extHours}>
                  {savingExt ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete D2 Modal */}
      <ConfirmModal
        open={completingD2}
        title="Complete D2"
        description={`${c.complaintNumber}. D2 information is locked, and the D2 completion notice is emailed to ${c.frp ? c.frp.name : 'the First Responsible Person'}.`}
        confirmLabel="Complete D2 and notify"
        remarksLabel="Remarks"
        remarksHint="Optional. Recorded in the complaint history."
        onClose={() => setCompletingD2(false)}
        onConfirm={async (body) => {
          const res = await complaintApi.completeD2(c._id, body);
          setCompletingD2(false);
          refreshed(res.data);
          notify('D2 completed. The complaint is ready for root cause analysis.');
        }}
      />

      {/* D3 Submission Modal */}
      <SubmitD3Modal
        open={submitting}
        complaint={c}
        resubmit={c.status === 'D3_REWORK'}
        onClose={() => setSubmitting(false)}
        onDone={(next, reviewerName) => {
          setSubmitting(false);
          refreshed(next);
          setParams({ tab: 'D3' }, { replace: true });
          notify(`Submitted to ${reviewerName}. They have been emailed.`);
        }}
      />

      {/* D3 Decision Modal */}
      <ConfirmModal
        open={Boolean(deciding)}
        title={deciding === 'approve' ? 'Approve the analysis' : 'Reject and return for rework'}
        description={
          deciding === 'approve'
            ? `${c.complaintNumber}, version ${detail.review?.version}. The root causes and CAPA are approved.`
            : `${c.complaintNumber}, version ${detail.review?.version}. The First Responsible Person is emailed for each CAPA record and the analysis reopens for correction.`
        }
        confirmLabel={deciding === 'approve' ? 'Approve' : 'Reject and notify'}
        remarksLabel={deciding === 'approve' ? 'Remarks' : 'Rejection remarks (required)'}
        remarksHint={deciding === 'approve' ? 'Optional. Recorded in the review history.' : 'Explain what must be corrected. These remarks are included in the email.'}
        onClose={() => setDeciding(null)}
        onConfirm={async (body) => {
          const res = await (deciding === 'approve' ? d3Api.approve(c._id, body) : d3Api.reject(c._id, body));
          const was = deciding;
          setDeciding(null);
          refreshed(res.data);
          setParams({ tab: 'D3' }, { replace: true });
          notify(was === 'approve' ? 'Analysis approved.' : 'Analysis returned for rework. The First Responsible Person has been emailed.');
        }}
      />

      {/* Acknowledge Modal */}
      <AcknowledgeModal
        open={acking}
        complaint={c}
        onClose={() => setAcking(false)}
        onDone={(next, to, coordTo) => {
          setAcking(false);
          refreshed(next);
          setParams({ tab: 'D1' }, { replace: true });
          notify(`Acknowledged. Acknowledgement email dispatched${to ? ` to ${to}` : ''}${coordTo ? ` and coordinator (${coordTo})` : ''}.`);
          setTimeout(() => setHistoryKey((k) => k + 1), 2500);
        }}
      />
    </div>
  );
}
