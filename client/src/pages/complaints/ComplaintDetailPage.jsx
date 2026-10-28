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
  Clock,
  Mail,
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
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400 italic text-xs">Pending acknowledgement</span>
                    {(can.acknowledge || !isAck) && (
                      <button
                        type="button"
                        onClick={onStartAcknowledge}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#0176d3] text-white font-semibold hover:bg-[#014486] transition-colors shadow-2xs"
                      >
                        <Check className="h-3 w-3" />
                        <span>Acknowledge</span>
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

/* ---------------- Salesforce Right Organizer Sidebar ---------------- */

function RightOrganizerSidebar({ complaint: c, detail, historyKey, onStartAcknowledge, onStartD2 }) {
  const isAck = Boolean(c.acknowledgement?.approvedAt);
  return (
    <div className="rounded border border-slate-200 bg-white shadow-2xs overflow-hidden sticky top-3">
      {/* Salesforce Lightning Sidebar Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-[#f8fafc] px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 uppercase tracking-wider">
          <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
          <span>Organizer</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Activity & Details</span>
      </div>

      {/* Single Unified Scrollable Body: 1) Assignment -> 2) History Track -> 3) Email History */}
      <div className="p-4 text-xs max-h-[calc(100vh-10rem)] overflow-y-auto space-y-6">
        {/* 1. Assignment & Ownership */}
        <div className="space-y-3.5">
          {/* Quick Action Alert: D1 Acknowledgement */}
          {!isAck && (
            <div className="p-3 rounded border border-blue-200 bg-blue-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 text-xs">D1 Pending Acknowledgement</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase">Action Required</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-snug">
                Approving acknowledgement sends formal email confirmation to the requester and coordinator, then advances to D2.
              </p>
              <button
                type="button"
                onClick={onStartAcknowledge}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#0176d3] hover:bg-[#014486] text-white font-bold text-xs shadow-2xs transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Acknowledge & Advance to D2 &rarr;</span>
              </button>
            </div>
          )}

          {/* Quick Action Alert: D1 Acknowledged -> Ready to Start D2 */}
          {c.status === 'D1_ACKNOWLEDGED' && (
            <div className="p-3 rounded border border-emerald-200 bg-emerald-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs">D1 Acknowledged</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">Ready for D2</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                Intake acknowledged and verified. Proceed to preliminary investigation, RPN calculation, and FRP assignment.
              </p>
              <button
                type="button"
                onClick={onStartD2}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#0176d3] hover:bg-[#014486] text-white font-bold text-xs shadow-2xs transition-colors"
              >
                <span>Start D2 Investigation &rarr;</span>
              </button>
            </div>
          )}

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Assignment Details</h4>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2 bg-slate-50 p-2.5 rounded border border-slate-200/80">
                <dt className="text-[10px] text-slate-500 uppercase font-semibold">First Responsible Person (FRP)</dt>
                <dd className="font-semibold text-slate-900 mt-0.5 flex items-center justify-between">
                  <span>{c.frp?.name || <span className="text-amber-600 font-medium">Pending Assignment (in D2)</span>}</span>
                  {c.frp?.designation && <span className="text-[10px] text-slate-400 font-normal">{c.frp.designation}</span>}
                </dd>
              </div>

              <div className="col-span-2 bg-slate-50 p-2.5 rounded border border-slate-200/80">
                <dt className="text-[10px] text-slate-500 uppercase font-semibold">Complaint Coordinator</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {c.coordinator?.name ? (
                    <span>{c.coordinator.name} <span className="text-[10px] text-slate-500 font-normal">({c.coordinator.email})</span></span>
                  ) : (
                    <span className="text-slate-400 font-normal">Not assigned</span>
                  )}
                </dd>
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                <dt className="text-[10px] text-slate-500 uppercase font-semibold">Current Stage</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{c.stage}</dd>
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                <dt className="text-[10px] text-slate-500 uppercase font-semibold">Status</dt>
                <dd className="font-bold text-[#0176d3] truncate mt-0.5" title={c.statusLabel || c.status}>
                  {c.statusLabel || c.status}
                </dd>
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                <dt className="text-[10px] text-slate-500 uppercase font-semibold">Priority</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{c.priority || 'Not set'}</dd>
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                <dt className="text-[10px] text-slate-500 uppercase font-semibold">Origin</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{c.origin || 'Web'}</dd>
              </div>

              <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-200/80">
                <dt className="text-[10px] text-slate-500 uppercase font-semibold">Strategic Business Unit (SBU)</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{c.sbu || '—'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 2. History Track */}
        <div className="border-t border-slate-200 pt-4 space-y-2.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Stage History & Audit Track</span>
          </h4>
          <HistoryPanel complaintId={c._id} refreshKey={historyKey} />
        </div>

        {/* 3. Email History */}
        <div className="border-t border-slate-200 pt-4 space-y-2.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-blue-600" />
            <span>Email History & Dispatches</span>
          </h4>
          <EmailHistoryPanel complaintId={c._id} refreshKey={historyKey} />
        </div>
      </div>
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
  const { user, canAny } = useAuth();
  const canReview = canAny('complaint.d3.review');
  const canEditD3 = canAny('complaint.d3.edit');
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

  const handleStartD4 = async () => {
    try {
      const res = await complaintApi.startD4(c._id);
      refreshed(res.data);
      setParams({ tab: 'D4' }, { replace: true });
      notify('Complaint moved to D4 Stage (Effectiveness Review).');
    } catch (err) {
      notify(readError(err).message, 'bad');
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
                  className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
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
              {c.status === 'D1_ACKNOWLEDGED' && (
                <button
                  type="button"
                  onClick={handlers.startD2}
                  className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-bold text-[#0176d3] hover:bg-blue-50 transition-colors"
                >
                  Start D2 Investigation &rarr;
                </button>
              )}
              {c.stage === 'D2' && (
                <button
                  type="button"
                  onClick={() => setExtensionModal(true)}
                  className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  D2 SLA Extension
                </button>
              )}
              {c.stage === 'D3' && (
                <>
                  {c.status === 'D3_PENDING_APPROVAL' ? (
                    canReview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setDeciding('approve')}
                          className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          ✓ Approve Analysis
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeciding('reject')}
                          className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          ✕ Reject / Rework
                        </button>
                      </>
                    ) : (
                      <span className="border-r border-slate-300 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50">
                        Waiting for Reviewer
                      </span>
                    )
                  ) : ['D3_IN_PROGRESS', 'D3_REWORK'].includes(c.status) && canEditD3 ? (
                    <button
                      type="button"
                      onClick={() => setSubmitting(true)}
                      className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {c.status === 'D3_REWORK' ? 'Resubmit for Approval' : 'Submit for Approval'}
                    </button>
                  ) : c.status === 'D3_APPROVED' ? (
                    <button
                      type="button"
                      onClick={handleStartD4}
                      className="border-r border-slate-300 px-3.5 py-1.5 text-xs font-bold text-[#0176d3] hover:bg-blue-50 transition-colors"
                    >
                      Proceed to D4 Stage &rarr;
                    </button>
                  ) : null}
                </>
              )}
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>

        {/* Chevron Stage Path Ribbon (D1, D2, D3, ...) */}
        <StageTracker
          stage={c.stage}
          status={c.status}
          onSelectTab={(t) => {
            if (t === 'D2' && c.status === 'D1_ACKNOWLEDGED') {
              handlers.startD2();
              return;
            }
            setParams({ tab: t }, { replace: true });
          }}
        />

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
          <button
            type="button"
            onClick={() => {
              if (c.status === 'D1_ACKNOWLEDGED') {
                handlers.startD2();
                return;
              }
              setParams({ tab: 'D2' }, { replace: true });
            }}
            className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
              tab === 'D2'
                ? 'border-[#0176d3] text-[#0176d3] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            D2-Grasp The Situation
          </button>
          <button
            type="button"
            onClick={() => setParams({ tab: 'D3' }, { replace: true })}
            className={`whitespace-nowrap px-3.5 py-2.5 transition-colors border-b-2 ${
              tab === 'D3'
                ? 'border-[#0176d3] text-[#0176d3] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            D3 - RCA & CAPA
          </button>
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

        {/* Main Content Area: Salesforce 2-Column Record Page Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-3 sm:p-5">
          {/* Primary Tab Content (8 cols on large screens) */}
          <div className="lg:col-span-8 space-y-4 min-w-0">
            {tab === 'files' && (
              <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs">
                <FilesTab complaint={c} canUpload={detail.can.upload} onChange={() => { load.reload(); setHistoryKey((k) => k + 1); }} />
              </div>
            )}
            {tab === 'D1' && (
              <div className="bg-white rounded border border-slate-200 shadow-2xs">
                <D1Tab
                  detail={detail}
                  onSaved={refreshed}
                  refreshKey={historyKey}
                  onStartAcknowledge={() => setAcking(true)}
                  startEditTrigger={editD1Trigger}
                />
              </div>
            )}
            {tab === 'D2' && (
              <div className="bg-white rounded border border-slate-200 p-4 sm:p-5 shadow-2xs">
                <D2Tab key={c.__v} detail={detail} onSaved={refreshed} refreshKey={historyKey} />
              </div>
            )}
            {tab === 'D3' && (
              <div className="bg-white rounded border border-slate-200 p-4 sm:p-5 shadow-2xs">
                <D3Tab
                  complaint={c}
                  review={detail.review}
                  refreshKey={historyKey}
                  onChanged={() => setHistoryKey((k) => k + 1)}
                  onApprove={() => setDeciding('approve')}
                  onReject={() => setDeciding('reject')}
                  onStartD4={handleStartD4}
                />
              </div>
            )}
            {tab === 'D4' && (
              <div className="bg-white rounded border border-slate-200 p-4 sm:p-5 shadow-2xs">
                <D4Tab complaint={c} onRefresh={() => load.reload()} />
              </div>
            )}
            {tab === 'sla' && (
              <div className="bg-white rounded border border-slate-200 p-4 sm:p-5 shadow-2xs">
                <SlaTab complaint={c} />
              </div>
            )}
          </div>

          {/* Right-Hand Side Organizer Panel (4 cols on large screens) */}
          <div className="lg:col-span-4 space-y-4">
            <RightOrganizerSidebar
              complaint={c}
              detail={detail}
              historyKey={historyKey}
              onStartAcknowledge={() => setAcking(true)}
              onStartD2={handlers.startD2}
            />
          </div>
        </div>
      </div>

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
          setParams({ tab: 'D2' }, { replace: true });
          notify(`Acknowledged and advanced to D2 stage. Acknowledgement email dispatched${to ? ` to ${to}` : ''}${coordTo ? ` and coordinator (${coordTo})` : ''}.`);
          setTimeout(() => setHistoryKey((k) => k + 1), 2500);
        }}
      />
    </div>
  );
}
