import { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { complaintApi, userApi } from '../../api/endpoints.js';
import { readError } from '../../api/client.js';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';
import { Field } from '../../components/Field.jsx';
import { Loading } from '../../components/States.jsx';

const newKey = () => `ack-${crypto.randomUUID()}`;

/**
 * Shows exactly what the requester and coordinator will receive before approving.
 * Coordinator is database-mapped based on SBU and cannot be manually altered.
 * One idempotency key per dialog: if the request times out and the user
 * presses the button again, the server recognises the repeat.
 */
export function AcknowledgeModal({ open, complaint, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [activeEmailTab, setActiveEmailTab] = useState('requester'); // 'requester' | 'handler'
  const [remarks, setRemarks] = useState('');
  const [coordinatorId, setCoordinatorId] = useState(complaint.coordinator?._id || complaint.coordinator || '');
  const [coordinators, setCoordinators] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey());

  useEffect(() => {
    if (!open) return;
    key.current = newKey();
    setRemarks('');
    setError(null);
    setPreview(null);
    setCoordinatorId(complaint.coordinator?._id || complaint.coordinator || '');

    userApi
      .directory()
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setCoordinators(list);
      })
      .catch(() => {});

    complaintApi
      .acknowledgementPreview(complaint._id)
      .then((r) => {
        setPreview(r.data);
        if (r.data.coordinatorId) setCoordinatorId(r.data.coordinatorId);
      })
      .catch((err) => setError(readError(err).message));
  }, [open, complaint._id, complaint.coordinator]);

  const selectedCoordinator = coordinators.find((c) => String(c._id) === String(coordinatorId));
  const coordEmail = selectedCoordinator?.email || preview?.coordinatorTo;

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await complaintApi.acknowledge(complaint._id, {
        remarks: remarks || undefined,
        coordinator: coordinatorId || undefined,
        idempotencyKey: key.current,
      });
      onDone(res.data, preview?.to, coordEmail);
    } catch (err) {
      const e = readError(err);
      setError(e.code === 'VALIDATION_FAILED' ? err.response.data.error.details.map((d) => d.message).join(' ') : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title="Approve acknowledgement"
      description={`${complaint.complaintNumber}. The complaint moves to “Acknowledged”, D1 details are locked, and acknowledgement emails are dispatched.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Mail} loading={busy} disabled={!preview?.to} onClick={approve}>
            Approve and send email
          </Button>
        </>
      }
    >
      {error && <p className="mb-4 rounded border border-bad/20 bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
      {!preview && !error ? (
        <Loading label="Preparing email" />
      ) : preview ? (
        <div className="space-y-4">
          {/* Tabs for the 2 distinct emails dispatched upon D1 completion (SOP Page 5) */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="flex border-b border-slate-200 bg-slate-50/80 p-1">
              <button
                type="button"
                onClick={() => setActiveEmailTab('requester')}
                className={`flex-1 rounded py-1.5 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  activeEmailTab === 'requester'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Email to Requester
              </button>
              <button
                type="button"
                onClick={() => setActiveEmailTab('handler')}
                className={`flex-1 rounded py-1.5 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  activeEmailTab === 'handler'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Email to Complaint Handler
              </button>
            </div>

            {activeEmailTab === 'requester' ? (
              <div>
                <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 border-b border-slate-100 bg-slate-50/40 px-4 py-2.5 text-xs">
                  <dt className="text-slate-500 font-medium">To (Requester)</dt>
                  <dd>{preview.to || <span className="text-bad">No requester email. Add one in D1 before approving.</span>}</dd>
                  <dt className="text-slate-500 font-medium">Subject</dt>
                  <dd className="font-semibold text-slate-900">{preview.subject}</dd>
                </dl>
                <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-xs text-slate-800 leading-relaxed max-h-52 overflow-y-auto">{preview.text}</pre>
              </div>
            ) : (
              <div>
                <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 border-b border-slate-100 bg-slate-50/40 px-4 py-2.5 text-xs">
                  <dt className="text-slate-500 font-medium">To (Handler)</dt>
                  <dd className="font-medium text-slate-800">
                    {coordEmail ? (
                      <span>{selectedCoordinator?.name || preview.coordinatorName || 'Chandan'} &lt;{coordEmail}&gt;</span>
                    ) : (
                      <span>{preview?.coordinatorName || 'Chandan (Quality Coordinator)'} &lt;{preview?.coordinatorTo || 'chandan@naturalremedies.com'}&gt;</span>
                    )}
                  </dd>
                  <dt className="text-slate-500 font-medium">Subject</dt>
                  <dd className="font-semibold text-slate-900">{preview.handlerSubject || `Complaint ${complaint.complaintNumber} D1 stage Completion Update`}</dd>
                </dl>
                <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-xs text-slate-800 leading-relaxed max-h-52 overflow-y-auto">{preview.handlerText || `Dear ${selectedCoordinator?.name || preview?.coordinatorName || 'Complaint Handler'},\n\nWe are pleased to inform you that complaint ${complaint.complaintNumber} has completed D1 Stage and moved to D2 stage.\n\nPlease proceed with the D2 stage process. If you have any concerns, please feel free to reach out.\n\nView Complaint Record: ${window.location.origin}/complaints/${complaint._id}\n\nBest Regards,\nCustomer Relationship Management Team\n\nNote: This is an auto-generated email. Please do not reply to this email.`}</pre>
              </div>
            )}
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/70 p-2.5 text-xs">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block mb-0.5">
              Assigned Complaint Handler
            </span>
            <p className="font-semibold text-slate-900 text-xs">
              {selectedCoordinator?.name || preview?.coordinatorName || complaint.coordinator?.name || 'Chandan (Quality Coordinator)'}
              <span className="ml-1 text-slate-500 font-normal text-[11px]">
                &lt;{coordEmail || preview?.coordinatorTo || complaint.coordinator?.email || 'chandan@naturalremedies.com'}&gt;
              </span>
            </p>
          </div>

          <Field label="Internal remarks" hint="Optional. Recorded in the complaint history; never sent to the requester.">
            {(p) => <textarea {...p} rows={2} maxLength={2000} className="field-input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />}
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}
