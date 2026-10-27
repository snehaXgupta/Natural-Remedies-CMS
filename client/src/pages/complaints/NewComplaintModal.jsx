import { useEffect, useState, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Upload,
  FileText,
  ChevronDown,
  Check,
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

  // Step 1: Complaint Form, Step 2: D1 Proof Attachment
  const [step, setStep] = useState(1);
  const [createdComplaint, setCreatedComplaint] = useState(null);

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
      name: 'Manual preparation test',
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
      setStep(1);
      setCreatedComplaint(null);
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
          name: 'Manual preparation test',
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

  // Step 1: Save & Next (registers the complaint and opens Step 2 popup)
  const handleSaveAndNext = async () => {
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
      setCreatedComplaint(created);
      notify(`Complaint ${created.complaintNumber} registered successfully.`);
      // Advance to Step 2: D1 Proof Attachment
      setStep(2);
    } catch (err) {
      const e = readError(err);
      setErrors(e.fields || {});
      setMessage(Object.keys(e.fields || {}).length ? 'Some required fields need attention.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Save attachments and complete registration
  const handleSaveAttachments = async () => {
    if (!createdComplaint) return;
    setBusy(true);
    try {
      if (proofFiles.length > 0) {
        const rawFiles = proofFiles.map((x) => x.file);
        await complaintApi.upload(createdComplaint._id, rawFiles, 'D1');
        notify(`Uploaded ${proofFiles.length} proof document(s) successfully.`);
      }
      onCreated(createdComplaint);
    } catch (uploadErr) {
      console.error('Evidence upload error:', uploadErr);
      notify('Complaint registered, but some files could not be uploaded.', 'bad');
      onCreated(createdComplaint);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (step === 2 && createdComplaint) {
      // If already created in Step 1, navigate to the complaint on close
      onCreated(createdComplaint);
    } else {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-md border border-slate-300 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-complaint-title"
      >
        {/* Top Header - Centered title matching Salesforce screenshot */}
        <div className="relative border-b border-slate-200 bg-white px-6 py-3.5 text-center">
          <h2 id="new-complaint-title" className="text-base font-bold text-slate-800">
            New Complaint
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-3.5 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        {step === 1 ? (
          /* STEP 1: Registration Form */
          <div className="overflow-y-auto px-5 sm:px-8 py-5 space-y-5 text-xs text-slate-700">
            {message && (
              <div className="rounded border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
                {message}
              </div>
            )}

            {/* Section 1: Requestor Information */}
            <div>
              <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-semibold text-slate-700 tracking-wide mb-3">
                Requestor Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {/* Complaint date (Inline Date & Time) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Complaint date
                  </label>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 font-medium block">
                        <span className="text-red-600 mr-0.5">*</span>Date
                      </span>
                      <div className="relative">
                        <input
                          type="date"
                          value={dateOnly}
                          onChange={(e) => setDateOnly(e.target.value)}
                          className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                        <Calendar className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 font-medium block">
                        <span className="text-red-600 mr-0.5">*</span>Time
                      </span>
                      <div className="relative">
                        <input
                          type="time"
                          value={timeOnly}
                          onChange={(e) => setTimeOnly(e.target.value)}
                          className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                        <Clock className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blank right spacer to match screenshot alignment */}
                <div className="hidden md:block"></div>

                {/* Requested By (Salesforce Pill with Avatar & Clear Button) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Requested By
                  </label>
                  <div className="flex-1">
                    {form.requester.name ? (
                      <div className="flex h-7.5 items-center justify-between rounded border border-slate-300 bg-white px-2 text-xs shadow-2xs">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div className="flex h-4.5 w-4.5 items-center justify-center rounded-xs bg-[#0176d3] text-white">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="truncate font-semibold uppercase text-slate-800 text-[11px]">
                            {form.requester.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, requester: { ...form.requester, name: '' } })}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Clear"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter requester name..."
                        value={form.requester.name}
                        onChange={(e) => setForm({ ...form, requester: { ...form.requester, name: e.target.value } })}
                        className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    )}
                    {errors['requester.name'] && <p className="text-[10px] text-red-600 mt-0.5">{errors['requester.name']}</p>}
                  </div>
                </div>

                {/* SBU Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>SBU
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.sbu}
                      onChange={(e) => setForm({ ...form, sbu: e.target.value })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
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
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    {errors.sbu && <p className="text-[10px] text-red-600 mt-0.5">{errors.sbu}</p>}
                  </div>
                </div>

                {/* Requestor E-mail */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Requestor E-mail
                  </label>
                  <div className="flex-1">
                    <input
                      type="email"
                      value={form.requester.email}
                      onChange={(e) => setForm({ ...form, requester: { ...form.requester, email: e.target.value } })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['requester.email'] && <p className="text-[10px] text-red-600 mt-0.5">{errors['requester.email']}</p>}
                  </div>
                </div>

                {/* Country Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Country
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
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
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    {errors.country && <p className="text-[10px] text-red-600 mt-0.5">{errors.country}</p>}
                  </div>
                </div>

                {/* Requestor Mobile Number */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Requestor Mobile Number
                  </label>
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={form.requester.mobile}
                      onChange={(e) => setForm({ ...form, requester: { ...form.requester, mobile: e.target.value } })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['requester.mobile'] && <p className="text-[10px] text-red-600 mt-0.5">{errors['requester.mobile']}</p>}
                  </div>
                </div>

                {/* Complaint Head Quarter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Complaint Head Quarter
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.headQuarter}
                      onChange={(e) => setForm({ ...form, headQuarter: e.target.value })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
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
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* origin */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    origin
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="Web">Web</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Phone">Phone</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Coordinator */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Coordinator
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.coordinator}
                      onChange={(e) => setForm({ ...form, coordinator: e.target.value })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="">Select Coordinator...</option>
                      {coordinators.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} — {c.department?.name || c.designation || 'Quality Assurance'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Short Description */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 md:col-span-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0 pt-1">
                    <span className="text-red-600 mr-0.5">*</span>Short Description of the Complaint
                  </label>
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      value={form.shortDescription}
                      onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors.shortDescription && <p className="text-[10px] text-red-600 mt-0.5">{errors.shortDescription}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Customer Information */}
            <div>
              <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-semibold text-slate-700 tracking-wide mb-3">
                Customer Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Distributor / Retailer Name
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.customer.name}
                      onChange={(e) => setForm({ ...form, customer: { ...form.customer, name: e.target.value } })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['customer.name'] && <p className="text-[10px] text-red-600 mt-0.5">{errors['customer.name']}</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Customer Code
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Optional customer code"
                      value={form.customer.code}
                      onChange={(e) => setForm({ ...form, customer: { ...form.customer, code: e.target.value } })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Product Information */}
            <div>
              <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-semibold text-slate-700 tracking-wide mb-3">
                Product Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Product name
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.reportedProduct.name}
                      onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, name: e.target.value } })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['reportedProduct.name'] && <p className="text-[10px] text-red-600 mt-0.5">{errors['reportedProduct.name']}</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Batch Number
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.reportedProduct.batchNumber}
                      onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, batchNumber: e.target.value } })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    {errors['reportedProduct.batchNumber'] && <p className="text-[10px] text-red-600 mt-0.5">{errors['reportedProduct.batchNumber']}</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Category
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Packaging">Packaging</option>
                      <option value="Product quality">Product quality</option>
                      <option value="Efficacy">Efficacy</option>
                      <option value="Labelling">Labelling</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    Reporter Type
                  </label>
                  <div className="flex-1 relative">
                    <select
                      value={form.requester.type}
                      onChange={(e) => setForm({ ...form, requester: { ...form.requester, type: e.target.value } })}
                      className="h-7.5 w-full rounded border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="Customer">Customer</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Distributor">Distributor</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: D1 Proof Attachment (Matching Screenshot 2 exactly) */
          <div className="px-6 sm:px-10 py-10 flex flex-col items-center justify-center">
            {/* White bordered box from the screenshot */}
            <div className="w-full max-w-2xl rounded border border-slate-300 bg-white p-8 sm:p-12 text-center shadow-2xs">
              <h3 className="text-sm font-semibold text-slate-800 mb-6">
                D1 Proof Attachment
              </h3>

              {/* Upload trigger with dashed border */}
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
                className={`inline-flex items-center gap-3 border border-dashed rounded px-4 py-2 transition-colors cursor-pointer ${
                  dragging ? 'border-blue-500 bg-blue-50/60' : 'border-slate-400 bg-white hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
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
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3.5 py-1 text-xs font-semibold text-[#0176d3] shadow-2xs hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Files
                </button>
                <span className="text-xs text-slate-500 font-medium">Or drop files</span>
              </div>

              {/* Attached files list */}
              {proofFiles.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4 text-left">
                  <p className="text-[11px] font-semibold text-slate-600 mb-2">
                    Attached Files ({proofFiles.length}):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {proofFiles.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt={item.file.name} className="h-8 w-8 object-cover rounded shrink-0" />
                          ) : (
                            <FileText className="h-6 w-6 text-slate-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="truncate font-medium text-slate-800 text-[11px]" title={item.file.name}>
                              {item.file.name}
                            </p>
                            <span className="text-[10px] text-slate-400">{(item.file.size / 1024).toFixed(0)} KB</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 transition-colors"
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer - Matching exact Salesforce layout */}
        <div className="border-t border-slate-200 bg-[#f8f9fa] px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            close
          </button>

          {/* Guided Action Step Slider */}
          <div className="flex items-center gap-1.5 w-44 sm:w-80">
            {step === 1 ? (
              <>
                {/* Step 1 Active */}
                <div className="h-3.5 w-3.5 rounded-full bg-[#0176d3] ring-4 ring-blue-100 shrink-0"></div>
                <div className="h-1 flex-1 bg-slate-300 rounded-full"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0"></div>
              </>
            ) : (
              <>
                {/* Step 1 Completed with Checkmark, Solid Blue Line, Step 2 Active */}
                <div className="h-4 w-4 rounded-full bg-[#0176d3] text-white flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <div className="h-1 flex-1 bg-[#0176d3] rounded-full"></div>
                <div className="h-4 w-4 rounded-full border-2 border-[#0176d3] bg-white flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-[#0176d3]"></div>
                </div>
              </>
            )}
          </div>

          {step === 1 ? (
            <button
              type="button"
              onClick={handleSaveAndNext}
              disabled={busy}
              className="rounded bg-[#0176d3] px-6 py-1.5 text-xs font-semibold text-white hover:bg-[#015ba5] shadow-xs transition-colors disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save & Next'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAttachments}
              disabled={busy}
              className="rounded bg-[#0176d3] px-6 py-1.5 text-xs font-semibold text-white hover:bg-[#015ba5] shadow-xs transition-colors disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
