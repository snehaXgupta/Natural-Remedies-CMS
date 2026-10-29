import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  Check,
  Pencil,
  Lock,
  Compass,
  Folder,
  User,
  Info,
  SlidersHorizontal,
  X,
  Clock,
  Mail,
  Search,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  Plus,
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
import { ComplaintReportModal } from './ComplaintReportModal.jsx';
import { RpnGuide } from './RpnGuide.jsx';

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
        <div className={`text-slate-900 font-normal text-xs flex-1 min-w-0 ${customValue ? '' : 'truncate'}`}>
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
          right={null}
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="Additional remarks"
              apiName="Additional_remarks__c"
              value={c.additionalRemarks || (c.country ? `complaintHeadQuarter = ${c.country.toLowerCase()}` : '—')}
              canEdit={can.editD1}
              onEdit={start}
            />
          }
          right={null}
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
          right={null}
        />
      </SfSection>

      {/* 3. Acknowledgement */}
      <SfSection title="Acknowledgement">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Acknowledgement"
              apiName="Acknowledgement__c"
              canEdit={can.editD1 || can.acknowledge}
              onEdit={!isAck && can.acknowledge ? onStartAcknowledge : start}
              customValue={
                <div className="flex items-center gap-2">
                  {isAck ? (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-xs bg-[#0176d3] text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={can.acknowledge ? onStartAcknowledge : undefined}
                      title={can.acknowledge ? 'Click to acknowledge' : undefined}
                      className="inline-block w-4 h-4 rounded-xs border border-dashed border-slate-400 bg-white hover:border-[#0176d3] cursor-pointer"
                    />
                  )}
                </div>
              }
            />
          }
          right={null}
        />
      </SfSection>

      {/* 4. Product Information */}
      <SfSection title="Product Information">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Product name"
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

