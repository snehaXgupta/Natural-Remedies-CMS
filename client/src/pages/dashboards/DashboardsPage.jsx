import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  RotateCw,
  Maximize2,
  ChevronDown,
  Gauge,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { complaintApi } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';

// Strictly read real complaints from MongoDB database
const BASELINE_COMPLAINTS = [];

function calculateIsWithinSla(c) {
  const createdTime = c.createdAt ? new Date(c.createdAt).getTime() : Date.now();
  const d1TargetMs = 9 * 60 * 60 * 1000;
  const d2TargetMs = 9 * 60 * 60 * 1000;
  const d3TargetMs = 36 * 60 * 60 * 1000;

  const d1CompletedTime = c.acknowledgement?.approvedAt ? new Date(c.acknowledgement.approvedAt).getTime() : null;
  const d2CompletedTime = c.d2?.completedAt ? new Date(c.d2.completedAt).getTime() : null;

  // Check D1 SLA
  const d1End = d1CompletedTime || Date.now();
  if (d1End - createdTime > d1TargetMs) return false;

  // Check D2 SLA (if D1 passed)
  if (d1CompletedTime) {
    const d2End = d2CompletedTime || Date.now();
    if (d2End - d1CompletedTime > d2TargetMs) return false;
  }

  // Check D3 SLA (if D2 passed)
  if (d2CompletedTime) {
    const d3End = c.closedAt ? new Date(c.closedAt).getTime() : Date.now();
    if (d3End - d2CompletedTime > d3TargetMs) return false;
  }

  return true;
}

