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
import { SBUS, COUNTRIES, getHqOptionsForCountry } from '../../lib/constants.js';

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

  const [form, setForm] = useState({
    requester: {
      name: '',
      email: '',
      mobile: '',
      type: 'Customer',
    },
    sbu: '',
    country: '',
    headQuarter: '',
    origin: 'Call',
    shortDescription: '',
    customer: {
      name: '',
    },
    reportedProduct: {
      name: '',
      batchNumber: '',
    },
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [proofFiles, setProofFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [createdComplaint, setCreatedComplaint] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [postUploadFiles, setPostUploadFiles] = useState([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Employee directory searchable dropdown state
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const empDropdownRef = useRef(null);

  // Fetch all employees for "Requested By" dropdown
  useEffect(() => {
    let active = true;
    setLoadingEmployees(true);
    userApi
      .directory()
      .then((data) => {
        if (active) setEmployees(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load employee directory:', err);
      })
      .finally(() => {
        if (active) setLoadingEmployees(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Click outside listener to close employee dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (empDropdownRef.current && !empDropdownRef.current.contains(e.target)) {
        setEmpDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectEmployee = (emp) => {
    setForm((prev) => ({
      ...prev,
      requester: {
        ...prev.requester,
        name: emp.name || '',
        email: emp.email || '',
        mobile: emp.phone || prev.requester.mobile || '',
      },
    }));
    setEmpDropdownOpen(false);
    if (errors['requester.name']) {
      setErrors((prev) => ({ ...prev, 'requester.name': undefined }));
    }
    if (errors['requester.email']) {
      setErrors((prev) => ({ ...prev, 'requester.email': undefined }));
    }
  };

  const query = (form.requester.name || '').trim().toLowerCase();
  const filteredEmployees = employees.filter((emp) => {
    if (!query) return true;
    const nameMatch = emp.name?.toLowerCase().includes(query);
    const emailMatch = emp.email?.toLowerCase().includes(query);
    const designationMatch = emp.designation?.toLowerCase().includes(query);
    const dept = typeof emp.department === 'string' ? emp.department : emp.department?.name;
    const deptMatch = dept?.toLowerCase().includes(query);
    return nameMatch || emailMatch || designationMatch || deptMatch;
  });

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

    const clientErrors = {};
    if (!form.requester.name?.trim()) {
      clientErrors['requester.name'] = 'Enter the requester’s name.';
    }
    if (!form.requester.email?.trim()) {
      clientErrors['requester.email'] = 'Enter a valid email address.';
    }
    if (!form.requester.mobile?.trim()) {
      clientErrors['requester.mobile'] = 'Enter a valid mobile number.';
    }
    if (!form.sbu) {
      clientErrors.sbu = 'Enter the SBU.';
    }
    if (!form.country) {
      clientErrors.country = 'Enter the country.';
    }
    if (!form.headQuarter || form.headQuarter === '--None--') {
      clientErrors.headQuarter = 'Select the Complaint Head Quarter.';
    }
    if (!form.shortDescription?.trim()) {
      clientErrors.shortDescription = 'Describe the complaint in at least 5 characters.';
    }
    if (!form.customer.name?.trim()) {
      clientErrors['customer.name'] = 'Enter the Distributor / Retailer Name.';
    }
    if (!form.reportedProduct.name?.trim()) {
      clientErrors['reportedProduct.name'] = 'Enter the Product Name.';
    }
    if (!form.reportedProduct.batchNumber?.trim()) {
      clientErrors['reportedProduct.batchNumber'] = 'Enter the Batch Number.';
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setMessage('Please check the required fields highlighted below.');
      setBusy(false);
      return;
    }

    let complaintDate;
    try {
      complaintDate = new Date(`${dateOnly}T${timeOnly || '12:00'}:00`).toISOString();
    } catch {
      complaintDate = new Date().toISOString();
    }

    const payload = {
      complaintDate,
      origin: form.origin || 'Call',
      sbu: form.sbu,
      country: form.country,
      headQuarter: form.headQuarter?.trim(),
      coordinator: undefined,
      shortDescription: form.shortDescription?.trim(),
      requester: {
        name: form.requester.name?.trim(),
        email: form.requester.email?.trim(),
        mobile: form.requester.mobile?.trim(),
        type: form.requester.type || 'Customer',
      },
      customer: {
        name: form.customer.name?.trim(),
      },
      reportedProduct: {
        name: form.reportedProduct.name?.trim(),
        batchNumber: form.reportedProduct.batchNumber?.trim(),
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
        navigate(`/complaints/${created._id}`);
      } else {
        // Point 3 of SOP: Prompt with document upload pop-up
        notify(`Complaint ${created.complaintNumber} registered successfully.`);
        setCreatedComplaint(created);
        setShowDocModal(true);
      }
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

            {/* Requested By - Searchable Employee Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                <span className="text-red-600 mr-0.5">*</span>Requested By
              </label>
              <div className="flex-1 relative" ref={empDropdownRef}>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-2 flex h-4.5 w-4.5 items-center justify-center rounded-xs bg-[#0176d3] text-white">
                    <User className="h-3 w-3" />
                  </div>
                  <input
                    type="text"
                    placeholder="Type to search employee..."
                    value={form.requester.name}
                    onFocus={() => setEmpDropdownOpen(true)}
                    onChange={(e) => {
                      setForm({ ...form, requester: { ...form.requester, name: e.target.value } });
                      setEmpDropdownOpen(true);
                    }}
                    className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-14 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-1 flex items-center">
                    {form.requester.name && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            requester: { ...form.requester, name: '', email: '', mobile: '' },
                          });
                          setEmpDropdownOpen(true);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-slate-600"
                        title="Clear"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEmpDropdownOpen((prev) => !prev)}
                      className="rounded p-1 text-slate-400 hover:text-slate-600"
                      title="Toggle employee list"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {errors['requester.name'] && <p className="text-[10px] text-red-600 mt-1">{errors['requester.name']}</p>}

                {/* Searchable Dropdown List */}
                {empDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl z-50 divide-y divide-slate-100">
                    {loadingEmployees ? (
                      <div className="flex items-center justify-center p-3 text-xs text-slate-500 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#0176d3]" />
                        <span>Loading employees...</span>
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No employees found matching &quot;{form.requester.name}&quot;
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div
                          key={emp._id || emp.email}
                          onClick={() => handleSelectEmployee(emp)}
                          className="p-2 hover:bg-blue-50 cursor-pointer flex flex-col text-left transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 text-xs">{emp.name}</span>
                            {emp.department?.name && (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {emp.department.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{emp.email}</span>
                            {emp.designation && <span>• {emp.designation}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
                  <option value="">--None--</option>
                  {SBUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
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
                  placeholder="Email"
                  value={form.requester.email}
                  onChange={(e) => setForm({ ...form, requester: { ...form.requester, email: e.target.value } })}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
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
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      country: nextCountry,
                      headQuarter: '',
                    }));
                    if (errors.country) setErrors((prev) => ({ ...prev, country: undefined }));
                  }}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="">--None--</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
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
                <span className="text-red-600 mr-0.5">*</span>Complaint Head Quarter
              </label>
              <div className="flex-1 relative">
                <select
                  value={form.headQuarter}
                  onChange={(e) => {
                    setForm({ ...form, headQuarter: e.target.value });
                    if (errors.headQuarter) setErrors((prev) => ({ ...prev, headQuarter: undefined }));
                  }}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="">--None--</option>
                  {(form.country ? getHqOptionsForCountry(form.country) : []).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                {errors.headQuarter && <p className="text-[10px] text-red-600 mt-1">{errors.headQuarter}</p>}
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
                  className="w-full rounded border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter a brief summary of the issue..."
                />
                {errors.shortDescription && <p className="text-[10px] text-red-600 mt-1">{errors.shortDescription}</p>}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 md:col-span-2">
                  <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                    <span className="text-red-600 mr-0.5">*</span>Distributor / Retailer
                  </label>
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <select
                      value={form.customer?.type || 'Distributor'}
                      onChange={(e) => setForm({ ...form, customer: { ...form.customer, type: e.target.value } })}
                      className="h-8 w-36 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none shrink-0"
                    >
                      <option value="Distributor">Distributor</option>
                      <option value="Retailer">Retailer</option>
                    </select>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder={`Enter ${(form.customer?.type || 'Distributor').toLowerCase()} name...`}
                        value={form.customer?.name || ''}
                        onChange={(e) => setForm({ ...form, customer: { ...form.customer, name: e.target.value } })}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      {errors['customer.name'] && <p className="text-[10px] text-red-600 mt-1">{errors['customer.name']}</p>}
                    </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <label className="sm:w-36 sm:text-right text-[11px] font-semibold text-slate-700 shrink-0">
                <span className="text-red-600 mr-0.5">*</span>Product Name
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Enter product name..."
                  value={form.reportedProduct.name}
                  onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, name: e.target.value } })}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
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
                  placeholder="Enter Batch Number..."
                  value={form.reportedProduct.batchNumber}
                  onChange={(e) => setForm({ ...form, reportedProduct: { ...form.reportedProduct, batchNumber: e.target.value } })}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
                {errors['reportedProduct.batchNumber'] && <p className="text-[10px] text-red-600 mt-1">{errors['reportedProduct.batchNumber']}</p>}
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

      {/* Point 3 SOP Pop-up Window: Prompt to upload required supporting documents */}
      {showDocModal && createdComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-blue-900 to-[#0176d3] p-4 text-white">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Check className="h-4 w-4 bg-emerald-500 rounded-full p-0.5" />
                Complaint Registered Successfully!
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                Record <span className="font-bold underline">{createdComplaint.complaintNumber}</span> has been created.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                <strong>SOP Step 3 Prompt:</strong> Please upload any required supporting documents (photos of defects, packing slips, distributor invoices, certificates of analysis) before proceeding.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Supporting Documents:
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setPostUploadFiles(Array.from(e.target.files || []))}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {postUploadFiles.length > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                    {postUploadFiles.length} file(s) selected for upload.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 bg-slate-50 px-5 py-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate(`/complaints/${createdComplaint._id}`)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
              >
                Skip for Now
              </button>
              <button
                type="button"
                disabled={uploadingDocs}
                onClick={async () => {
                  if (postUploadFiles.length > 0) {
                    try {
                      setUploadingDocs(true);
                      await complaintApi.upload(createdComplaint._id, postUploadFiles, 'D1');
                      notify(`Uploaded ${postUploadFiles.length} supporting document(s) successfully.`);
                    } catch (err) {
                      notify('Error uploading documents: ' + err.message, 'error');
                    }
                  }
                  navigate(`/complaints/${createdComplaint._id}`);
                }}
                className="px-4 py-1.5 bg-[#0176d3] hover:bg-[#015ba5] text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {uploadingDocs ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload & View Complaint</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