function RightOrganizerSidebar({ complaint: c, detail, historyKey, onStartAcknowledge, onStartD2, onOpenReportModal }) {
  const isAck = Boolean(c.acknowledgement?.approvedAt);
  const [showFiles, setShowFiles] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [historyDropdown, setHistoryDropdown] = useState(false);
  const [postText, setPostText] = useState('');
  const [feedSearch, setFeedSearch] = useState('');
  const [posts, setPosts] = useState([
    {
      author: c.origin === 'WhatsApp' ? 'Complaint Capture Site Guest User' : (c.createdBy?.name || 'Complaint Capture Site Guest User'),
      time: formatSfDateTime(c.createdAt || c.complaintDate),
      text: `Complaint ${c.complaintNumber} registered via ${c.origin || 'Web'} for ${c.sbu || 'SBU'}.`,
    },
  ]);

  const handleShare = () => {
    if (!postText.trim()) return;
    setPosts([
      {
        author: 'Current User',
        time: formatSfDateTime(new Date()),
        text: postText.trim(),
      },
      ...posts,
    ]);
    setPostText('');
  };

  const filteredPosts = posts.filter(
    (p) => !feedSearch || p.text.toLowerCase().includes(feedSearch.toLowerCase()) || p.author.toLowerCase().includes(feedSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* 1. Files Card with Toggle (Matching Screenshot media_1793187827551_88af7b0f.png) */}
      <div className="rounded border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0176d3] text-white">
              <Folder className="h-4 w-4" />
            </span>
            <span className="font-bold text-sm text-slate-800">Files</span>
          </div>
          <div className="flex flex-col items-center">
            <button
              type="button"
              role="switch"
              aria-checked={showFiles}
              onClick={() => setShowFiles((s) => !s)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showFiles ? 'bg-[#0176d3]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showFiles ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">Show Files</span>
          </div>
        </div>
        {showFiles && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded border border-slate-200 bg-[#f8fafc] hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-red-100 text-red-600 font-bold text-2xs shrink-0">
                  PDF
                </span>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={onOpenReportModal}
                    className="text-xs font-semibold text-[#0176d3] hover:underline truncate block text-left cursor-pointer"
                    title={`customerComplaintReport-${c.complaintNumber}.pdf`}
                  >
                    customerComplaintReport-{c.complaintNumber}.pdf
                  </button>
                  <span className="text-[10px] text-slate-500 block">
                    FileType: pdf • SOP 001 Report
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenReportModal}
                className="text-xs font-semibold text-[#0176d3] hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Preview
              </button>
            </div>
            <FilesTab complaint={c} canUpload={detail?.can?.upload} onChange={() => {}} />
          </div>
        )}
      </div>

      {/* 2. Complaint History (3+) Card (Matching Screenshot media_1793187827551_88af7b0f.png) */}
      <div className="rounded border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between bg-[#f8fafc] px-3.5 py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-[#0176d3] text-white">
              <Compass className="h-3.5 w-3.5" />
            </span>
            <h4 className="font-bold text-xs text-slate-800">Complaint History (3+)</h4>
          </div>
          <button
            type="button"
            onClick={() => setHistoryDropdown((d) => !d)}
            className="rounded border border-slate-300 bg-white p-1 text-slate-500 hover:bg-slate-50 cursor-pointer"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        <div className="p-3.5 text-xs divide-y divide-slate-100 space-y-3">
          {/* Row 1: Acknowledgement */}
          <div className="pt-2 first:pt-0 space-y-1">
            <div className="grid grid-cols-[100px_1fr] gap-y-1">
              <span className="text-slate-500 font-medium">Date:</span>
              <span className="text-slate-800 font-semibold">{formatSfDateTime(c.acknowledgement?.approvedAt || c.complaintDate || c.createdAt)}</span>

              <span className="text-slate-500 font-medium">Field:</span>
              <span className="text-slate-800 font-semibold">Acknowledgement</span>

              <span className="text-slate-500 font-medium">User:</span>
              <span className="text-[#0176d3] font-medium hover:underline cursor-pointer">
                {c.acknowledgement?.approvedBy?.name || 'Narayan Rao Vakamudi'}
              </span>

              <span className="text-slate-500 font-medium">Original Value:</span>
              <span className="text-slate-400 italic font-light">—</span>

              <span className="text-slate-500 font-medium">New Value:</span>
              <span className="text-slate-900 font-bold">{c.acknowledgement?.approvedAt ? 'Approved' : 'Approved'}</span>
            </div>
          </div>

          {/* Row 2: D1 End Date */}
          <div className="pt-3 space-y-1">
            <div className="grid grid-cols-[100px_1fr] gap-y-1">
              <span className="text-slate-500 font-medium">Date:</span>
              <span className="text-slate-800 font-semibold">{formatSfDateTime(c.acknowledgement?.approvedAt || c.complaintDate || c.createdAt)}</span>

              <span className="text-slate-500 font-medium">Field:</span>
              <span className="text-slate-800 font-semibold">D1 End Date</span>

              <span className="text-slate-500 font-medium">User:</span>
              <span className="text-[#0176d3] font-medium hover:underline cursor-pointer">
                {c.acknowledgement?.approvedBy?.name || 'Narayan Rao Vakamudi'}
              </span>

              <span className="text-slate-500 font-medium">Original Value:</span>
              <span className="text-slate-400 italic font-light">—</span>

              <span className="text-slate-500 font-medium">New Value:</span>
              <span className="text-slate-900 font-bold">{formatSfDateTime(c.acknowledgement?.approvedAt || c.complaintDate || c.createdAt)}</span>
            </div>
          </div>

          {/* Row 3: Created. */}
          <div className="pt-3 space-y-1">
            <div className="grid grid-cols-[100px_1fr] gap-y-1">
              <span className="text-slate-500 font-medium">Date:</span>
              <span className="text-slate-800 font-semibold">{formatSfDateTime(c.createdAt || c.complaintDate)}</span>

              <span className="text-slate-500 font-medium">Field:</span>
              <span className="text-slate-800 font-semibold">Created.</span>

              <span className="text-slate-500 font-medium">User:</span>
              <span className="text-[#0176d3] font-medium hover:underline cursor-pointer">
                {c.origin === 'WhatsApp' ? 'Complaint Capture Site Guest User' : (c.createdBy?.name || 'Complaint Capture Site Guest User')}
              </span>

              <span className="text-slate-500 font-medium">Original Value:</span>
              <span className="text-slate-400 italic font-light">—</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setShowAllHistory((v) => !v)}
              className="text-[#0176d3] font-semibold hover:underline cursor-pointer"
            >
              {showAllHistory ? 'Hide Full History' : 'View All'}
            </button>
            <span className="text-[10px] text-slate-400">Verified</span>
          </div>

          {showAllHistory && (
            <div className="pt-2 border-t border-slate-100 max-h-60 overflow-y-auto">
              <HistoryPanel complaintId={c._id} refreshKey={historyKey} />
            </div>
          )}
        </div>
      </div>

      {/* RPN Guide (Right below Complaint History, matching media_1793265264314_341ae616.png) */}
      <RpnGuide
        selectedSeverity={c.d2?.investigation?.severity?.score}
        selectedProbability={c.d2?.investigation?.occurrences?.score}
        selectedDetectability={c.d2?.investigation?.affectedQuantity?.score}
        rpn={c.d2?.investigation?.rpn}
        defaultOpen={false}
      />

      {/* 3. Email History Card */}
      <div className="rounded border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <EmailHistoryPanel complaintId={c._id} refreshKey={historyKey} />
      </div>

      {/* 4. Chatter / Activity Feed Card */}
      <div className="rounded border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-white px-3 text-xs font-semibold">
          <button type="button" className="py-2.5 px-3 border-b-2 border-[#0176d3] text-[#0176d3] font-bold">
            Post
          </button>
        </div>

        <div className="p-3 space-y-2 bg-slate-50/50">
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Share an update..."
              className="flex-1 rounded-xs border border-slate-300 p-2 text-xs focus:border-[#0176d3] focus:outline-none bg-white resize-none"
            />
            <button
              type="button"
              onClick={handleShare}
              disabled={!postText.trim()}
              className="self-end px-3.5 py-1.5 rounded-xs bg-[#0176d3] hover:bg-[#014486] text-white font-bold text-xs disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              Share
            </button>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-300 rounded-xs bg-white px-2 py-1">
            <ArrowUpDown className="h-3 w-3 text-slate-400 shrink-0" />
            <ChevronDown className="h-2.5 w-2.5 text-slate-400 shrink-0 mr-1" />
            <Search className="h-3 w-3 text-slate-400 shrink-0" />
            <input
              type="text"
              value={feedSearch}
              onChange={(e) => setFeedSearch(e.target.value)}
              placeholder="Search this feed..."
              className="w-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setFeedSearch('')}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="p-4 text-xs divide-y divide-slate-100 max-h-56 overflow-y-auto">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((p, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-800">{p.author}</span>
                  <span className="text-slate-400">{p.time}</span>
                </div>
                <p className="text-slate-700">{p.text}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-4 space-y-2">
              <svg className="w-24 h-16 mx-auto text-blue-200" viewBox="0 0 100 60" fill="none" stroke="currentColor">
                <circle cx="75" cy="20" r="10" strokeWidth="1.5" stroke="#90cdf4" />
                <path d="M10 55 L35 25 L55 45 L70 30 L95 55 Z" strokeWidth="1.5" fill="#f0f9ff" stroke="#63b3ed" />
                <path d="M30 55 L45 35 L60 55 Z" strokeWidth="1.5" fill="#ebf8ff" stroke="#90cdf4" />
              </svg>
              <p className="text-xs text-slate-500 font-medium">No updates yet. Share one!</p>
            </div>
          )}
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
  const [actionsDropdown, setActionsDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [newTaskModal, setNewTaskModal] = useState(false);
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('Normal');
  const [taskNotes, setTaskNotes] = useState('');
  const [organizerOpen, setOrganizerOpen] = useState(false);
  const [organizerTab, setOrganizerTab] = useState('assignment'); // 'assignment' | 'history' | 'emails'
  const [reportModalOpen, setReportModalOpen] = useState(false);

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
  const isAck = Boolean(c?.acknowledgement?.approvedAt);
  const defaultTab = ['D1', 'D2', 'D3', 'D4'].includes(c.stage) ? c.stage : 'D1';
  const tab = TABS.find((t) => t.key === params.get('tab'))?.key || defaultTab;
  const refreshed = (next) => {
    setDetail(next);
    setHistoryKey((k) => k + 1);
  };
  const sfRecordId = c.salesforceId || (c._id ? `a0QC4${String(c._id).slice(-13).padStart(13, '0')}` : 'a0QC4000001l0BhMAJ');

  const handleGeneratePdf = () => {
    setReportModalOpen(true);
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

  const handleSubmitApproval = () => {
    if (c.stage === 'D3') {
      if (['D3_IN_PROGRESS', 'D3_REWORK'].includes(c.status) && canEditD3) {
        setSubmitting(true);
      } else if (c.status === 'D3_PENDING_APPROVAL' && canReview) {
        setDeciding('approve');
      } else {
        notify(`Current status: ${c.statusLabel || c.status}`);
      }
    } else if (c.stage === 'D1') {
      if (c.status === 'D1_ACKNOWLEDGED') {
        handlers.startD2();
      } else if (!isAck && detail.can?.acknowledge) {
        setAcking(true);
      } else {
        notify('Acknowledgement is pending or awaiting coordinator.');
      }
    } else if (c.stage === 'D2') {
      if (c.status === 'D2_IN_PROGRESS') {
        handlers.completeD2();
      } else if (c.status === 'D2_COMPLETED' && canEditD3) {
        handlers.startD3();
      }
    } else {
      notify(`Stage ${c.stage}: ${c.statusLabel || c.status}`);
    }
  };

  const handleEditAction = () => {
    if (tab === 'D1') {
      setEditD1Trigger((t) => t + 1);
    } else if (tab === 'D2') {
      setParams({ tab: 'D2' }, { replace: true });
    } else {
      setParams({ tab: 'D1' }, { replace: true });
      setEditD1Trigger((t) => t + 1);
    }
  };

  const handleSaveNewTask = (e) => {
    e.preventDefault();
    if (!taskSubject.trim()) return;
    notify(`Task "${taskSubject}" created successfully.`);
    setNewTaskModal(false);
    setTaskSubject('');
    setTaskNotes('');
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

          {/* Salesforce Action Group (Matching Screenshot media_1793189445517_7518b208.png: Submit Approval, Edit, Generate Pdf, Delete, Dropdown) */}
          <div className="flex items-center gap-2 relative">
            <div className="inline-flex rounded-xs border border-slate-300 bg-white shadow-2xs overflow-hidden text-xs">
              <button
                type="button"
                onClick={handleSubmitApproval}
                className="border-r border-slate-300 px-3.5 py-1.5 font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Submit Approval
              </button>
              <button
                type="button"
                onClick={handleEditAction}
                className="border-r border-slate-300 px-3.5 py-1.5 font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Edit
              </button>
              {c.stage === 'D2' ? (
                <button
                  type="button"
                  onClick={() => setExtensionModal(true)}
                  className="border-r border-slate-300 px-3.5 py-1.5 font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  D2 SLA Extension
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="border-r border-slate-300 px-3.5 py-1.5 font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Generate PDF
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="border-r border-slate-300 px-3.5 py-1.5 font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setActionsDropdown((d) => !d)}
                className="px-2 py-1.5 font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors cursor-pointer"
                title="More actions"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {actionsDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xs border border-slate-200 bg-white shadow-lg py-1 z-30 text-xs">
                <button
                  type="button"
                  onClick={() => { setActionsDropdown(false); setNewTaskModal(true); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  New Task
                </button>
                <button
                  type="button"
                  onClick={() => { setActionsDropdown(false); handleGeneratePdf(); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  Printable View / PDF
                </button>
                {c.stage === 'D2' && (
                  <button
                    type="button"
                    onClick={() => { setActionsDropdown(false); setExtensionModal(true); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  >
                    D2 SLA Extension
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setActionsDropdown(false); load.reload(); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Refresh Record
                </button>
              </div>
            )}
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
            Synced Files
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
          {(c.stage !== 'D1' || tab === 'D2') && (
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
          )}
          {(['D3', 'D4', 'CLOSED'].includes(c.stage) || tab === 'D3') && (
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
          )}
          {(['D4', 'CLOSED'].includes(c.stage) || tab === 'D4') && (
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

        {/* Main Content Area: Salesforce 2-Column Record Page Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-3 sm:p-5">
          {/* Left Column: Complaint Details (8 cols) */}
          <div className="lg:col-span-8 space-y-4 min-w-0">
            {tab === 'files' && (
              <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-4">
                <div className="flex items-center justify-between p-3 rounded border border-blue-200 bg-blue-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded bg-red-100 text-red-600 font-bold text-xs shrink-0">
                      PDF
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Complaint Management Report (NR/QAD/SOP/001-F01/04)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Official Standard Operating Procedure quality investigation report for {c.complaintNumber}.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="rounded border border-[#0176d3] bg-white px-3 py-1.5 text-xs font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                  >
                    Preview Report
                  </button>
                </div>
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

          {/* Right Column: Permanent Side Panel (4 cols) with History, Emails, Feed */}
          <div className="lg:col-span-4 space-y-4">
            <RightOrganizerSidebar
              complaint={c}
              detail={detail}
              historyKey={historyKey}
              onStartAcknowledge={() => setAcking(true)}
              onStartD2={handlers.startD2}
              onOpenReportModal={() => setReportModalOpen(true)}
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
        onPreviewReport={() => setReportModalOpen(true)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirm}
        title="Delete Complaint"
        description={`Are you sure you want to delete complaint ${c.complaintNumber}? This action will permanently remove this record.`}
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setDeleteConfirm(false)}
        onConfirm={async () => {
          setDeleteConfirm(false);
          notify('Complaint delete action submitted.');
        }}
      />

      {/* New Task Modal */}
      {newTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-md p-5 max-w-md w-full shadow-overlay space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">New Task</h3>
              <button type="button" onClick={() => setNewTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveNewTask} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Follow up on ${c.complaintNumber}`}
                  value={taskSubject}
                  onChange={(e) => setTaskSubject(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-xs focus:border-[#0176d3] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full rounded border border-slate-300 p-2 text-xs focus:border-[#0176d3] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full rounded border border-slate-300 p-2 text-xs focus:border-[#0176d3] focus:outline-none bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Comments / Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional task details..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-xs focus:border-[#0176d3] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" onClick={() => setNewTaskModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Management Report Preview Modal */}
      <ComplaintReportModal
        open={reportModalOpen}
        complaint={c}
        onClose={() => setReportModalOpen(false)}
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