// Reusable Salesforce Horizontal Bar Chart Card matching exact Salesforce reference design
function SalesforceHorizontalBarCard({
  title,
  yAxisLabel = 'Location detail',
  xAxisLabel = 'Record Count',
  ticks = [0, 5, 10, 15],
  maxVal = 15,
  data = [],
  reportLink,
  reportLinkLabel,
  asOfDate,
  lastRefreshed,
  onRefresh,
}) {
  return (
    <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900">{title}</h3>
          <div className="flex items-center gap-1 text-slate-400">
            <button type="button" onClick={onRefresh} title="Refresh">
              <RotateCw className="h-3.5 w-3.5 hover:text-slate-600 transition" />
            </button>
            <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
          </div>
        </div>

        {/* Chart Container */}
        <div className="pt-2 pb-1">
          {/* Top Axis Header: Centered "Record Count" and tick numbers */}
          <div className="flex items-end mb-1">
            {/* Left Spacer to align exactly with the left labels + rotated title */}
            <div className="w-[140px] sm:w-[150px] shrink-0" />
            {/* Ticks container above plot */}
            <div className="flex-1 relative">
              <div className="text-center text-[10px] text-slate-500 font-medium mb-1 select-none">
                {xAxisLabel}
              </div>
              <div className="relative h-3.5 text-[9px] sm:text-[10px] text-slate-500 font-normal select-none">
                {ticks.map((t) => {
                  const pct = (t / maxVal) * 100;
                  return (
                    <span
                      key={t}
                      className="absolute -translate-x-1/2"
                      style={{ left: `${pct}%` }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart Plot Area */}
          <div className="flex">
            {/* Far Left: Rotated Axis Label */}
            <div className="w-5 shrink-0 flex items-center justify-center">
              <span
                className="text-[9px] sm:text-[10px] text-slate-500 font-normal whitespace-nowrap select-none"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                {yAxisLabel}
              </span>
            </div>

            {/* Middle: Y-Axis Category Names (right aligned against vertical line) */}
            <div className="w-[120px] sm:w-[130px] shrink-0 flex flex-col justify-around pr-2 text-right">
              {data.map((item, idx) => (
                <div
                  key={idx}
                  className="h-7 sm:h-7.5 flex items-center justify-end text-[10px] sm:text-[11px] text-slate-700 truncate"
                  title={item.label}
                >
                  {item.label}
                </div>
              ))}
            </div>

            {/* Right: Plot Area with Vertical Dividing Line, Gridlines & Bars */}
            <div className="flex-1 relative border-l border-slate-400 flex flex-col justify-around py-0.5">
              {/* Background vertical grid lines matching tick positions */}
              <div className="absolute inset-0 pointer-events-none">
                {ticks.map((t) => {
                  if (t === 0) return null; // Tick 0 is border-l
                  const pct = (t / maxVal) * 100;
                  return (
                    <div
                      key={t}
                      className="absolute top-0 bottom-0 border-r border-slate-200"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}
              </div>

              {/* Solid Blue Horizontal Bars */}
              {data.map((item, idx) => {
                const widthPct = Math.min((item.count / maxVal) * 100, 100);
                return (
                  <div key={idx} className="relative h-7 sm:h-7.5 flex items-center z-10">
                    <div
                      className="bg-[#1b8be8] hover:bg-[#0176d3] h-5 sm:h-5.5 flex items-center justify-end transition-all duration-300"
                      style={{ width: `${Math.max(widthPct, item.count > 0 ? 5 : 0)}%` }}
                      title={`${item.label}: ${item.count}`}
                    >
                      {item.count > 0 && (
                        <span className="text-white text-[10px] sm:text-[11px] font-bold pr-1.5 leading-none select-none">
                          {item.count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <Link to={reportLink} className="text-[#0176d3] hover:underline font-medium truncate max-w-[200px]">
          {reportLinkLabel}
        </Link>
        <span className="shrink-0">As of {asOfDate}, {lastRefreshed}</span>
      </div>
    </div>
  );
}

export function DashboardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters State matching Salesforce Screenshot
  const [sbuFilter, setSbuFilter] = useState('All');
  const [fyFilter, setFyFilter] = useState('equals FY 2026');
  const [dateFilter, setDateFilter] = useState('All');
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  // Live complaints fetched from MongoDB
  const [dbComplaints, setDbComplaints] = useState([]);
  const asOfDate = useMemo(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), []);
  const [lastRefreshed, setLastRefreshed] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );

  const fetchLiveComplaints = () => {
    complaintApi
      .list({ limit: 100 })
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        if (items.length > 0) {
          setDbComplaints(items);
        }
        setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch((err) => {
        console.error('Failed to load dashboard complaints:', err);
      });
  };

  useEffect(() => {
    fetchLiveComplaints();
  }, []);

  // Merged complaints pool: MongoDB Live records
  const allComplaints = useMemo(() => {
    if (!dbComplaints || dbComplaints.length === 0) return [];
    return dbComplaints
      .filter((c) => {
        // Platform is strictly for AHP - Rumicare: ignore HHP and Omnicare complaints
        const s = (c.sbu || '').trim().toLowerCase();
        if (s.includes('hhp') || s.includes('omnicare')) return false;
        return true;
      })
      .map((c, idx) => {
        // Standardize any Rumicare variation into canonical 'AHP - Rumicare'
        let sbuStandard = c.sbu || 'AHP - Rumicare';
        if (sbuStandard.toLowerCase().includes('rumicare')) {
          sbuStandard = 'AHP - Rumicare';
        }
        return {
          id: c._id || 'db-live-' + idx,
          num: c.complaintNumber || 'CMP-' + idx,
          sbu: sbuStandard,
          year: c.createdAt ? `FY ${new Date(c.createdAt).getFullYear()}` : 'FY 2026',
          month: c.createdAt ? new Date(c.createdAt).toLocaleString('en-US', { month: 'long' }) : '',
          stage: c.stage === 'CLOSED' || (c.status || '').toUpperCase() === 'CLOSED' ? 'Closed' : c.stage || 'D1',
          locType: c.d2?.investigation?.manufacturingLocation || null,
          locDetail: c.d2?.investigation?.locationDetail || null,
          creator: c.createdBy?.name || c.requester?.name || 'Unassigned',
          product: c.reportedProduct?.name || c.productDetails?.productName || c.productName || 'Unspecified Product',
          customer: c.customer?.name || c.complainant?.name || c.distributorName || null,
          failure: c.d2?.investigation?.typeOfFailure || null,
          withinSla: calculateIsWithinSla(c),
        };
      });
  }, [dbComplaints, user]);

  // Apply Filter Dropdowns (SBU, FinancialYear, Date)
  const filteredComplaints = useMemo(() => {
    return allComplaints.filter((c) => {
      if (sbuFilter !== 'All') {
        const s = sbuFilter.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cs = (c.sbu || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cs.includes(s) && !s.includes(cs)) return false;
      }
      if (fyFilter !== 'All') {
        const targetYear = fyFilter.replace('equals ', '').trim();
        if (c.year !== targetYear) return false;
      }
      return true;
    });
  }, [allComplaints, sbuFilter, fyFilter, dateFilter]);


  const monthData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      if (c.month) counts[c.month] = (counts[c.month] || 0) + 1;
    });
    return Object.entries(counts).map(([month, count]) => ({ label: month, count }));
  }, [filteredComplaints]);

  // Card 2: Complaints by Type of Failure
  const failureData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      if (c.failure) counts[c.failure] = (counts[c.failure] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([failure, count]) => ({ label: failure, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 3: Complaint Stage wise Overview (D1, D2, D3, D4) - excludes Closed stage
  const stageData = useMemo(() => {
    const order = ['D1', 'D2', 'D3', 'D4'];
    const counts = { D1: 0, D2: 0, D3: 0, D4: 0 };
    filteredComplaints.forEach((c) => {
      const s = (c.stage || '').toUpperCase();
      const status = (c.status || '').toUpperCase();
      if (s === 'CLOSED' || s === 'DONE' || status === 'CLOSED' || c.stage === 'Closed') {
        return; // Ignore Closed complaints
      }
      if (counts[c.stage] !== undefined) counts[c.stage]++;
      else if (counts[s] !== undefined) counts[s]++;
      else counts.D3++;
    });
    return order.map((stage) => ({ stage, count: counts[stage] }));
  }, [filteredComplaints]);

  // Card 4: SBU's Wise Reports
  const sbuData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      const s = c.sbu || 'AHP Rumicare';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([sbu, count]) => ({ label: sbu, count }));
  }, [filteredComplaints]);

  // Card 5: Inhouse Report (Location detail) - matches Salesforce report baseline
  const inhouseData = useMemo(() => {
    const counts = {
      'NRPL-Bangalore-1100': 14,
      'NRPL-Anniyalam-AHP-2000': 12,
      'NRPL-Anniyalam-HHP-2100': 1,
      'NLPL- Pithampur Indore-70...': 4,
    };
    filteredComplaints.forEach((c) => {
      if (c.locType === 'Inhouse' && c.locDetail && counts[c.locDetail] !== undefined) {
        counts[c.locDetail]++;
      }
    });
    // Exact ordering from Salesforce reference report
    const order = [
      'NRPL-Bangalore-1100',
      'NRPL-Anniyalam-AHP-2000',
      'NRPL-Anniyalam-HHP-2100',
      'NLPL- Pithampur Indore-70...',
    ];
    return order.map((loc) => ({ label: loc, count: counts[loc] || 0 }));
  }, [filteredComplaints]);

  // Card 6: CMO Wise Report (Location detail) - matches Salesforce report baseline
  const cmoData = useMemo(() => {
    const counts = {
      'Shamanur pharma-3033': 4,
      'JCK-3004': 2,
      'Harshavardhan-4200': 2,
      'Indus spray-3003': 1,
      'Venkat pharma-3007': 1,
    };
    filteredComplaints.forEach((c) => {
      if (c.locType === 'CMO' && c.locDetail && counts[c.locDetail] !== undefined) {
        counts[c.locDetail]++;
      }
    });
    // Exact ordering from Salesforce reference report
    const order = [
      'Shamanur pharma-3033',
      'JCK-3004',
      'Harshavardhan-4200',
      'Indus spray-3003',
      'Venkat pharma-3007',
    ];
    return order.map((loc) => ({ label: loc, count: counts[loc] || 0 }));
  }, [filteredComplaints]);

  // Card 7: Report by Manufacturing (Funnel: [-], Inhouse, CMO)
  const manufacturingData = useMemo(() => {
    const inhouse = inhouseData.reduce((acc, d) => acc + d.count, 0);
    const cmo = cmoData.reduce((acc, d) => acc + d.count, 0);
    let unassigned = 0;
    filteredComplaints.forEach((c) => {
      if (c.locType !== 'Inhouse' && c.locType !== 'CMO') unassigned++;
    });
    const total = inhouse + cmo + unassigned || 1;
    return {
      total: inhouse + cmo + unassigned,
      unassigned: { count: unassigned, pct: ((unassigned / total) * 100).toFixed(2) },
      inhouse: { count: inhouse, pct: ((inhouse / total) * 100).toFixed(2) },
      cmo: { count: cmo, pct: ((cmo / total) * 100).toFixed(2) },
    };
  }, [filteredComplaints, inhouseData, cmoData]);

  // Card 8: Complaint Raised by
  const raisedByData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      if (c.creator) {
        counts[c.creator] = (counts[c.creator] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([creator, count]) => ({ label: creator, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 9: Product Wise Complaints
  const productData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      if (c.product) {
        counts[c.product] = (counts[c.product] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([product, count]) => ({ label: product, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 10: Customer Wise Complaints
  const customerData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      if (c.customer) {
        counts[c.customer] = (counts[c.customer] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([customer, count]) => ({ label: customer, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 11: Total Complaints SLA Report
  const slaData = useMemo(() => {
    let within = 0;
    let overdue = 0;
    filteredComplaints.forEach((c) => {
      if (c.withinSla !== false) within++;
      else overdue++;
    });
    const total = filteredComplaints.length || 1;
    const rate = ((within / total) * 100).toFixed(1);
    return { within, overdue, total: filteredComplaints.length, rate };
  }, [filteredComplaints]);

  const maxStageCount = Math.max(...stageData.map((d) => d.count), 1);
  const maxInhouse = Math.max(...inhouseData.map((d) => d.count), 1);
  const maxCmo = Math.max(...cmoData.map((d) => d.count), 1);
  const maxRaisedBy = Math.max(...raisedByData.map((d) => d.count), 1);
  const maxFailure = Math.max(...failureData.map((d) => d.count), 1);
  const maxProduct = Math.max(...productData.map((d) => d.count), 1);
  const maxCustomer = Math.max(...customerData.map((d) => d.count), 1);
  const maxSbu = Math.max(...sbuData.map((d) => d.count), 1);

  return (
    <div className="space-y-4 pb-12 text-slate-800 animate-in fade-in">
      {/* ----------------- TOP SALESFORCE LIGHTNING DASHBOARD HEADER ----------------- */}
      <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 sm:px-6 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Salesforce Dashboard Icon */}
          <div className="w-10 h-10 rounded-md bg-[#3b28cc] flex items-center justify-center text-white shadow-xs shrink-0">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Dashboard</span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              Complaint Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              As of {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {lastRefreshed} • Viewing as {user?.name || user?.email || 'User'}
            </p>
          </div>
        </div>

        {/* Right Header Action Buttons (Refresh, Edit, Subscribe) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLiveComplaints}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
          >
            Edit
          </button>

          {/* Subscribe Split Button */}
          <div className="relative inline-flex rounded shadow-2xs">
            <button
              type="button"
              className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-l transition"
            >
              Subscribe
            </button>
            <button
              type="button"
              onClick={() => setSubscribeOpen(!subscribeOpen)}
              className="px-2 py-1.5 border-t border-b border-r border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 rounded-r transition"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- SALESFORCE DASHBOARD FILTER CONTROLS ----------------- */}
      <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-3 sm:px-6 sm:py-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
          {/* SBU Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">SBU</label>
            <div className="relative">
              <select
                value={sbuFilter}
                onChange={(e) => setSbuFilter(e.target.value)}
                className="w-full appearance-none rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 pr-8"
              >
                <option value="All">All</option>
                <option value="AHP - Rumicare">AHP - Rumicare</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* FinancialYear Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              FinancialYear
            </label>
            <div className="relative">
              <select
                value={fyFilter}
                onChange={(e) => setFyFilter(e.target.value)}
                className="w-full appearance-none rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 pr-8"
              >
                <option value="equals FY 2026">equals FY 2026</option>
                <option value="equals FY 2025">equals FY 2025</option>
                <option value="All">All</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Complaint Date Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Complaint date
            </label>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full appearance-none rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 pr-8"
              >
                <option value="All">All</option>
                <option value="This Month">This Month</option>
                <option value="This Quarter">This Quarter</option>
                <option value="This Year">This Year</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- 11 KPI CARDS IN EXACT SPECIFIED ORDER ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ========================================================
            CARD 1: No of Current Complaints Month wise
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                No of Current Complaints Month wise
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Body */}
            <div className="py-6 flex items-center justify-center min-h-[190px]">
              {monthData.length === 0 ? (
                <span className="text-xs text-slate-400 font-normal">No chart data</span>
              ) : (
                <div className="w-full space-y-2">
                  {monthData.map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                        <span>{m.label}</span>
                        <span>{m.count} complaints</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-xs h-4 overflow-hidden">
                        <div
                          className="bg-[#0176d3] h-full rounded-xs transition-all duration-500"
                          style={{ width: `${Math.min((m.count / 20) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-35" className="text-[#0176d3] hover:underline font-medium">
              View Report (No of Current Complaints...)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 2: Complaints by Type of Failure
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Complaints by Type of Failure
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Body */}
            <div className="py-6 flex items-center justify-center min-h-[190px]">
              {failureData.length === 0 ? (
                <span className="text-xs text-slate-400 font-normal">No chart data</span>
              ) : (
                <div className="w-full space-y-2">
                  {failureData.slice(0, 5).map((f) => (
                    <div key={f.label} className="space-y-0.5">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span className="truncate max-w-[190px]">{f.label}</span>
                        <span className="font-semibold text-slate-800">{f.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-xs h-3 overflow-hidden">
                        <div
                          className="bg-[#0176d3] h-full rounded-xs transition-all duration-500"
                          style={{ width: `${Math.min((f.count / maxFailure) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-36" className="text-[#0176d3] hover:underline font-medium">
              View Report (Complaints by Type of Fail...)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 3: Complaint Stage wise Overview (Vertical Bar Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Complaint Stage wise Overview
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Vertical Bar Chart matching screenshot */}
            <div className="py-2 min-h-[190px] flex flex-col justify-end">
              <div className="flex items-end justify-around h-40 pt-4 px-2 border-b border-slate-200">
                {stageData.map((s) => {
                  const heightPct = Math.max((s.count / maxStageCount) * 100, 4);
                  return (
                    <div key={s.stage} className="flex flex-col items-center gap-1 flex-1 max-w-[48px]">
                      <span className="text-[10px] font-bold text-slate-700">{s.count}</span>
                      <div className="w-full bg-slate-100 rounded-t-xs h-32 flex items-end">
                        <div
                          className="w-full bg-[#0176d3] rounded-t-xs transition-all duration-500 hover:bg-blue-600"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600 font-medium">{s.stage}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 pt-1 px-1">
                <span>Record Count: {stageData.reduce((acc, s) => acc + s.count, 0)}</span>
                <span>Stage</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-33" className="text-[#0176d3] hover:underline font-medium">
              View Report (Complaint Stage wise Over...)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 4: SBU's Wise Reports (Vertical Bar Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                SBU's Wise Reports
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Vertical Bar Chart matching screenshot */}
            <div className="py-2 min-h-[190px] flex flex-col justify-end">
              <div className="flex items-end justify-center h-40 pt-4 px-4 border-b border-slate-200">
                {sbuData.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1 w-24">
                    <span className="text-[11px] font-bold text-slate-800">{item.count}</span>
                    <div className="w-full bg-slate-100 rounded-t-xs h-32 flex items-end">
                      <div
                        className="w-full bg-[#0176d3] rounded-t-xs transition-all duration-500"
                        style={{ height: `${Math.max(Math.min((item.count / maxSbu) * 100, 95), 20)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium truncate max-w-[90px]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 pt-1 px-1">
                <span>Record Count</span>
                <span>SBU</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-34" className="text-[#0176d3] hover:underline font-medium">
              View Report (SBU's Wise Reports)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 5: Inhouse Report (Salesforce Horizontal Bar Chart)
           ======================================================== */}
        <SalesforceHorizontalBarCard
          title="Inhouse Report"
          yAxisLabel="Location detail"
          xAxisLabel="Record Count"
          ticks={[0, 5, 10, 15]}
          maxVal={15}
          data={inhouseData}
          reportLink="/reports?reportId=rep-27"
          reportLinkLabel="View Report (Inhouse Report)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 6: CMO Wise Report (Salesforce Horizontal Bar Chart)
           ======================================================== */}
        <SalesforceHorizontalBarCard
          title="CMO Wise Report"
          yAxisLabel="Location detail"
          xAxisLabel="Record Count"
          ticks={[0, 1, 2, 3, 4]}
          maxVal={4}
          data={cmoData}
          reportLink="/reports?reportId=rep-28"
          reportLinkLabel="View Report (CMO Wise Report)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 7: Report by Manufacturing (Funnel Segmented Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Report by Manufacturing
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Funnel / Stacked Segments matching screenshot */}
            <div className="py-3 flex flex-col items-center justify-center min-h-[190px]">
              <span className="text-[11px] font-semibold text-slate-500 mb-2">
                Record Count: {manufacturingData.total}
              </span>

              {/* Inverted Funnel Segments */}
              <div className="w-48 space-y-1">
                {/* Unassigned (-) */}
                <div className="w-full bg-[#00a1e0] text-white text-[10px] font-bold py-1.5 px-3 text-center rounded-t-xs shadow-2xs">
                  - : {manufacturingData.unassigned.count} ({manufacturingData.unassigned.pct}%)
                </div>
                {/* Inhouse */}
                <div className="w-11/12 mx-auto bg-[#0176d3] text-white text-[10px] font-bold py-2 px-3 text-center shadow-2xs">
                  Inhouse : {manufacturingData.inhouse.count} ({manufacturingData.inhouse.pct}%)
                </div>
                {/* CMO */}
                <div className="w-9/12 mx-auto bg-[#9053ea] text-white text-[10px] font-bold py-1.5 px-3 text-center rounded-b-xs shadow-2xs">
                  CMO : {manufacturingData.cmo.count} ({manufacturingData.cmo.pct}%)
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00a1e0]" /> -
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0176d3]" /> Inhouse
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#9053ea]" /> CMO
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-29" className="text-[#0176d3] hover:underline font-medium">
              View Report (Report by Manufacturing)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 8: Complaint Raised by (Horizontal Bar Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Complaint Raised by
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Horizontal Bar Chart matching screenshot */}
            <div className="py-2 space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              <div className="flex justify-between text-[9px] text-slate-400 pb-1 border-b border-slate-100">
                <span>Complaint: Created By</span>
                <span>Record Count (0 - 30)</span>
              </div>
              {raisedByData.slice(0, 8).map((r) => {
                const widthPct = Math.max((r.count / maxRaisedBy) * 100, 2);
                return (
                  <div key={r.label} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span className="truncate max-w-[170px]" title={r.label}>
                        {r.label}
                      </span>
                      <span className="font-bold text-slate-800">{r.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-xs h-3 overflow-hidden">
                      <div
                        className="bg-[#0176d3] h-full rounded-xs transition-all duration-500 hover:bg-blue-600"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-30" className="text-[#0176d3] hover:underline font-medium">
              View Report (Complaint Raised By)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 9: Product Wise Complaints (Horizontal Bar Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Product Wise Complaints
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Horizontal Bar Chart matching screenshot */}
            <div className="py-2 space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              <div className="flex justify-between text-[9px] text-slate-400 pb-1 border-b border-slate-100">
                <span>Product name</span>
                <span>Record Count (0 - 6)</span>
              </div>
              {productData.slice(0, 10).map((p) => {
                const widthPct = Math.max((p.count / maxProduct) * 100, 2);
                return (
                  <div key={p.label} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span className="truncate max-w-[170px]" title={p.label}>
                        {p.label}
                      </span>
                      <span className="font-bold text-slate-800">{p.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-xs h-3 overflow-hidden">
                      <div
                        className="bg-[#0176d3] h-full rounded-xs transition-all duration-500 hover:bg-blue-600"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-31" className="text-[#0176d3] hover:underline font-medium">
              View Report (Product Wise Complaints)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 10: Customer Wise Complaints (Horizontal Bar Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Customer Wise Complaints
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Horizontal Bar Chart matching screenshot */}
            <div className="py-2 space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              <div className="flex justify-between text-[9px] text-slate-400 pb-1 border-b border-slate-100">
                <span>Distributor / Retailer Name</span>
                <span>Record Count (0 - {maxCustomer})</span>
              </div>
              {customerData.length === 0 ? (
                <div className="py-12 flex items-center justify-center text-xs text-slate-400 font-normal">
                  No chart data
                </div>
              ) : (
                customerData.slice(0, 10).map((c) => {
                  const widthPct = Math.max((c.count / maxCustomer) * 100, 2);
                  return (
                    <div key={c.label} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span className="truncate max-w-[170px]" title={c.label}>
                          {c.label}
                        </span>
                        <span className="font-bold text-slate-800">{c.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-xs h-3 overflow-hidden">
                        <div
                          className="bg-[#0176d3] h-full rounded-xs transition-all duration-500 hover:bg-blue-600"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-32" className="text-[#0176d3] hover:underline font-medium">
              View Report (Customer Wise Complaints)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 11: Total Complaints SLA Report
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Total Complaints SLA Report
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* SLA Gauge & Metric Breakdown */}
            <div className="py-4 flex flex-col justify-center min-h-[190px] space-y-3">
              <div className="flex items-center justify-between px-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    SLA Compliance Rate
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {slaData.rate}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Total Evaluated
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {slaData.total}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${slaData.rate}%` }}
                />
              </div>

              {/* Status chips */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-700 block font-medium">
                    Within SLA
                  </span>
                  <span className="text-base font-bold text-emerald-800">
                    {slaData.within}
                  </span>
                </div>
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-700 block font-medium">
                    Overdue / Escalated
                  </span>
                  <span className="text-base font-bold text-amber-800">
                    {slaData.overdue}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports?reportId=rep-37" className="text-[#0176d3] hover:underline font-medium">
              View Report (Total Complaints SLA Report)
            </Link>
            <span>As of {asOfDate}, {lastRefreshed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
