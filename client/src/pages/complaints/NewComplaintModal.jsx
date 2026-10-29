import { useEffect, useState, useRef } from 'react';
import {
  Compass,
  X,
  Calendar,
  Clock,
  User,
  Upload,
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { complaintApi, userApi } from '../../api/endpoints.js';
import { readError } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

/** Formats a date object to YYYY-MM-DD */
function toDateStr(d = new Date()) {
  return new Date(d).toLocaleDateString('en-CA');
}

/** Formats a date object to HH:mm (24h) for <input type="time"> */
function toTimeStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewComplaintModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const notify = useToast();
  const fileInputRef = useRef(null);

  const [dateOnly, setDateOnly] = useState(toDateStr());
  const [timeOnly, setTimeOnly] = useState(toTimeStr());
  const [coordinators, setCoordinators] = useState([]);

  const [form, setForm] = useState({
    requester: {
      name: '',
      email: '',
      mobile: '',
      type: 'Customer',
    },
    sbu: 'HHP',
    country: 'Afghanistan',
    headQuarter: '--None--',
    origin: 'Call',
    coordinator: '',
    shortDescription: 'Manual preparation test',
    customer: {
      name: 'Distributor',
      code: '',
    },
    reportedProduct: {
      name: 'Manual preparation test',
      batchNumber: 'BATCH-01',
    },
    category: 'Packaging',
    additionalRemarks: '',
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [createdComplaint, setCreatedComplaint] = useState(null);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [proofFiles, setProofFiles] = useState([]);
  const [dragging, setDragging] = useState(false);

  // Fetch coordinators list
  useEffect(() => {
    userApi
      .directory()
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setCoordinators(list);
      })
      .catch(() => {});
  }, []);

  // Initialize/reset form state on open
  useEffect(() => {
    if (open) {
      const now = new Date();
      setDateOnly(toDateStr(now));
      setTimeOnly(toTimeStr(now));
      setForm({
        requester: {
          name: user?.name || 'ANANDHANARAYANAN S',
          email: user?.email || 'anandha.n@naturalremedy.com.invalid',
          mobile: user?.phone || '09876543321',
          type: 'Customer',
        },
        sbu: 'HHP',
        country: 'Afghanistan',
        headQuarter: '--None--',
        origin: 'Call',
        coordinator: '',
        shortDescription: 'Manual preparation test',
        customer: {
          name: 'Distributor',
          code: '',
        },
        reportedProduct: {
          name: 'Manual preparation test',
          batchNumber: 'BATCH-01',
        },
        category: 'Packaging',
        additionalRemarks: '',
      });
      setErrors({});
      setMessage(null);
      setProofFiles([]);
      setCreatedComplaint(null);
      setAttachmentFiles([]);
    } else {
      proofFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const handleFilesAdded = (filesList) => {
    const arr = Array.from(filesList);
    const newItems = arr.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setProofFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (index) => {
    setProofFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    let complaintDate;
    try {
      complaintDate = new Date(`${dateOnly}T${timeOnly || '12:00'}:00`).toISOString();
    } catch {
      complaintDate = new Date().toISOString();
    }

    const payload = {
      complaintDate,
      origin: form.origin || 'Call',
      sbu: form.sbu || 'HHP',
      country: form.country || 'Afghanistan',
      headQuarter: form.headQuarter === '--None--' ? undefined : form.headQuarter,
      coordinator: form.coordinator || null,
      shortDescription: form.shortDescription,
      additionalRemarks: form.additionalRemarks || undefined,
      category: form.category || 'Packaging',
      requester: {
        name: form.requester.name,
        email: form.requester.email,
        mobile: form.requester.mobile,
        type: form.requester.type || 'Customer',
      },
      customer: {
        name: form.customer.name,
        code: form.customer.code || undefined,
      },
      reportedProduct: {
        name: form.reportedProduct.name,
        batchNumber: form.reportedProduct.batchNumber || 'BATCH-01',
      },
    };

    try {
      const res = await complaintApi.create(payload);
      const created = res.data;

      // Upload initial proof files to D1 if any were picked
      if (proofFiles.length > 0) {
        try {
          const rawFiles = proofFiles.map((x) => x.file);
          await complaintApi.upload(created._id, rawFiles, 'D1');
        } catch (uploadErr) {
          console.error('Evidence upload error:', uploadErr);
        }
      }

      notify(`Complaint ${created.complaintNumber} registered successfully.`);
      setCreatedComplaint(created);
    } catch (err) {
      const e = readError(err);
      setErrors(e.fields || {});
      setMessage(Object.keys(e.fields || {}).length ? 'Please check the required fields highlighted below.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  // Post-Registration Upload Attachment Popup (PDF Page 3)
  if (open && createdComplaint) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
        <div className="flex flex-col w-full max-w-xl rounded-md border border-slate-300 bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
            <h2 className="text-base font-bold text-slate-800">New Complaint</h2>
            <button
              type="button"
              onClick={() => onCreated(createdComplaint)}
              className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Upload Attachment</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Paperclip className="h-3.5 w-3.5" />
              <span>Files ({attachmentFiles.length})</span>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragging(false);
                const files = Array.from(e.dataTransfer.files || []);
                if (!files.length) return;
                try {
                  setUploadingAttachment(true);
                  await complaintApi.upload(createdComplaint._id, files, 'D1');
                  setAttachmentFiles((prev) => [...prev, ...files.map((f) => f.name)]);
                  notify(`${files.length} attachment(s) uploaded successfully.`);
                } catch (err) {
                  notify(readError(err).message, 'bad');
                } finally {
                  setUploadingAttachment(false);
                }
              }}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                dragging ? 'border-[#0176d3] bg-blue-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  try {
                    setUploadingAttachment(true);
                    await complaintApi.upload(createdComplaint._id, files, 'D1');
                    setAttachmentFiles((prev) => [...prev, ...files.map((f) => f.name)]);
                    notify(`${files.length} attachment(s) uploaded successfully.`);
                  } catch (err) {
                    notify(readError(err).message, 'bad');
                  } finally {
                    setUploadingAttachment(false);
                  }
                }}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#0176d3] mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment}
                className="text-sm font-semibold text-[#0176d3] hover:underline cursor-pointer"
              >
                Upload Files
              </button>
              <p className="text-xs text-slate-500 mt-1">Or drop files here</p>
              {uploadingAttachment && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0176d3]" />
                  <span>Uploading files...</span>
                </div>
              )}
            </div>

            {attachmentFiles.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded border border-slate-200 text-xs">
                {attachmentFiles.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white">
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-5 py-3 border-t border-slate-200 bg-[#f8fafc]">
            <button
              type="button"
              onClick={() => onCreated(createdComplaint)}
              className="rounded bg-[#0176d3] px-6 py-1.5 text-xs font-semibold text-white hover:bg-[#015ba5] transition-colors cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-[#f4f6f9] overflow-hidden animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-complaint-title"
    >
      {/* Whole-Screen Header Bar (Salesforce Lightning Header) */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Compass Icon & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#0176d3] text-white shadow-2xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Complaints</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-slate-800">New Complaint</span>
              </div>
              <h1 id="new-complaint-title" className="text-lg font-bold text-slate-900 leading-tight">
                New Complaint
              </h1>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="rounded bg-[#0176d3] px-5 py-1.5 text-xs font-semibold text-white hover:bg-[#015ba5] shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Complaint</span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Whole-Screen Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 w-full">
        <div className="w-full max-w-6xl mx-auto space-y-5">
          {/* Error Alert */}
          {message && (
            <div className="rounded border border-red-200 bg-red-50 p-4 flex items-start gap-2.5 text-xs text-red-800 shadow-2xs">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Missing or Invalid Information</span>
                <p>{message}</p>
              </div>
            </div>
          )}

          {/* Master Form Card spanning wide layout */}
          <div className="border border-slate-200 bg-white rounded-md shadow-2xs divide-y divide-slate-200">
            {/* SECTION 1: Requestor Information */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-bold text-slate-700 uppercase tracking-wide border-l-4 border-[#0176d3] flex items-center justify-between">
                <span>Requestor Information</span>
                <span className="text-[10px] font-normal text-slate-500 uppercase tracking-normal">
                  * Required fields
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-xs text-slate-700">
                {/* Complaint date & time */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Complaint date
                  </label>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="date"
                        value={dateOnly}
                        onChange={(e) => setDateOnly(e.target.value)}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      <Calendar className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="w-32 relative">
                      <input
                        type="time"
                        value={timeOnly}
                        onChange={(e) => setTimeOnly(e.target.value)}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      <Clock className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Requested By */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Requested By
                  </label>
                  <div className="flex-1">
                    <div className="relative flex items-center">
                      <div className="pointer-events-none absolute left-2 flex h-4.5 w-4.5 items-center justify-center rounded-xs bg-[#0176d3] text-white">
                        <User className="h-3 w-3" />
                      </div>
                      <input
                        type="text"
                        placeholder="Enter requester name..."
                        value={form.requester.name}
                        onChange={(e) => setForm({ ...form, requester: { ...form.requester, name: e.target.value } })}
                        className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      {form.requester.name && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, requester: { ...form.requester, name: '' } })}
                          className="absolute right-2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                          title="Clear"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {errors['requester.name'] && <p className="text-[10px] text-red-600 mt-1">{errors['requester.name']}</p>}
                  </div>
                </div>

                {/* SBU */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>SBU
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.sbu}
                      onChange={(e) => setForm({ ...form, sbu: e.target.value })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="HHP">HHP</option>
                      <option value="AHB-Rumicare">AHB-Rumicare</option>
                      <option value="AHB-Omnicare">AHB-Omnicare</option>
                      <option value="QA - AHB Omnicare">QA - AHB Omnicare</option>
                      <option value="QA - AHB Remicare">QA - AHB Remicare</option>
                      <option value="QA - Packaging & Phytocare">QA - Packaging & Phytocare</option>
                      <option value="AHP-Poultry">AHP-Poultry</option>
                      <option value="AHP-Aqua">AHP-Aqua</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    {errors.sbu && <p className="text-[10px] text-red-600 mt-1">{errors.sbu}</p>}
                  </div>
                </div>

                {/* Requestor E-mail */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Requestor E-mail
                  </label>
                  <div className="flex-1">
                    <input
                      type="email"
                      value={form.requester.email}
                      onChange={(e) => setForm({ ...form, requester: { ...form.requester, email: e.target.value } })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['requester.email'] && <p className="text-[10px] text-red-600 mt-1">{errors['requester.email']}</p>}
                  </div>
                </div>

                {/* Country */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Country
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Afghanistan">Afghanistan</option>
                      <option value="India">India</option>
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Nepal">Nepal</option>
                      <option value="Sri Lanka">Sri Lanka</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Vietnam">Vietnam</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    {errors.country && <p className="text-[10px] text-red-600 mt-1">{errors.country}</p>}
                  </div>
                </div>

                {/* Requestor Mobile Number */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Requestor Mobile
                  </label>
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={form.requester.mobile}
                      onChange={(e) => setForm({ ...form, requester: { ...form.requester, mobile: e.target.value } })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['requester.mobile'] && <p className="text-[10px] text-red-600 mt-1">{errors['requester.mobile']}</p>}
                  </div>
                </div>

                {/* Complaint Head Quarter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Complaint Head Quarter
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.headQuarter}
                      onChange={(e) => setForm({ ...form, headQuarter: e.target.value })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="--None--">--None--</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Kolkata">Kolkata</option>
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="Pune">Pune</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Origin */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Origin
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="Web">Web</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Phone">Phone</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Coordinator */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Coordinator
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.coordinator}
                      onChange={(e) => setForm({ ...form, coordinator: e.target.value })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="">Select Coordinator...</option>
                      {coordinators.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} — {c.department?.name || c.designation || 'Quality Assurance'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Category */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Category
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Packaging">Packaging</option>
                      <option value="Product quality">Product quality</option>
                      <option value="Efficacy">Efficacy</option>
                      <option value="Labelling">Labelling</option>
                      <option value="Contamination">Contamination</option>
                      <option value="Physical Quality">Physical Quality</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Short Description (Full Width) */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2.5 md:col-span-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0 pt-1.5">
                    <span className="text-red-600 mr-0.5">*</span>Short Description
                  </label>
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      value={form.shortDescription}
                      onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="Brief description of the complaint..."
                    />
                    {errors.shortDescription && <p className="text-[10px] text-red-600 mt-1">{errors.shortDescription}</p>}
                  </div>
                </div>

                {/* Additional Remarks (Full Width) */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2.5 md:col-span-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0 pt-1.5">
                    Additional Remarks
                  </label>
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      value={form.additionalRemarks}
                      onChange={(e) => setForm({ ...form, additionalRemarks: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="Any additional background, customer remarks, or initial observations..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Customer Information */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-bold text-slate-700 uppercase tracking-wide border-l-4 border-[#0176d3]">
                Customer Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-xs text-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Distributor / Retailer
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.customer.name}
                      onChange={(e) => setForm({ ...form, customer: { ...form.customer, name: e.target.value } })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Distributor">Distributor</option>
                      <option value="Retailer">Retailer</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    {errors['customer.name'] && <p className="text-[10px] text-red-600 mt-1">{errors['customer.name']}</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Customer Code
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Optional customer/dealer code"
                      value={form.customer.code}
                      onChange={(e) => setForm({ ...form, customer: { ...form.customer, code: e.target.value } })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Product Information */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-bold text-slate-700 uppercase tracking-wide border-l-4 border-[#0176d3]">
                Product Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-xs text-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Product Name
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.reportedProduct.name}
                      onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, name: e.target.value } })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['reportedProduct.name'] && <p className="text-[10px] text-red-600 mt-1">{errors['reportedProduct.name']}</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Batch Number
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.reportedProduct.batchNumber}
                      onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, batchNumber: e.target.value } })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['reportedProduct.batchNumber'] && <p className="text-[10px] text-red-600 mt-1">{errors['reportedProduct.batchNumber']}</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Reporter Type
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.requester.type}
                      onChange={(e) => setForm({ ...form, requester: { ...form.requester, type: e.target.value } })}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Customer">Customer</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Distributor">Distributor</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Evidence & D1 Proof Documents (Visible directly on whole screen) */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-bold text-slate-700 uppercase tracking-wide border-l-4 border-[#0176d3] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-[#0176d3]" />
                  <span>D1 Proof Attachment & Evidence</span>
                </span>
                <span className="text-[10px] font-normal text-slate-500">
                  Optional supporting documents
                </span>
              </div>

              <div className="rounded border border-slate-200 bg-slate-50/50 p-6 text-center">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (e.dataTransfer.files?.length) handleFilesAdded(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 max-w-xl mx-auto transition-colors cursor-pointer ${
                    dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) handleFilesAdded(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-3.5 py-1 text-xs font-semibold text-[#0176d3] shadow-2xs hover:bg-slate-50"
                      >
                        Upload Files
                      </button>
                      <span className="text-xs text-slate-500 font-medium">or drop files here</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supported: Images (PNG, JPG, WEBP), Documents (PDF, DOCX, XLSX)
                    </p>
                  </div>
                </div>

                {/* Attached Files List */}
                {proofFiles.length > 0 && (
                  <div className="mt-5 max-w-2xl mx-auto text-left">
                    <p className="text-[11px] font-semibold text-slate-700 mb-2.5">
                      Attached Files ({proofFiles.length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {proofFiles.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="flex items-center justify-between gap-2.5 rounded border border-slate-200 bg-white p-2.5 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="h-9 w-9 object-cover rounded border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                            )}
                            <div className="truncate">
                              <p className="truncate font-medium text-slate-800 text-xs" title={item.file.name}>
                                {item.file.name}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {(item.file.size / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Whole-Screen Docked Footer */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            Cancel
          </button>

          {/* Salesforce Progress Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <div className="h-2.5 w-2.5 rounded-full bg-[#0176d3]"></div>
            <span>Define Problem (D1) Registration</span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="rounded bg-[#0176d3] px-6 py-1.5 text-xs font-semibold text-white hover:bg-[#015ba5] shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Complaint...</span>
              </>
            ) : (
              <span>Save Complaint</span>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
