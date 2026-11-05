import { useEffect, useState } from 'react';
import { Pencil, UserPlus, Lock, ChevronDown, User, Check, ExternalLink, Mail, Send } from 'lucide-react';
import { complaintApi, lookupApi } from '../../api/endpoints.js';
import { readError } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../lib/useAsync.js';
import { formatDateTime } from '../../lib/format.js';
import { Button } from '../../components/Button.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Loading } from '../../components/States.jsx';
import { useToast } from '../../components/Toast.jsx';
import { getRpnCategory } from './RpnGuide.jsx';

/* ---------------- form <-> API ---------------- */

const str = (v) => (v === null || v === undefined ? '' : String(v));

function toForm(c) {
  const vp = c.d2?.verifiedProduct || {};
  const inv = c.d2?.investigation || {};
  const slaD3D4 = inv.slaHoursD3 ?? inv.slaHoursD4 ?? '';

  return {
    verifiedProduct: {
      performanceRelated: Boolean(vp.performanceRelated),
      batchNumber: str(vp.batchNumber ?? c.reportedProduct?.batchNumber),
      sku: str(vp.sku),
      invoiceQuantity: str(vp.invoiceQuantity),
      remarks: str(vp.remarks),
    },
    investigation: {
      occurrencesScore: str(inv.occurrences?.score),
      affectedQuantityScore: str(inv.affectedQuantity?.score),
      severityScore: str(inv.severity?.score),
      rpn: str(inv.rpn),
      manufacturingLocation: str(inv.manufacturingLocation),
      locationDetail: str(inv.locationDetail),
      repeatComplaint: Boolean(inv.repeatComplaint),
      typeOfFailure: str(inv.typeOfFailure),
      slaHoursD3D4: str(slaD3D4),
    },
    assigneeId: str(c.frp?._id || c.frp || ''),
    sendMailToFrp: Boolean(c.d2?.sendMailToFrp),
  };
}

function toBody(f) {
  const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  const a = numOrNull(f.investigation.occurrencesScore);
  const b = numOrNull(f.investigation.affectedQuantityScore);
  const c = numOrNull(f.investigation.severityScore);
  const autoRpn = a !== null && b !== null && c !== null ? a * b * c : numOrNull(f.investigation.rpn);
  const sla = numOrNull(f.investigation.slaHoursD3D4);

  return {
    verifiedProduct: {
      performanceRelated: Boolean(f.verifiedProduct.performanceRelated),
      batchNumber: f.verifiedProduct.batchNumber || null,
      sku: f.verifiedProduct.sku || null,
      invoiceQuantity: numOrNull(f.verifiedProduct.invoiceQuantity),
      remarks: f.verifiedProduct.remarks || null,
    },
    investigation: {
      occurrences: { score: a },
      affectedQuantity: { score: b },
      severity: { score: c },
      rpn: autoRpn,
      manufacturingLocation: f.investigation.manufacturingLocation || null,
      locationDetail: f.investigation.locationDetail || null,
      repeatComplaint: Boolean(f.investigation.repeatComplaint),
      typeOfFailure: f.investigation.typeOfFailure || null,
      slaHoursD3: sla,
      slaHoursD4: sla,
      slaHoursD3D4: sla,
    },
    assigneeId: f.assigneeId || null,
    sendMailToFrp: Boolean(f.sendMailToFrp),
  };
}

/* ---------------- Salesforce UI Components ---------------- */

function SfSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-b border-slate-200/80 my-3">
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
        <div className="w-52 sm:w-60 shrink-0 text-slate-600 font-medium text-xs">
          <span>{label}</span>
        </div>
        <div className="text-slate-900 font-normal text-xs flex-1 min-w-0">
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

function SfCheckboxDisplay({ checked }) {
  if (checked) {
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-xs bg-[#0176d3] text-white">
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
    );
  }
  return (
    <span className="inline-block w-4 h-4 rounded-xs border border-dashed border-slate-400 bg-white" />
  );
}

/* ---------------- Read-only view matching screenshot ---------------- */

