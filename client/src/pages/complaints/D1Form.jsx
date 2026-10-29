import { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Field } from '../../components/Field.jsx';
import { ORIGINS } from '../../lib/complaints.js';
import { SBUS, COUNTRIES, getHqOptionsForCountry } from '../../lib/constants.js';

/** yyyy-mm-dd in the user's own time zone (toISOString would use UTC). */
export function localDay(d = new Date()) {
  return new Date(d).toLocaleDateString('en-CA');
}

/** Form state <-> API body. Dates are yyyy-mm-dd in the form. */
export function toForm(c = {}) {
  return {
    origin: c.origin || 'Call',
    complaintDate: localDay(c.complaintDate || new Date()),
    requester: {
      name: c.requester?.name || '',
      email: c.requester?.email || '',
      mobile: c.requester?.mobile || '',
      type: c.requester?.type || 'Customer',
    },
    sbu: c.sbu || '',
    country: c.country || '',
    headQuarter: c.headQuarter || '',
    customer: {
      name: c.customer?.name || '',
    },
    reportedProduct: {
      name: c.reportedProduct?.name || '',
      batchNumber: c.reportedProduct?.batchNumber || '',
    },
    shortDescription: c.shortDescription || '',
  };
}

/**
 * The date input holds only a day. When editing, the stored date-time is
 * sent back unchanged unless the user picked a different day; otherwise every
 * save would quietly reset the time of receipt to midnight.
 */
export function toBody(form, { includeOrigin, original }) {
  const { origin, requester, complaintDate, coordinator, category, additionalRemarks, ...rest } = form;
  const body = {
    ...rest,
    requester: { ...requester },
  };
  if (includeOrigin) body.origin = origin;
  if (!original || complaintDate !== localDay(original.complaintDate)) {
    // A newly chosen day is stored as local midnight of that day.
    body.complaintDate = new Date(`${complaintDate}T00:00:00`).toISOString();
  }
  // A new complaint dated today keeps the actual time of registration.
  if (!original && complaintDate === localDay()) delete body.complaintDate;
  return body;
}

function Section({ title, children }) {
  return (
    <fieldset className="border-t border-line pt-4 first:border-0 first:pt-0">
      <legend className="mb-3 bg-surface pr-2 font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * D1 fields matching EQMS Page 3: Requester information, Customer information, and Product information.
 * Coordinator is automatically assigned as the universal Complaint Handler.
 */
export function D1Form({
  value,
  onChange,
  errors = {},
  showOrigin = false,
  evidenceFiles = [],
  onAddEvidence,
  onRemoveEvidence,
}) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const field = (path) => {
    const [a, b] = path.split('.');
    return {
      value: b ? (value[a] ? value[a][b] : '') : (value[a] || ''),
      onChange: (e) => onChange(b ? { ...value, [a]: { ...value[a], [b]: e.target.value } } : { ...value, [a]: e.target.value }),
    };
  };
  const err = (path) => errors[path];

  return (
    <div className="space-y-6">
      <Section title="Requester Information">
        <Field label="Complaint date" required error={err('complaintDate')}>
          {(p) => <input {...p} type="date" max={localDay()} className="field-input" {...field('complaintDate')} />}
        </Field>
        <Field label="Requested By" required error={err('requester.name')}>
          {(p) => <input {...p} className="field-input" {...field('requester.name')} />}
        </Field>
        <Field label="Requestor E-mail" required error={err('requester.email')} hint="Needed to send the acknowledgement email.">
          {(p) => <input {...p} type="email" className="field-input" {...field('requester.email')} />}
        </Field>
        <Field label="Requestor Mobile Number" required error={err('requester.mobile')}>
          {(p) => <input {...p} type="tel" className="field-input" {...field('requester.mobile')} />}
        </Field>
        {showOrigin && (
          <Field label="Origin" required error={err('origin')}>
            {(p) => (
              <select {...p} className="field-input" {...field('origin')}>
                {ORIGINS.map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
          </Field>
        )}
        <Field label="SBU" required error={err('sbu')}>
          {(p) => (
            <select {...p} className="field-input" {...field('sbu')}>
              <option value="">Select SBU...</option>
              {SBUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Country" required error={err('country')}>
          {(p) => (
            <select
              {...p}
              className="field-input"
              value={value.country || ''}
              onChange={(e) => {
                const nextCountry = e.target.value;
                const hqs = getHqOptionsForCountry(nextCountry);
                onChange({ ...value, country: nextCountry, headQuarter: hqs[0] || '' });
              }}
            >
              <option value="">Select Country...</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Complaint Head Quarter" error={err('headQuarter')}>
          {(p) => {
            const hqOptions = getHqOptionsForCountry(value.country);
            return (
              <select
                {...p}
                className="field-input"
                value={value.headQuarter || ''}
                onChange={(e) => onChange({ ...value, headQuarter: e.target.value })}
              >
                <option value="">--None--</option>
                {hqOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            );
          }}
        </Field>
        <Field label="Short Description of the Complaint" required error={err('shortDescription')} className="sm:col-span-2">
          {(p) => <textarea {...p} rows={2} maxLength={500} className="field-input" {...field('shortDescription')} />}
        </Field>
      </Section>

      <Section title="Customer Information">
        <Field label="Distributor / Retailer Name" required error={err('customer.name')} className="sm:col-span-2">
          {(p) => <input {...p} placeholder="Enter distributor or retailer name..." className="field-input" {...field('customer.name')} />}
        </Field>
      </Section>

      <Section title="Product Information">
        <Field label="Product Name" required error={err('reportedProduct.name')}>
          {(p) => <input {...p} placeholder="Enter product name..." className="field-input" {...field('reportedProduct.name')} />}
        </Field>
        <Field label="Batch Number" error={err('reportedProduct.batchNumber')} hint="Optional at registration. Verified in D2.">
          {(p) => <input {...p} placeholder="e.g. 26T006 (optional)" className="field-input" {...field('reportedProduct.batchNumber')} />}
        </Field>
      </Section>

      {onAddEvidence && (
        <fieldset className="border-t border-line pt-4">
          <legend className="mb-2 text-sm font-semibold text-slate-800">
            Evidence & Supporting Documents (Photos / Invoices / Defect Images)
          </legend>
          <p className="mb-3 text-xs text-ink-muted">
            Upload photos of the product, packaging defect, batch code label or distributor invoice.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files?.length) onAddEvidence(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
              dragging ? 'border-brand bg-brand-soft/40' : 'border-slate-300 hover:border-brand bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) onAddEvidence(e.target.files);
                e.target.value = '';
              }}
            />
            <Upload className="mb-1.5 h-6 w-6 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700">
              Click to upload or drag and drop evidence photos
            </p>
            <p className="text-[11px] text-slate-400">PNG, JPG, JPEG, WEBP or PDF up to 10MB each</p>
          </div>

          {evidenceFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {evidenceFiles.map((item, index) => (
                <div key={item.id || index} className="relative group rounded-md border border-slate-200 bg-white p-2 shadow-xs">
                  {item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.file.name} className="h-20 w-full object-cover rounded" />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center rounded bg-slate-100">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                  <p className="mt-1.5 truncate text-[11px] font-medium text-slate-700" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <span className="text-[10px] text-slate-400">{(item.file.size / 1024).toFixed(0)} KB</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveEvidence?.(index);
                    }}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700"
                    title="Remove evidence"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
