import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Clock,
  User,
  Upload,
  FileText,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
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

export function NewComplaintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notify = useToast();
  const fileInputRef = useRef(null);

  const [dateOnly, setDateOnly] = useState(toDateStr());
  const [timeOnly, setTimeOnly] = useState(toTimeStr());
  const [coordinators, setCoordinators] = useState([]);

  const [form, setForm] = useState({
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

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [proofFiles, setProofFiles] = useState([]);
  const [dragging, setDragging] = useState(false);

  // Fetch coordinators directory
  useEffect(() => {
    userApi
      .directory()
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setCoordinators(list);
      })
      .catch(() => {});
  }, []);

  // Update initial user info when auth loaded
  useEffect(() => {
    if (user?.name) {
      setForm((prev) => ({
        ...prev,
        requester: {
          ...prev.requester,
          name: prev.requester.name || user.name,
          email: prev.requester.email || user.email || '',
          mobile: prev.requester.mobile || user.phone || '09876543321',
        },
      }));
    }
  }, [user]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      proofFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [proofFiles]);

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

      // If proof files were added, upload them to D1 immediately
      if (proofFiles.length > 0) {
        try {
          const rawFiles = proofFiles.map((x) => x.file);
          await complaintApi.upload(created._id, rawFiles, 'D1');
          notify(`Complaint ${created.complaintNumber} registered with ${proofFiles.length} proof document(s).`);
        } catch (uploadErr) {
          console.error('Evidence upload error:', uploadErr);
          notify(`Complaint ${created.complaintNumber} registered, but file upload had issues.`, 'bad');
        }
      } else {
        notify(`Complaint ${created.complaintNumber} registered successfully.`);
      }

      navigate(`/complaints/${created._id}`);
    } catch (err) {
      const e = readError(err);
      setErrors(e.fields || {});
      setMessage(Object.keys(e.fields || {}).length ? 'Please check the required fields highlighted below.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Top Salesforce Record Header */}
      <div className="rounded-t-md border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Compass Icon & Breadcrumb Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded bg-[#0176d3] text-white shadow-2xs">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <nav className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <Link to="/complaints" className="hover:text-blue-600 transition-colors">
                  Complaints
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-slate-800">New Complaint</span>
              </nav>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                New Complaint
              </h1>
              <p className="text-[11px] text-slate-500">
                Register a new complaint record with complete requestor, customer, product details, and D1 supporting evidence.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/complaints')}
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
          </div>
        </div>
      </div>

      {/* Main Full-Page Form Card */}
      <form onSubmit={handleSubmit} className="border border-slate-200 bg-white shadow-2xs rounded-b-md divide-y divide-slate-200">
        {/* Error Alert Banner */}
        {message && (
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Registration Error</span>
              <p>{message}</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Requestor Information */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-bold text-slate-700 uppercase tracking-wide border-l-4 border-[#0176d3] flex items-center justify-between">
            <span>Requestor Information</span>
            <span className="text-[10px] font-normal text-slate-500 uppercase tracking-normal">
              * Required fields
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs text-slate-700">
            {/* Complaint date & time */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 md:col-span-2">
              <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0 pt-1.5">
                <span className="text-red-600 mr-0.5">*</span>Short Description
              </label>
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter a brief summary of the issue..."
                />
                {errors.shortDescription && <p className="text-[10px] text-red-600 mt-1">{errors.shortDescription}</p>}
              </div>
            </div>

            {/* Additional Remarks (Full Width) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 md:col-span-2">
              <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0 pt-1.5">
                Additional Remarks
              </label>
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={form.additionalRemarks}
                  onChange={(e) => setForm({ ...form, additionalRemarks: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter any additional background, customer context, or findings..."
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs text-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                <span className="text-red-600 mr-0.5">*</span>Distributor / Retailer
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={form.customer.name}
                  onChange={(e) => setForm({ ...form, customer: { ...form.customer, name: e.target.value } })}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="Customer or distributor firm name"
                />
                {errors['customer.name'] && <p className="text-[10px] text-red-600 mt-1">{errors['customer.name']}</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs text-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                <span className="text-red-600 mr-0.5">*</span>Product Name
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={form.reportedProduct.name}
                  onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, name: e.target.value } })}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="Reported product name"
                />
                {errors['reportedProduct.name'] && <p className="text-[10px] text-red-600 mt-1">{errors['reportedProduct.name']}</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                <span className="text-red-600 mr-0.5">*</span>Batch Number
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={form.reportedProduct.batchNumber}
                  onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, batchNumber: e.target.value } })}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. BATCH-01"
                />
                {errors['reportedProduct.batchNumber'] && <p className="text-[10px] text-red-600 mt-1">{errors['reportedProduct.batchNumber']}</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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

        {/* SECTION 4: Evidence & D1 Proof Documents (Directly on the page) */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="bg-[#f3f2f2] px-3.5 py-1.5 rounded-xs text-[11px] font-bold text-slate-700 uppercase tracking-wide border-l-4 border-[#0176d3] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-[#0176d3]" />
              <span>D1 Proof Attachment & Evidence</span>
            </span>
            <span className="text-[10px] font-normal text-slate-500">
              Optional initial attachments
            </span>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/50 p-6 text-center">
            {/* Upload Drag & Drop Trigger */}
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

            {/* Attached Files Gallery */}
            {proofFiles.length > 0 && (
              <div className="mt-6 max-w-2xl mx-auto text-left">
                <p className="text-[11px] font-semibold text-slate-700 mb-2.5">
                  Attached Files ({proofFiles.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {proofFiles.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2.5 shadow-2xs"
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

        {/* BOTTOM DOCKED ACTION BAR */}
        <div className="bg-[#f8f9fa] px-6 py-4 flex items-center justify-between rounded-b-md">
          <button
            type="button"
            onClick={() => navigate('/complaints')}
            className="rounded border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="rounded bg-[#0176d3] px-6 py-2 text-xs font-semibold text-white hover:bg-[#015ba5] shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
      </form>
    </div>
  );
}