function D2RecordView({ complaint: c, canEdit, onEdit, onAssignFrp, onSendMailToFrp, sendingFrpMail }) {
  const vp = c.d2?.verifiedProduct || {};
  const inv = c.d2?.investigation || {};

  // Auto-calculated RPN fallback if not explicitly stored
  const aScore = inv.occurrences?.score;
  const bScore = inv.affectedQuantity?.score;
  const cScore = inv.severity?.score;
  const rpnVal = inv.rpn ?? (aScore != null && bScore != null && cScore != null ? aScore * bScore * cScore : '');
  const slaD3D4 = inv.slaHoursD3 ?? inv.slaHoursD4 ?? '';

  return (
    <div className="divide-y divide-slate-200/80 bg-white">
      {/* 1. Verified Product Information Section (Top) */}
      <div className="divide-y divide-slate-200/60">
        <SfFieldRow
          left={
            <SfFieldItem
              label="Performance/Efficacy related"
              apiName="Performance_related__c"
              customValue={<SfCheckboxDisplay checked={Boolean(vp.performanceRelated)} />}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          }
          right={
            <SfFieldItem
              label="SKU"
              apiName="SKU__c"
              value={vp.sku}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          }
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="Batch Number"
              apiName="Batch_Number__c"
              value={vp.batchNumber}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          }
          right={
            <SfFieldItem
              label="Remarks"
              apiName="Remarks__c"
              value={vp.remarks}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          }
        />
        <SfFieldRow
          left={
            <SfFieldItem
              label="Invoice Qty"
              apiName="Invoice_Qty__c"
              value={vp.invoiceQuantity}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          }
          right={null}
        />
      </div>

      {/* 2. Preliminary Investigation Section */}
      <SfSection title="Preliminary Investigation" defaultOpen={true}>
        <div className="divide-y divide-slate-200/60">
          <SfFieldRow
            left={
              <SfFieldItem
                label="A-No. of Occurrence of the Event & Score"
                apiName="A_No_of_Occurrence_of_the_Event_Score__c"
                value={inv.occurrences?.score}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
            right={
              <SfFieldItem
                label="B-Affected Qtys. & Score"
                apiName="B_Affected_Qtys_Score__c"
                value={inv.affectedQuantity?.score}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
          />
          <SfFieldRow
            left={
              <SfFieldItem
                label="C-Severity & Score"
                apiName="C_Severity_Score__c"
                value={inv.severity?.score}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
            right={
              <SfFieldItem
                label="RPN value"
                apiName="RPN_value__c"
                customValue={
                  rpnVal !== '' ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{rpnVal}</span>
                      {(() => {
                        const cat = getRpnCategory(rpnVal);
                        if (!cat) return null;
                        const cls =
                          cat.category === 'MINOR'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : cat.category === 'MAJOR'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-red-50 text-red-700 border-red-300';
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${cls}`}>
                            {cat.category}
                          </span>
                        );
                      })()}
                    </div>
                  ) : (
                    '-'
                  )
                }
                canEdit={false}
              />
            }
          />
          <SfFieldRow
            left={
              <SfFieldItem
                label="Manufacturing Location"
                apiName="Manufacturing_Location__c"
                value={inv.manufacturingLocation}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
            right={
              <SfFieldItem
                label="Type of failure"
                apiName="Type_of_failure__c"
                value={inv.typeOfFailure}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
          />
          <SfFieldRow
            left={
              <SfFieldItem
                label="Location detail"
                apiName="Location_detail__c"
                value={inv.locationDetail}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
            right={
              <SfFieldItem
                label="SLA Hours for D3 & D4"
                apiName="SLA_Hours_for_D3_D4__c"
                value={slaD3D4}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
          />
          <SfFieldRow
            left={
              <SfFieldItem
                label="Repeat complaint"
                apiName="Repeat_complaint__c"
                customValue={<SfCheckboxDisplay checked={Boolean(inv.repeatComplaint)} />}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
            right={null}
          />
        </div>
      </SfSection>

      {/* 3. First Responsible Person Section */}
      <SfSection title="First Responsible Person" defaultOpen={true}>
        <div className="divide-y divide-slate-200/60">
          <SfFieldRow
            left={
              <SfFieldItem
                label="First Responsible Person"
                apiName="First_Responsible_Person__c"
                customValue={
                  c.frp ? (
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-[#0176d3] text-white shadow-2xs">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={onAssignFrp}
                        className="text-[#0176d3] font-medium hover:underline cursor-pointer"
                      >
                        {c.frp.name}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onAssignFrp}
                      className="text-[#0176d3] hover:underline italic cursor-pointer"
                    >
                      Assign FRP
                    </button>
                  )
                }
                canEdit={canEdit}
                onEdit={onAssignFrp}
              />
            }
            right={null}
          />
          <SfFieldRow
            left={
              <SfFieldItem
                label="Send Mail To FRP"
                apiName="Send_Mail_To_FRP__c"
                customValue={
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <SfCheckboxDisplay checked={Boolean(c.d2?.sendMailToFrp)} />
                      <span className="text-slate-600 font-normal text-xs">
                        {c.d2?.sendMailToFrp ? 'Selected' : 'Not selected'}
                      </span>
                    </div>
                    {c.frp && (
                      <button
                        type="button"
                        onClick={onSendMailToFrp}
                        disabled={sendingFrpMail}
                        className="inline-flex items-center gap-1.5 rounded-xs border border-[#0176d3] bg-[#0176d3]/10 hover:bg-[#0176d3]/20 px-2.5 py-1 text-xs font-semibold text-[#0176d3] transition-colors cursor-pointer disabled:opacity-50"
                        title="Dispatch First Responsible Person assignment email (SOP Step 8.b)"
                      >
                        <Mail className="h-3 w-3" />
                        <span>{sendingFrpMail ? 'Sending...' : 'Send Mail to FRP'}</span>
                      </button>
                    )}
                  </div>
                }
                canEdit={canEdit}
                onEdit={onEdit}
              />
            }
            right={null}
          />
        </div>
      </SfSection>

      {c.d2?.completedAt && (
        <div className="px-4 py-3 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
          D2 completed by {c.d2.completedBy?.name} on {formatDateTime(c.d2.completedAt)}.
        </div>
      )}
    </div>
  );
}

/* ---------------- Edit form matching layout ---------------- */

function D2RecordForm({ form, setForm, errors, lists, c, onAssignFrp, candidates = [] }) {
  const setVp = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({
      ...prev,
      verifiedProduct: { ...prev.verifiedProduct, [field]: val },
    }));
  };

  const setInv = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => {
      const nextInv = { ...prev.investigation, [field]: val };
      if (field === 'manufacturingLocation') {
        nextInv.locationDetail = '';
      }
      // Auto-compute RPN
      const a = parseFloat(field === 'occurrencesScore' ? val : nextInv.occurrencesScore);
      const b = parseFloat(field === 'affectedQuantityScore' ? val : nextInv.affectedQuantityScore);
      const c = parseFloat(field === 'severityScore' ? val : nextInv.severityScore);
      if (!isNaN(a) && !isNaN(b) && !isNaN(c)) {
        nextInv.rpn = String(a * b * c);
      }
      return { ...prev, investigation: nextInv };
    });
  };

  const details = (lists.locationDetail || [])
    .filter((d) => d.parent?.toLowerCase() === form.investigation.manufacturingLocation?.toLowerCase())
    .map((d) => d.value);

  const numInputProps = { type: 'number', min: 0, step: 'any' };

  return (
    <div className="divide-y divide-slate-200/80 bg-white">
      {/* 1. Verified Product Information Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 border-b border-slate-200/60 text-xs">
        {/* Left Column */}
        <div className="divide-y divide-slate-200/60">
          <div className="px-4 py-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.verifiedProduct.performanceRelated}
                onChange={setVp('performanceRelated')}
                className="h-4 w-4 rounded-xs border-slate-300 text-[#0176d3] focus:ring-[#0176d3]"
              />
              <span className="text-slate-700 font-medium text-xs">
                Performance/Efficacy related
              </span>
            </label>
          </div>

          <div className="px-4 py-2.5">
            <label className="block text-slate-600 font-medium text-xs mb-1">
              Batch Number
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={form.verifiedProduct.batchNumber}
              onChange={setVp('batchNumber')}
              className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
            />
            {errors['verifiedProduct.batchNumber'] && (
              <p className="text-red-500 text-[11px] mt-0.5">{errors['verifiedProduct.batchNumber']}</p>
            )}
          </div>

          <div className="px-4 py-2.5">
            <label className="block text-slate-600 font-medium text-xs mb-1">
              Invoice Qty
            </label>
            <input
              {...numInputProps}
              value={form.verifiedProduct.invoiceQuantity}
              onChange={setVp('invoiceQuantity')}
              className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
            />
            {errors['verifiedProduct.invoiceQuantity'] && (
              <p className="text-red-500 text-[11px] mt-0.5">{errors['verifiedProduct.invoiceQuantity']}</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="divide-y divide-slate-200/60">
          <div className="px-4 py-2.5">
            <label className="block text-slate-600 font-medium text-xs mb-1">
              SKU
            </label>
            <input
              type="text"
              value={form.verifiedProduct.sku}
              onChange={setVp('sku')}
              className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
            />
            {errors['verifiedProduct.sku'] && (
              <p className="text-red-500 text-[11px] mt-0.5">{errors['verifiedProduct.sku']}</p>
            )}
          </div>

          <div className="px-4 py-2.5">
            <label className="block text-slate-600 font-medium text-xs mb-1">
              Remarks
            </label>
            <textarea
              rows={3}
              value={form.verifiedProduct.remarks}
              onChange={setVp('remarks')}
              className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
            />
            {errors['verifiedProduct.remarks'] && (
              <p className="text-red-500 text-[11px] mt-0.5">{errors['verifiedProduct.remarks']}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Preliminary Investigation Section */}
      <SfSection title="Preliminary Investigation" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 text-xs">
          {/* Left Column */}
          <div className="divide-y divide-slate-200/60">
            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                A-No. of Occurrence of the Event & Score (Probability: 2, 4, 6, 8)
              </label>
              <input
                {...numInputProps}
                value={form.investigation.occurrencesScore}
                onChange={setInv('occurrencesScore')}
                placeholder="Score (e.g. 2, 4, 6, 8)"
                className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
              />
              {errors['investigation.occurrences.score'] && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors['investigation.occurrences.score']}</p>
              )}
            </div>

            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                C-Severity & Score (Severity: 2, 4, 6, 54)
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                {...numInputProps}
                value={form.investigation.severityScore}
                onChange={setInv('severityScore')}
                placeholder="Score (e.g. 2, 4, 6, 54)"
                className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
              />
              {errors['investigation.severity.score'] && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors['investigation.severity.score']}</p>
              )}
            </div>

            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                Manufacturing Location
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={form.investigation.manufacturingLocation}
                onChange={setInv('manufacturingLocation')}
                className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none bg-white"
              >
                <option value="">Select location</option>
                {(lists.manufacturingLocation || []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
              {errors['investigation.manufacturingLocation'] && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors['investigation.manufacturingLocation']}</p>
              )}
            </div>

            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                Location detail
              </label>
              <select
                value={form.investigation.locationDetail}
                onChange={setInv('locationDetail')}
                disabled={!form.investigation.manufacturingLocation}
                className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none bg-white disabled:bg-slate-100"
              >
                <option value="">Select detail</option>
                {details.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-4 py-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.investigation.repeatComplaint}
                  onChange={setInv('repeatComplaint')}
                  className="h-4 w-4 rounded-xs border-slate-300 text-[#0176d3] focus:ring-[#0176d3]"
                />
                <span className="text-slate-700 font-medium text-xs">
                  Repeat complaint
                </span>
              </label>
            </div>
          </div>

          {/* Right Column */}
          <div className="divide-y divide-slate-200/60">
            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                B-Affected Qtys. & Score (Detectability: 2, 4, 6, 8)
              </label>
              <input
                {...numInputProps}
                value={form.investigation.affectedQuantityScore}
                onChange={setInv('affectedQuantityScore')}
                placeholder="Score (e.g. 2, 4, 6, 8)"
                className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
              />
              {errors['investigation.affectedQuantity.score'] && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors['investigation.affectedQuantity.score']}</p>
              )}
            </div>

            <div className="px-4 py-2.5 bg-slate-50/50">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                RPN value
              </label>
              <div className="flex items-center gap-2">
                <input
                  {...numInputProps}
                  value={form.investigation.rpn}
                  readOnly
                  placeholder="Auto-calculated (S × P × D)"
                  className="flex-1 rounded-xs border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none cursor-not-allowed"
                />
                {(() => {
                  const cat = getRpnCategory(form.investigation.rpn);
                  if (!cat) return null;
                  const cls =
                    cat.category === 'MINOR'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : cat.category === 'MAJOR'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-red-50 text-red-700 border-red-300';
                  return (
                    <span className={`px-2.5 py-1 rounded text-[11px] font-bold border uppercase tracking-wide shrink-0 ${cls}`}>
                      {cat.category}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                Type of failure
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={form.investigation.typeOfFailure}
                onChange={setInv('typeOfFailure')}
                className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none bg-white"
              >
                <option value="">Select failure type</option>
                {(lists.typeOfFailure || []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
              {errors['investigation.typeOfFailure'] && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors['investigation.typeOfFailure']}</p>
              )}
            </div>

            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                SLA Hours for D3 & D4
              </label>
              <input
                {...numInputProps}
                value={form.investigation.slaHoursD3D4}
                onChange={setInv('slaHoursD3D4')}
                placeholder="Hours (e.g. 24)"
                className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </SfSection>

      {/* 3. First Responsible Person Section */}
      <SfSection title="First Responsible Person" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 text-xs">
          <div className="divide-y divide-slate-200/60">
            <div className="px-4 py-2.5">
              <label className="block text-slate-600 font-medium text-xs mb-1">
                First Responsible Person
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={form.assigneeId || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, assigneeId: e.target.value }))}
                  className="w-full rounded-xs border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] focus:outline-none bg-white"
                >
                  <option value="">{c.frp ? `${c.frp.name} (Current FRP)` : 'Select FRP...'}</option>
                  {candidates.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.email ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onAssignFrp}
                  className="rounded-xs border border-[#0176d3] px-2.5 py-1.5 text-xs font-semibold text-[#0176d3] hover:bg-blue-50 transition-colors whitespace-nowrap"
                  title="View workload & assign with note"
                >
                  Workload View
                </button>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sendMailToFrp}
                  onChange={(e) => setForm((prev) => ({ ...prev, sendMailToFrp: e.target.checked }))}
                  className="h-4 w-4 rounded-xs border-slate-300 text-[#0176d3] focus:ring-[#0176d3]"
                />
                <span className="text-slate-800 font-semibold text-xs">
                  Send Mail To FRP
                </span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1 ml-6">
                When selected, saving D2 will dispatch the assignment notification email (<strong>First Responsible Person for the complaint {c.complaintNumber}</strong>) to the assigned FRP.
              </p>
            </div>
          </div>
          <div className="px-4 py-2.5 text-slate-400 italic min-h-[38px]">&nbsp;</div>
        </div>
      </SfSection>
    </div>
  );
}

/* ---------------- FRP assignment modal ---------------- */

export function AssignFrpModal({ open, complaint, onClose, onDone }) {
  const candidates = useAsync(() => (open ? complaintApi.frpCandidates() : Promise.resolve({ data: [] })), [open]);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [sendMail, setSendMail] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const reassigning = Boolean(complaint.frp);

  useEffect(() => {
    if (open) {
      setSelected(complaint.frp?._id || '');
      setReason('');
      setSendMail(true);
      setErrors({});
    }
  }, [open, complaint.frp]);

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await complaintApi.assignFrp(complaint._id, {
        assigneeId: selected,
        reason: reason || undefined,
        sendMailToFrp: sendMail,
      });
      const person = (candidates.data || []).find((u) => u._id === selected);
      onDone(res.data, person, sendMail);
    } catch (err) {
      const e = readError(err);
      setErrors(Object.keys(e.fields).length ? e.fields : { _: e.message });
    } finally {
      setBusy(false);
    }
  };

  const options = candidates.data || [];
  const selectedPerson = options.find((u) => u._id === selected);

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={reassigning ? 'Reassign First Responsible Person' : 'Assign First Responsible Person'}
      description={`${complaint.complaintNumber}. The selected person will be assigned as FRP for this complaint.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!selected} onClick={save}>
            {reassigning ? 'Reassign' : 'Assign'}
          </Button>
        </>
      }
    >
      {errors._ && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {errors._}
        </p>
      )}
      {candidates.loading && !candidates.data?.length ? (
        <Loading label="Loading investigators" />
      ) : options.length === 0 ? (
        <p className="text-slate-500 text-xs">
          No other active employee has a role that can investigate complaints. An administrator can assign the First Responsible Person role.
        </p>
      ) : (
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-slate-700">
            Select Employee<span className="ml-0.5 text-red-500">*</span>
          </legend>
          <div className="max-h-56 divide-y divide-slate-200 overflow-y-auto rounded-xs border border-slate-200">
            {options.map((u) => (
              <label
                key={u._id}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-xs ${
                  selected === u._id ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="frp"
                  className="accent-[#0176d3]"
                  checked={selected === u._id}
                  onChange={() => setSelected(u._id)}
                />
                <span className="flex-1">
                  <span className="font-semibold text-slate-900">{u.name}</span>
                  {u._id === complaint.frp?._id && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700">
                      Currently Assigned
                    </span>
                  )}
                  <span className="block text-[11px] text-slate-500">
                    {[u.designation, u.department?.name].filter(Boolean).join(', ') || u.email}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">{u.openComplaints} open</span>
              </label>
            ))}
          </div>
          {errors.assigneeId && <p className="mt-1 text-xs text-red-500">{errors.assigneeId}</p>}
        </fieldset>
      )}

      {/* Send Mail to FRP Checkbox */}
      <div className="mt-3 p-2.5 rounded border border-blue-100 bg-blue-50/60">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sendMail}
            onChange={(e) => setSendMail(e.target.checked)}
            className="h-4 w-4 rounded-xs border-slate-300 text-[#0176d3] focus:ring-[#0176d3]"
          />
          <span className="text-xs font-bold text-slate-800">
            Send Mail To FRP
          </span>
        </label>
        <p className="text-[11px] text-slate-600 mt-1 ml-6">
          SOP Step 8.b: Dispatches email notification (<code className="text-blue-700">First Responsible Person for the complaint {complaint.complaintNumber}</code>) to the assigned FRP.
        </p>
      </div>

      {/* Live Email Preview matching SOP Page 6 Step 8.b */}
      {selectedPerson && sendMail && (
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 overflow-hidden text-xs">
          <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
            <span>Email Preview: SOP Step 8.b Notification</span>
            <span className="text-[#0176d3] font-semibold">{selectedPerson.email}</span>
          </div>
          <div className="p-3 space-y-2 bg-white font-sans">
            <div className="text-slate-700 font-mono text-[11px] border-b border-slate-100 pb-1.5">
              <strong>Subject:</strong> First Responsible Person for the complaint {complaint.complaintNumber}
            </div>
            <p className="text-slate-800">Dear {selectedPerson.name},</p>
            <p className="text-slate-700">
              You have been assigned as the <strong>First Responsible Person (FRP)</strong> for the following complaint. Please review the details and take necessary action.
            </p>
            <div className="font-semibold text-slate-800 pt-0.5">Complaint Details:</div>
            <table className="w-full border-collapse border border-slate-200 text-[11px]">
              <tbody>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 font-bold p-1.5 w-44 text-slate-700">Complaint Number</td>
                  <td className="border border-slate-200 p-1.5 text-slate-900">{complaint.complaintNumber}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 font-bold p-1.5 text-slate-700">Current Stage</td>
                  <td className="border border-slate-200 p-1.5 text-slate-900">D2 - Investigation & Analysis</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 font-bold p-1.5 text-slate-700">Type of Failure</td>
                  <td className="border border-slate-200 p-1.5 text-slate-900">{complaint.d2?.investigation?.typeOfFailure || '—'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 font-bold p-1.5 text-slate-700">Manufacturing Location</td>
                  <td className="border border-slate-200 p-1.5 text-slate-900">{complaint.d2?.investigation?.manufacturingLocation || '—'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 font-bold p-1.5 text-slate-700">Product Name</td>
                  <td className="border border-slate-200 p-1.5 text-slate-900">{complaint.d2?.verifiedProduct?.productName || complaint.reportedProduct?.name || '—'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 font-bold p-1.5 text-slate-700">Batch Number</td>
                  <td className="border border-slate-200 p-1.5 text-slate-900">{complaint.d2?.verifiedProduct?.batchNumber || complaint.reportedProduct?.batchNumber || '—'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 font-bold p-1.5 text-slate-700">Short Description</td>
                  <td className="border border-slate-200 p-1.5 text-slate-900">{complaint.shortDescription || '—'}</td>
                </tr>
              </tbody>
            </table>
            <div className="py-1">
              <span className="inline-block bg-[#0176d3] text-white font-semibold text-xs px-3 py-1.5 rounded-xs">
                View Complaint Record
              </span>
            </div>
            <p className="text-[11px] text-slate-500 italic pt-1">
              Note: The complaint owner has flagged this for your immediate attention. Please prioritize this investigation and complete the D2 stage analysis.
            </p>
            <div className="text-[11px] text-slate-600 pt-1">
              <p>Best Regards,</p>
              <p className="font-bold text-slate-800">Customer Relationship Management Team</p>
            </div>
          </div>
        </div>
      )}

      {reassigning && selected !== complaint.frp?._id && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reason for reassignment <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            maxLength={1000}
            className="w-full rounded-xs border border-slate-300 p-2 text-xs focus:border-[#0176d3] focus:outline-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for reassignment..."
          />
          {errors.reason && <p className="mt-0.5 text-xs text-red-500">{errors.reason}</p>}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Main D2Tab Component ---------------- */

export function D2Tab({ detail, onSaved, refreshKey, editTrigger }) {
  const { complaint: c, can } = detail;
  const { user } = useAuth();
  const notify = useToast();

  const isAssignedFrp = Boolean(
    user &&
    c.frp &&
    (String(user._id) === String(c.frp?._id || c.frp) || (c.frp?.email && user.email?.toLowerCase() === c.frp.email?.toLowerCase()))
  );
  const isAdmin = user?.roles?.some((r) => ['admin', 'qa_manager'].includes(r));
  const canAcknowledgeFrp = isAssignedFrp || isAdmin;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(c));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lists, setLists] = useState(null);
  const [assignFrpOpen, setAssignFrpOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [sendingFrpMail, setSendingFrpMail] = useState(false);
  const [ackChecked, setAckChecked] = useState(true);
  const [ackSubmitting, setAckSubmitting] = useState(false);

  useEffect(() => {
    if (editTrigger > 0) {
      startEdit();
    }
  }, [editTrigger]);

  useEffect(() => {
    complaintApi
      .frpCandidates()
      .then((r) => setCandidates(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if ((editing || assignFrpOpen) && !lists) {
      lookupApi
        .all()
        .then((r) => setLists(r.data.lists))
        .catch(() => setLists({ manufacturingLocation: [], locationDetail: [], typeOfFailure: [] }));
    }
  }, [editing, assignFrpOpen, lists]);

  const startEdit = async () => {
    if (c.status === 'D1_ACKNOWLEDGED') {
      try {
        const res = await complaintApi.startD2(c._id);
        onSaved(res.data);
      } catch (err) {
        // Proceed to edit if already started or permitted
      }
    }
    setForm(toForm(c));
    setErrors({});
    setMessage(null);
    setEditing(true);
  };

  const handleSendMailToFrp = async () => {
    if (!c.frp) return;
    setSendingFrpMail(true);
    try {
      const res = await complaintApi.sendMailToFrp(c._id);
      notify(`Assignment email dispatched to First Responsible Person (${c.frp.name || ''}).`);
      onSaved(res.data);
    } catch (err) {
      notify(readError(err).message, 'bad');
    } finally {
      setSendingFrpMail(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await complaintApi.updateD2(c._id, { version: c.__v, ...toBody(form) });
      notify(form.sendMailToFrp ? 'D2 information saved and assignment email sent to FRP.' : 'D2 information saved.');
      setEditing(false);
      onSaved(res.data);
    } catch (err) {
      const e = readError(err);
      setErrors(e.fields || {});
      setMessage(Object.keys(e.fields || {}).length ? 'Some fields need attention.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header / Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 px-1">
        <div>
          {can.editD2 ? (
            <p className="text-xs text-slate-500">
              {editing
                ? 'Editing D2 fields. Mandatory fields marked with * are required to complete D2.'
                : 'Click any pencil icon or "Edit" to modify D2 information.'}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              {c.status === 'D2_IN_PROGRESS'
                ? 'Your role has view-only access to D2.'
                : 'D2 information is locked after D2 is completed.'}
            </p>
          )}
        </div>

        {can.editD2 && !editing && (
          <Button size="sm" icon={Pencil} onClick={startEdit}>
            Edit
          </Button>
        )}
      </div>

      {/* Main Content: Form or Record View */}
      {editing ? (
        <div>
          {message && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
              {message}
            </div>
          )}
          {lists ? (
            <D2RecordForm
              form={form}
              setForm={setForm}
              errors={errors}
              lists={lists}
              c={c}
              candidates={candidates}
              onAssignFrp={() => setAssignFrpOpen(true)}
            />
          ) : (
            <Loading label="Loading lists..." />
          )}
          <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={busy} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <D2RecordView
          complaint={c}
          canEdit={can.editD2 || c.status === 'D2_IN_PROGRESS' || c.status === 'D1_ACKNOWLEDGED'}
          onEdit={startEdit}
          onAssignFrp={() => setAssignFrpOpen(true)}
          onSendMailToFrp={handleSendMailToFrp}
          sendingFrpMail={sendingFrpMail}
        />
      )}

      {/* FRP Acknowledgement Section (Salesforce Styled) - Only visible to assigned FRP / Admin, or once acknowledged */}
      {(c.d2?.frpAcknowledgement?.acknowledged || canAcknowledgeFrp) && (
        <SfSection title={c.d2?.frpAcknowledgement?.acknowledged ? "Acknowledgement (FRP)" : "Acknowledgement (FRP Only)"} defaultOpen={true}>
          <div className="p-4 text-xs">
            {c.d2?.frpAcknowledgement?.acknowledged ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
                  <span>D2 Acknowledged</span>
                </div>
                <p className="text-slate-600">
                  Comments: {c.d2.frpAcknowledgement.comments || 'Acknowledged'}
                </p>
                {c.status === 'D2_IN_PROGRESS' && (
                  <div className="mt-2.5 rounded-xs border border-blue-200 bg-blue-50/80 p-3 text-slate-700 space-y-1">
                    <p className="font-semibold text-blue-900">Next Step to Advance to D3:</p>
                    <p>
                      FRP acknowledgement has been recorded. To transition this complaint to <strong>D3 (Root Cause Analysis)</strong>:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pt-0.5">
                      <li>Ensure required D2 fields are filled (Verified Batch Number, Manufacturing Location, Type of Failure, Severity Score).</li>
                      <li>Click <strong>Complete D2</strong> in the top action bar or Next Actions panel.</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!ackChecked) {
                    notify('Please check the acknowledgement checkbox to proceed.', 'warn');
                    return;
                  }
                  setAckSubmitting(true);
                  const comments = e.target.ackComments.value;
                  try {
                    const res = await complaintApi.frpAcknowledge(c._id, { comments });
                    if (res.data?.complaint?.status === 'D3_IN_PROGRESS' || res.data?.complaint?.stage === 'D3') {
                      notify('D2 Acknowledged by FRP. Complaint moved to D3.');
                    } else {
                      notify('D2 Acknowledged by FRP. Fill mandatory D2 investigation fields and click Complete D2 to advance to D3.', 'warn');
                    }
                    onSaved(res.data);
                  } catch (err) {
                    notify(readError(err).message, 'bad');
                  } finally {
                    setAckSubmitting(false);
                  }
                }}
                className="space-y-3 max-w-lg"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="frpAckCheck"
                    checked={ackChecked}
                    onChange={(e) => setAckChecked(e.target.checked)}
                    className="h-4 w-4 rounded-xs text-[#0176d3] border-slate-300 focus:ring-[#0176d3] cursor-pointer"
                  />
                  <label htmlFor="frpAckCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    D2 Acknowledgement
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    D2 Acknowledgement Comments
                  </label>
                  <input
                    type="text"
                    name="ackComments"
                    placeholder="Acknowledged"
                    defaultValue="Acknowledged"
                    className="w-full text-xs rounded-xs border border-slate-300 p-2 focus:border-[#0176d3] focus:outline-none"
                  />
                </div>
                <Button type="submit" size="sm" loading={ackSubmitting} disabled={ackSubmitting}>
                  Submit FRP Acknowledgement
                </Button>
              </form>
            )}
          </div>
        </SfSection>
      )}

      {/* FRP Assign Modal */}
      <AssignFrpModal
        open={assignFrpOpen}
        complaint={c}
        onClose={() => setAssignFrpOpen(false)}
        onDone={(next, person, sentMail) => {
          setAssignFrpOpen(false);
          onSaved(next);
          if (sentMail) {
            notify(`Assignment email dispatched to First Responsible Person (${person?.name || ''}).`);
          } else if (next.unchanged) {
            notify(`${person?.name} is already the First Responsible Person.`);
          } else {
            notify(`${person?.name} assigned as FRP.`);
          }
        }}
      />
    </div>
  );
}
