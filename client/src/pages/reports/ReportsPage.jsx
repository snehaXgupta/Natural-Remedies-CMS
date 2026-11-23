import { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Settings,
  Folder,
  FileText,
  Star,
  Plus,
  RefreshCw,
  Download,
  X,
  ArrowUpDown,
  Filter,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { reportApi } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../lib/useAsync.js';

// Initial dataset replicating the exact Salesforce Reports folder from the reference screenshot
const INITIAL_REPORTS = [
  {
    id: 'rep-1',
    name: 'Avg. Days required to Close Complaint',
    description: 'Average calendar days elapsed from complaint registration to D4 closure verification.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '8/1/2024, 3:17 pm',
    subscribed: false,
    category: 'Efficacy',
    type: 'summary',
  },
  {
    id: 'rep-2',
    name: 'Avg.Days Open Efficacy',
    description: 'Cycle time tracking for open complaints involving efficacy failure.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:20 pm',
    subscribed: false,
    category: 'Efficacy',
    type: 'summary',
  },
  {
    id: 'rep-3',
    name: 'Avg.Days Open Non Efficacy',
    description: 'Cycle time tracking for open complaints with non-efficacy / packaging issues.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:08 pm',
    subscribed: false,
    category: 'Non-Efficacy',
    type: 'summary',
  },
  {
    id: 'rep-4',
    name: 'Reduction in Total Complaints',
    description: 'Year-over-year defect reduction metrics and quality improvement trends.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '27/3/2023, 7:46 pm',
    subscribed: false,
    category: 'Quality Trend',
    type: 'trend',
  },
  {
    id: 'rep-5',
    name: 'Open and Closed Complaints',
    description: 'Overall active complaint count vs completed SOP closed complaints.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '16/3/2023, 11:49 am',
    subscribed: false,
    category: 'Overview',
    type: 'summary',
  },
  {
    id: 'rep-6',
    name: 'Complaints Current Year Vs Previous Year',
    description: 'Comparative volume analysis against preceding calendar year.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '14/3/2023, 12:10 pm',
    subscribed: false,
    category: 'Annual',
    type: 'trend',
  },
  {
    id: 'rep-7',
    name: 'Complaints Current Vs Previous rumicare',
    description: 'AHP Rumicare product line complaint intake comparison.',
    folder: 'Complaint Management Reports',
    createdBy: 'Chandan Hj',
    createdOn: '4/2/2025, 10:13 am',
    subscribed: false,
    category: 'SBU Analysis',
    type: 'trend',
  },
  {
    id: 'rep-8',
    name: 'Current Complaints Month wise Rumicare',
    description: 'Monthly chronological breakdown of complaints logged for Rumicare division.',
    folder: 'Complaint Management Reports',
    createdBy: 'Chandan Hj',
    createdOn: '4/2/2025, 10:41 am',
    subscribed: false,
    category: 'SBU Analysis',
    type: 'monthly',
  },
  {
    id: 'rep-9',
    name: 'Complaint Raised By Rumicare',
    description: 'Distribution of complaints initiated by veterinary doctors and stockists.',
    folder: 'Complaint Management Reports',
    createdBy: 'Chandan Hj',
    createdOn: '4/2/2025, 10:49 am',
    subscribed: false,
    category: 'SBU Analysis',
    type: 'summary',
  },
  {
    id: 'rep-10',
    name: 'Type of Failure - Rumicare Complaints',
    description: 'Defect categorization across leaks, broken seals, colour deviation, and potency.',
    folder: 'Complaint Management Reports',
    createdBy: 'Chandan Hj',
    createdOn: '4/2/2025, 10:52 am',
    subscribed: false,
    category: 'Failure Type',
    type: 'categories',
  },
  {
    id: 'rep-11',
    name: 'Complaint Stage wise Overview Rumicare',
    description: 'Pipeline distribution across D1 problem definition to D4 effectiveness.',
    folder: 'Complaint Management Reports',
    createdBy: 'Chandan Hj',
    createdOn: '4/2/2025, 10:54 am',
    subscribed: false,
    category: 'Pipeline',
    type: 'pipeline',
  },
  {
    id: 'rep-12',
    name: 'No. Of Efficacy Related Complaints',
    description: 'Total counts of therapeutic and biological efficacy failure investigations.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '20/9/2023, 4:06 pm',
    subscribed: false,
    category: 'Efficacy',
    type: 'summary',
  },
  {
    id: 'rep-13',
    name: 'CAPA Overdue Action Items by Responsible FRP',
    description: 'Corrective and Preventive Actions pending sign-off past scheduled target dates.',
    folder: 'Complaint Management Reports',
    createdBy: 'Sneha',
    createdOn: '12/10/2024, 2:15 pm',
    subscribed: false,
    category: 'Governance',
    type: 'capa',
  },
  {
    id: 'rep-14',
    name: 'Cost of Poor Quality (COPQ) INR Analysis',
    description: 'Financial impact summation in INR across scrapped batches and replacement units.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '5/5/2024, 11:30 am',
    subscribed: false,
    category: 'Financial',
    type: 'summary',
  },
  {
    id: 'rep-15',
    name: 'Fishbone Root Causes Distribution (6M)',
    description: 'Ishikawa cause classification across Manpower, Machine, Method, and Material.',
    folder: 'Complaint Management Reports',
    createdBy: 'Unnati',
    createdOn: '18/6/2024, 4:45 pm',
    subscribed: false,
    category: 'Root Cause',
    type: 'categories',
  },
  {
    id: 'rep-16',
    name: 'WhatsApp Chatbot Intake vs Portal Intake Ratio',
    description: 'Origin channel comparison between automated WhatsApp bot and manual QA entries.',
    folder: 'Complaint Management Reports',
    createdBy: 'Chandan Hj',
    createdOn: '9/8/2024, 1:20 pm',
    subscribed: false,
    category: 'Channel',
    type: 'summary',
  },
  {
    id: 'rep-17',
    name: 'RPN High Risk Complaints (>100)',
    description: 'Severity × Probability × Detectability risk priority number escalation list.',
    folder: 'Complaint Management Reports',
    createdBy: 'Jensy Josephine',
    createdOn: '11/11/2024, 9:15 am',
    subscribed: false,
    category: 'Risk',
    type: 'summary',
  },
  {
    id: 'rep-18',
    name: 'First Responsible Person (FRP) Assignment SLA',
    description: 'Investigation turnaround time tracked from coordinator acknowledge to FRP acceptance.',
    folder: 'Complaint Management Reports',
    createdBy: 'Chandan Hj',
    createdOn: '15/1/2025, 3:40 pm',
    subscribed: false,
    category: 'SLA',
    type: 'summary',
  },
  {
    id: 'rep-19',
    name: 'SOP Regulatory Audit Verification Summary',
    description: 'Form NR/QAD/SOP/001-F01/04 compliance report for QAD audit readiness.',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '22/2/2025, 5:12 pm',
    subscribed: false,
    category: 'Audit',
    type: 'summary',
  },
  {
    id: 'rep-20',
    name: 'Product Defect Frequency by Batch Number',
    description: 'Aggregated complaint volume grouped by manufacturing lot and packaging line.',
    folder: 'Complaint Management Reports',
    createdBy: 'Sneha',
    createdOn: '1/3/2025, 12:00 pm',
    subscribed: false,
    category: 'Production',
    type: 'categories',
  },
];

export function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSidebar, setActiveSidebar] = useState('all-folders');
  const [activeReport, setActiveReport] = useState(null); // For Report Viewer Modal
  const [newReportModalOpen, setNewReportModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [rowMenuOpenId, setRowMenuOpenId] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Live report summary API
  const { data: summaryData, loading: summaryLoading } = useAsync(
    () => reportApi.summary({}).catch(() => null),
    []
  );

  // Filter reports
  const filteredReports = useMemo(() => {
    let list = [...reports];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.createdBy.toLowerCase().includes(q) ||
          r.folder.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    if (activeSidebar === 'created-by-me') {
      const myName = (user?.name || '').toLowerCase();
      list = list.filter((r) => r.createdBy.toLowerCase().includes(myName) || r.createdBy.includes('Chandan'));
    } else if (activeSidebar === 'favorites') {
      list = list.filter((r) => r.subscribed);
    } else if (activeSidebar === 'recent') {
      list = list.slice(0, 8);
    }

    list.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [reports, searchQuery, activeSidebar, user, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleCreateReport = (e) => {
    e.preventDefault();
    if (!newReportName.trim()) return;
    const newEntry = {
      id: `rep-${Date.now()}`,
      name: newReportName.trim(),
      description: 'Custom quality report generated by ' + (user?.name || 'Administrator'),
      folder: 'Complaint Management Reports',
      createdBy: user?.name || 'Chandan Hj',
      createdOn: new Date().toLocaleString(),
      subscribed: false,
      category: 'Custom',
      type: 'summary',
    };
    setReports([newEntry, ...reports]);
    setNewReportName('');
    setNewReportModalOpen(false);
  };

  const toggleSubscribe = (id, e) => {
    e.stopPropagation();
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, subscribed: !r.subscribed } : r))
    );
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Outer Salesforce Lightning Card */}
      <div className="bg-white border border-slate-300 rounded-md shadow-2xs overflow-hidden">
        {/* Card Header Toolbar (Mirroring Screenshot) */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Breadcrumb Title */}
            <div>
              <span className="block text-xs font-normal text-slate-500">Reports</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveSidebar('all-folders')}
                  className="text-lg sm:text-xl font-bold text-[#0176d3] hover:underline"
                >
                  All Folders
                </button>
                <span className="text-slate-400 font-normal text-base">&gt;</span>
                <span className="text-lg sm:text-xl font-bold text-slate-800">
                  Complaint Management Reports
                </span>
              </div>
              <span className="block text-xs text-slate-500 mt-0.5">
                {filteredReports.length} items
              </span>
            </div>

            {/* Right Action Tools: Search, New Report, New Folder, Settings */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search all folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* New Report Button */}
              <button
                type="button"
                onClick={() => setNewReportModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-[#0176d3] transition shadow-2xs"
              >
                New Report
              </button>

              {/* New Folder Button */}
              <button
                type="button"
                onClick={() => setNewFolderModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-[#0176d3] transition shadow-2xs"
              >
                New Folder
              </button>

              {/* Dropdown Chevron Button */}
              <button
                type="button"
                className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                title="More Actions"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {/* Settings Gear Button */}
              <button
                type="button"
                className="flex items-center gap-0.5 p-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                title="Folder Display Settings"
              >
                <Settings className="h-3.5 w-3.5" />
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Split View: Left Sidebar + Right Table */}
        <div className="flex flex-col md:flex-row min-h-[520px]">
          {/* Left Navigation Sidebar */}
          <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white py-2 text-xs">
            {/* Group 1: REPORTS */}
            <div className="mb-3">
              <span className="block px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                REPORTS
              </span>
              <ul className="space-y-0.5">
                {[
                  { id: 'recent', label: 'Recent' },
                  { id: 'created-by-me', label: 'Created by Me' },
                  { id: 'private-reports', label: 'Private Reports' },
                  { id: 'public-reports', label: 'Public Reports' },
                  { id: 'all-reports', label: 'All Reports' },
                ].map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSidebar(item.id)}
                      className={`w-full text-left px-4 py-1.5 transition ${
                        activeSidebar === item.id
                          ? 'bg-[#eef4ff] text-[#0176d3] font-semibold border-l-3 border-[#0176d3]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Group 2: FOLDERS */}
            <div className="mb-3 border-t border-slate-100 pt-2">
              <span className="block px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                FOLDERS
              </span>
              <ul className="space-y-0.5">
                {[
                  { id: 'all-folders', label: 'All Folders' },
                  { id: 'folders-created-by-me', label: 'Created by Me' },
                  { id: 'folders-shared-with-me', label: 'Shared with Me' },
                ].map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSidebar(item.id)}
                      className={`w-full text-left px-4 py-1.5 transition ${
                        activeSidebar === item.id
                          ? 'bg-[#eef4ff] text-[#0176d3] font-semibold border-l-3 border-[#0176d3]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Group 3: FAVORITES */}
            <div className="border-t border-slate-100 pt-2">
              <span className="block px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                FAVORITES
              </span>
              <ul className="space-y-0.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSidebar('favorites')}
                    className={`w-full text-left px-4 py-1.5 transition ${
                      activeSidebar === 'favorites'
                        ? 'bg-[#eef4ff] text-[#0176d3] font-semibold border-l-3 border-[#0176d3]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All Favorites
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          {/* Right Main Table */}
          <main className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#fafafb] text-slate-600 font-semibold select-none">
                  {/* Name Column */}
                  <th
                    onClick={() => toggleSort('name')}
                    className="py-2.5 px-3 min-w-[260px] cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Name</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Description Column */}
                  <th
                    onClick={() => toggleSort('description')}
                    className="py-2.5 px-3 min-w-[200px] cursor-pointer hover:bg-slate-100 transition hidden sm:table-cell"
                  >
                    <div className="flex items-center gap-1">
                      <span>Description</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Folder Column */}
                  <th
                    onClick={() => toggleSort('folder')}
                    className="py-2.5 px-3 min-w-[190px] cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Folder</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Created By Column */}
                  <th
                    onClick={() => toggleSort('createdBy')}
                    className="py-2.5 px-3 min-w-[150px] cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Created By</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Created On Column */}
                  <th
                    onClick={() => toggleSort('createdOn')}
                    className="py-2.5 px-3 min-w-[140px] cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Created On</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Subscribed Column */}
                  <th
                    className="py-2.5 px-2 w-14 text-center cursor-pointer hover:bg-slate-100 transition"
                    title="Subscribed"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span>Subscribed</span>
                    </div>
                  </th>

                  {/* Row Menu Actions Column */}
                  <th className="py-2.5 px-2 w-10 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No reports match the current filter or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-blue-50/40 transition group cursor-pointer"
                      onClick={() => setActiveReport(report)}
                    >
                      {/* Name Link */}
                      <td className="py-2.5 px-3 font-medium text-[#0176d3] group-hover:underline">
                        {report.name}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs hidden sm:table-cell">
                        {report.description || '—'}
                      </td>

                      {/* Folder Link */}
                      <td className="py-2.5 px-3 text-[#0176d3] hover:underline">
                        {report.folder}
                      </td>

                      {/* Created By */}
                      <td className="py-2.5 px-3 text-[#0176d3] hover:underline">
                        {report.createdBy}
                      </td>

                      {/* Created On */}
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {report.createdOn}
                      </td>

                      {/* Subscribed / Star */}
                      <td
                        className="py-2.5 px-2 text-center"
                        onClick={(e) => toggleSubscribe(report.id, e)}
                      >
                        <button
                          type="button"
                          className="text-slate-300 hover:text-amber-500 transition"
                          title={report.subscribed ? 'Subscribed' : 'Subscribe'}
                        >
                          <Star
                            className={`h-3.5 w-3.5 mx-auto ${
                              report.subscribed ? 'text-amber-500 fill-amber-500' : ''
                            }`}
                          />
                        </button>
                      </td>

                      {/* Row Action Arrow */}
                      <td
                        className="py-2.5 px-2 text-center relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRowMenuOpenId(rowMenuOpenId === report.id ? null : report.id);
                        }}
                      >
                        <button
                          type="button"
                          className="p-1 rounded border border-transparent hover:border-slate-300 hover:bg-white text-slate-400 hover:text-slate-700"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>

                        {/* Row Dropdown Action Menu */}
                        {rowMenuOpenId === report.id && (
                          <div
                            className="absolute right-2 top-8 z-30 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg text-left text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setRowMenuOpenId(null);
                                setActiveReport(report);
                              }}
                              className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-left font-medium"
                            >
                              Run Report
                            </button>
                            <a
                              href={reportApi.csvUrl({})}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setRowMenuOpenId(null)}
                              className="block w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-left"
                            >
                              Export Details
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                toggleSubscribe(report.id, { stopPropagation: () => {} });
                                setRowMenuOpenId(null);
                              }}
                              className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-left"
                            >
                              {report.subscribed ? 'Unsubscribe' : 'Subscribe'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReports(reports.filter((r) => r.id !== report.id));
                                setRowMenuOpenId(null);
                              }}
                              className="w-full px-3 py-1.5 text-red-600 hover:bg-red-50 text-left border-t border-slate-100"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </main>
        </div>
      </div>

      {/* ----------------- INTERACTIVE REPORT RUNNER MODAL ----------------- */}
      {activeReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-3 sm:p-6 animate-in fade-in"
          onClick={() => setActiveReport(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-lg border border-slate-300 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-t-4 border-t-[#0176d3] border-b border-slate-200 bg-[#f8fafc] px-5 py-3.5 flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                  Report Run • {activeReport.folder}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {activeReport.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Created by {activeReport.createdBy} on {activeReport.createdOn} • As of Today, {new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={reportApi.csvUrl({})}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Details</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  title="Print"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReport(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Report Execution Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
              {/* Report Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Total In Scope</span>
                  <span className="text-xl font-bold text-slate-900">20</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Open Investigations</span>
                  <span className="text-xl font-bold text-amber-600">14</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Closed & Audited</span>
                  <span className="text-xl font-bold text-emerald-600">6</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Avg. Turnaround</span>
                  <span className="text-xl font-bold text-blue-600">4.8 Days</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-xs text-slate-700 flex justify-between items-center">
                  <span>Detailed Records ({activeReport.name})</span>
                  <span className="text-slate-400 font-normal">Filtered by Rumicare & Efficacy attributes</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#fafafb] text-slate-600 font-medium">
                      <th className="py-2 px-3">Complaint Number</th>
                      <th className="py-2 px-3">Stage</th>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">Batch No</th>
                      <th className="py-2 px-3">SBU</th>
                      <th className="py-2 px-3">Days Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { num: 'CMP-2026-0001', stage: 'D1 Acknowledged', prod: 'Rumicare Bolus 4s', batch: 'RC2601', sbu: 'AHP - Rumicare', days: '2 days' },
                      { num: 'CMP-2026-0004', stage: 'D2 In Progress', prod: 'Rumicare Liquid 500ml', batch: 'RL2604', sbu: 'AHP - Rumicare', days: '4 days' },
                      { num: 'CMP-2026-0007', stage: 'D3 Root Cause', prod: 'Rumicare Powder 100g', batch: 'RP2607', sbu: 'AHP - Rumicare', days: '7 days' },
                      { num: 'CMP-2026-0012', stage: 'D4 In Progress', prod: 'Rumicare Bolus 4s', batch: 'RC2612', sbu: 'AHP - Rumicare', days: '11 days' },
                      { num: 'CMP-2026-0015', stage: 'Closed', prod: 'Rumicare Gel 250ml', batch: 'RG2615', sbu: 'AHP - Rumicare', days: '5 days' },
                    ].map((row) => (
                      <tr key={row.num} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-blue-600">{row.num}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                            {row.stage}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-800">{row.prod}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{row.batch}</td>
                        <td className="py-2 px-3 text-slate-600">{row.sbu}</td>
                        <td className="py-2 px-3 font-medium text-slate-700">{row.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                End of preview for <strong>{activeReport.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="px-4 py-1.5 rounded bg-[#0176d3] text-white font-semibold hover:bg-blue-700 transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- NEW REPORT MODAL ----------------- */}
      {newReportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-3 sm:p-6"
          onClick={() => setNewReportModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Create New Report</h3>
              <button
                type="button"
                onClick={() => setNewReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Report Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Packaging Defect Rate"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Folder</label>
                <select className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:border-blue-600">
                  <option value="Complaint Management Reports">Complaint Management Reports</option>
                  <option value="Efficacy & CAPA Audits">Efficacy & CAPA Audits</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewReportModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-[#0176d3] text-white font-semibold hover:bg-blue-700"
                >
                  Create &amp; Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- NEW FOLDER MODAL ----------------- */}
      {newFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-3 sm:p-6"
          onClick={() => setNewFolderModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Create New Folder</h3>
              <button
                type="button"
                onClick={() => setNewFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Audit Inspection Reports"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewFolderName('');
                    setNewFolderModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#0176d3] text-white font-semibold hover:bg-blue-700"
                >
                  Save Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
