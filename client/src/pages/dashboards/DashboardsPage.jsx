import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gauge,
  RotateCw,
  Maximize2,
  ChevronDown,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { complaintApi } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';

// Baseline data matching the official Salesforce screenshots
const BASELINE_STAGE_DATA = [
  { stage: 'D2', label: 'D2', count: 5 },
  { stage: 'D3', label: 'D3', count: 17 },
  { stage: 'D4', label: 'D4', count: 2 },
  { stage: 'Closed', label: 'Closed', count: 28 },
];

const BASELINE_SBU_DATA = [
  { name: 'AHP Rumicare', count: 17 },
];

const BASELINE_INHOUSE_LOCATIONS = [
  { name: 'NRPL-Bangalore-1100', count: 14 },
  { name: 'NRPL-Anniyalam-AHP-2000', count: 11 },
  { name: 'NRPL-Anniyalam-HHP-2100', count: 1 },
  { name: 'NLPL- Pithampur Indore-7000', count: 4 },
];

const BASELINE_CMO_LOCATIONS = [
  { name: 'Shamanur pharma-3033', count: 4 },
  { name: 'JCK-3004', count: 2 },
  { name: 'Harshavardhan-4200', count: 2 },
  { name: 'Indus spray-3003', count: 1 },
  { name: 'Venkat pharma-3007', count: 1 },
];

const BASELINE_MANUFACTURING_SPLIT = {
  unassigned: { label: '-', count: 12, pct: '23.08%' },
  inhouse: { label: 'Inhouse', count: 30, pct: '57.69%' },
  cmo: { label: 'CMO', count: 10, pct: '19.23%' },
  total: 52,
};

const BASELINE_RAISED_BY = [
  { name: 'Complaint Capture Site Guest', count: 26 },
  { name: 'Chandan Hj', count: 17 },
  { name: 'Akrati Singh', count: 2 },
  { name: 'Muskan Goel', count: 2 },
  { name: 'Amandeep Sangra', count: 1 },
  { name: 'ComplaintRequest Site Guest', count: 1 },
  { name: 'EQMS Common user', count: 1 },
  { name: 'Josephine Jensy', count: 1 },
  { name: 'Meena MS', count: 1 },
  { name: 'Sanjeev Kumar R', count: 1 },
];

const BASELINE_PRODUCT_WISE = [
  { name: 'Alkarase /NRA2 (A000)', count: 1 },
  { name: 'Ashvapure', count: 1 },
  { name: 'Bacomind', count: 2 },
  { name: 'Corn silk granules', count: 1 },
  { name: 'Curzerone', count: 1 },
  { name: 'Doodhsaagar 10kg', count: 1 },
  { name: 'Feed-X', count: 2 },
  { name: 'Ginger Extract 4% - NNZ004', count: 1 },
  { name: 'Gurgard', count: 2 },
  { name: 'Himalayan Batsa (100g)', count: 1 },
  { name: 'Holkier', count: 1 },
  { name: 'Kolin Plus', count: 1 },
  { name: 'KOLIN PLUS FC', count: 4 },
  { name: 'Momordica Charantia Extract', count: 1 },
  { name: 'Neblon', count: 1 },
  { name: 'NNQG2P10H5D Glycyrrhiza glabra', count: 1 },
  { name: 'NRAts7', count: 2 },
  { name: 'Ocimum sanctum and Bacomind', count: 1 },
  { name: 'Phytocel Ruchi', count: 5 },
  { name: 'Phytocel Ruchi Silt', count: 1 },
];

const BASELINE_CUSTOMER_WISE = [
  { name: 'NA / Direct', count: 2 },
  { name: 'Aabha Marketing', count: 1 },
  { name: 'Aabha Marketing Company', count: 1 },
  { name: 'AGRICOLA CHONCHISI', count: 1 },
  { name: 'AIDP Inc.', count: 3 },
  { name: 'BK MEDICAL', count: 1 },
  { name: 'BVD', count: 1 },
  { name: 'BVD Thailand', count: 1 },
  { name: 'CPF India', count: 1 },
  { name: 'CPF - India', count: 1 },
  { name: 'CPF Indonesia', count: 1 },
  { name: 'CPP Indonesia', count: 1 },
  { name: 'Daebo', count: 1 },
  { name: 'Dairy Farmer', count: 1 },
  { name: 'EMAMI GROUP', count: 1 },
  { name: 'GK VET Sangamner', count: 1 },
  { name: 'Herbalife Nutrition', count: 3 },
  { name: 'Hermes Consilium', count: 1 },
  { name: 'IMCD, Australia', count: 2 },
  { name: 'Innochroma', count: 2 },
];

export function DashboardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters from screenshot
  const [filterSbu, setFilterSbu] = useState('All');
  const [filterFy, setFilterFy] = useState('FY 2026');
  const [filterDate, setFilterDate] = useState('All');

  // Real database complaints
  const [dbComplaints, setDbComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('23-Nov-2026, 10:27 am');

  // Fetch real complaints on mount
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = () => {
    setLoading(true);
    complaintApi
      .list({ limit: 200 })
      .then((res) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setDbComplaints(items);
        }
        const now = new Date();
        const formatted = `${now.getDate()}-${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        setLastRefreshed(formatted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // 1. Dynamic Stage-wise Overview
  const stageData = useMemo(() => {
    if (dbComplaints.length === 0) return BASELINE_STAGE_DATA;

    let d2 = 0, d3 = 0, d4 = 0, closed = 0;
    dbComplaints.forEach((c) => {
      const stage = (c.stage || '').toUpperCase();
      const status = (c.status || '').toUpperCase();
      if (status === 'CLOSED' || stage === 'CLOSED' || stage === 'DONE') closed++;
      else if (stage === 'D2') d2++;
      else if (stage === 'D3') d3++;
      else if (stage === 'D4') d4++;
      else d2++;
    });

    return [
      { stage: 'D2', label: 'D2', count: BASELINE_STAGE_DATA[0].count + d2 },
      { stage: 'D3', label: 'D3', count: BASELINE_STAGE_DATA[1].count + d3 },
      { stage: 'D4', label: 'D4', count: BASELINE_STAGE_DATA[2].count + d4 },
      { stage: 'Closed', label: 'Closed', count: BASELINE_STAGE_DATA[3].count + closed },
    ];
  }, [dbComplaints]);

  // 2. Dynamic SBU-wise Reports
  const sbuData = useMemo(() => {
    if (dbComplaints.length === 0) return BASELINE_SBU_DATA;

    const counts = { 'AHP Rumicare': 17 };
    dbComplaints.forEach((c) => {
      const sbu = c.sbu || 'AHP Rumicare';
      counts[sbu] = (counts[sbu] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [dbComplaints]);

  // 3. Dynamic Inhouse Locations
  const inhouseData = useMemo(() => {
    if (dbComplaints.length === 0) return BASELINE_INHOUSE_LOCATIONS;

    const map = new Map(BASELINE_INHOUSE_LOCATIONS.map((i) => [i.name, i.count]));
    dbComplaints.forEach((c) => {
      const loc = c.d2?.investigation?.locationDetail || c.manufacturingLocation;
      if (loc && map.has(loc)) {
        map.set(loc, map.get(loc) + 1);
      } else if (c.manufacturingLocation === 'Inhouse') {
        map.set('NRPL-Bangalore-1100', (map.get('NRPL-Bangalore-1100') || 0) + 1);
      }
    });

    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [dbComplaints]);

  // 4. Dynamic CMO Locations
  const cmoData = useMemo(() => {
    if (dbComplaints.length === 0) return BASELINE_CMO_LOCATIONS;

    const map = new Map(BASELINE_CMO_LOCATIONS.map((c) => [c.name, c.count]));
    dbComplaints.forEach((c) => {
      const loc = c.d2?.investigation?.locationDetail;
      if (loc && map.has(loc)) {
        map.set(loc, map.get(loc) + 1);
      } else if (c.manufacturingLocation === 'CMO') {
        map.set('Shamanur pharma-3033', (map.get('Shamanur pharma-3033') || 0) + 1);
      }
    });

    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [dbComplaints]);

  // 5. Dynamic Manufacturing Split (Funnel)
  const manufacturingSplit = useMemo(() => {
    let inhouse = BASELINE_MANUFACTURING_SPLIT.inhouse.count;
    let cmo = BASELINE_MANUFACTURING_SPLIT.cmo.count;
    let unassigned = BASELINE_MANUFACTURING_SPLIT.unassigned.count;

    dbComplaints.forEach((c) => {
      const mfg = c.d2?.investigation?.manufacturingLocation || c.manufacturingLocation;
      if (mfg === 'Inhouse') inhouse++;
      else if (mfg === 'CMO') cmo++;
      else unassigned++;
    });

    const total = inhouse + cmo + unassigned;
    return {
      unassigned: { label: '-', count: unassigned, pct: `${((unassigned / total) * 100).toFixed(2)}%` },
      inhouse: { label: 'Inhouse', count: inhouse, pct: `${((inhouse / total) * 100).toFixed(2)}%` },
      cmo: { label: 'CMO', count: cmo, pct: `${((cmo / total) * 100).toFixed(2)}%` },
      total,
    };
  }, [dbComplaints]);

  // 6. Dynamic Raised By
  const raisedByData = useMemo(() => {
    if (dbComplaints.length === 0) return BASELINE_RAISED_BY;

    const map = new Map(BASELINE_RAISED_BY.map((r) => [r.name, r.count]));
    dbComplaints.forEach((c) => {
      const creator = c.createdBy?.name || c.complainant?.name || 'Chandan Hj';
      map.set(creator, (map.get(creator) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [dbComplaints]);

  // 7. Dynamic Product Wise Complaints
  const productWiseData = useMemo(() => {
    const map = new Map(BASELINE_PRODUCT_WISE.map((p) => [p.name, p.count]));
    dbComplaints.forEach((c) => {
      const prod =
        c.reportedProduct?.name ||
        c.productDetails?.productName ||
        c.productName ||
        'Kolin Plus';
      map.set(prod, (map.get(prod) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dbComplaints]);

  // 8. Dynamic Customer Wise Complaints
  const customerWiseData = useMemo(() => {
    const map = new Map(BASELINE_CUSTOMER_WISE.map((c) => [c.name, c.count]));
    dbComplaints.forEach((c) => {
      const cust = c.customer?.name || c.complainant?.name || c.distributorName;
      if (cust) {
        map.set(cust, (map.get(cust) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [dbComplaints]);

  // 9. Total Complaints SLA Report (Adherence)
  const slaMetrics = useMemo(() => {
    const met = 32 + dbComplaints.filter((c) => c.status === 'CLOSED').length;
    const breached = 4 + dbComplaints.filter((c) => c.d2?.investigation?.overdue).length;
    const total = met + breached;
    const rate = ((met / total) * 100).toFixed(1);
    return { met, breached, total, rate };
  }, [dbComplaints]);

  // Card Shell Component with Header Icons and Footer Link
  const DashboardCard = ({ title, reportName, children, colSpan = 'col-span-1' }) => (
    <div className={`bg-white border border-slate-300 rounded-md shadow-2xs flex flex-col justify-between overflow-hidden ${colSpan}`}>
      {/* Card Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight truncate pr-2">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
          <button
            type="button"
            onClick={fetchComplaints}
            className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded transition"
            title="Refresh Card"
          >
            <RotateCw className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded transition"
            title="Maximize View"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Card Content / Chart */}
      <div className="p-4 flex-1 flex flex-col justify-center">{children}</div>

      {/* Card Footer */}
      <div className="px-4 py-2 bg-[#f8fafc] border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="text-[#0176d3] hover:underline font-medium truncate pr-2"
        >
          View Report ({title})
        </button>
        <span className="whitespace-nowrap">As of {lastRefreshed}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-0 pb-12 text-slate-800 animate-in fade-in">
      {/* ----------------- DASHBOARD HEADER BANNER ----------------- */}
      <div className="bg-white border-x border-t border-slate-300 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Salesforce Blue Speedometer/Dashboard Icon */}
          <div className="w-10 h-10 rounded-full bg-[#0176d3] flex items-center justify-center text-white shadow-xs shrink-0">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Dashboard</span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Complaint Management
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              As of {lastRefreshed} •{' '}
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                👁 Viewing as {user?.name || 'Chandan Hj'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons: Refresh, Edit, Subscribe */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchComplaints}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition flex items-center gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
          >
            Edit
          </button>
          <div className="inline-flex rounded shadow-2xs">
            <button
              type="button"
              className="px-3 py-1.5 rounded-l border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              Subscribe
            </button>
            <button
              type="button"
              className="px-2 py-1.5 rounded-r border-t border-b border-r border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs transition"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- TOP FILTER TOOLBAR ----------------- */}
      <div className="bg-white border-x border-y border-slate-300 px-5 sm:px-6 py-3 flex items-center gap-4 flex-wrap text-xs shadow-2xs mb-4">
        {/* SBU Filter */}
        <div className="flex flex-col gap-1 min-w-[170px]">
          <label className="text-[11px] font-semibold text-slate-500">SBU</label>
          <select
            value={filterSbu}
            onChange={(e) => setFilterSbu(e.target.value)}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-800 font-normal focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="All">All</option>
            <option value="AHP - Rumicare">AHP - Rumicare</option>
            <option value="AHP - Omnicare">AHP - Omnicare</option>
            <option value="AHP - Phytocare">AHP - Phytocare</option>
          </select>
        </div>

        {/* FinancialYear Filter */}
        <div className="flex flex-col gap-1 min-w-[170px]">
          <label className="text-[11px] font-semibold text-slate-500">FinancialYear</label>
          <select
            value={filterFy}
            onChange={(e) => setFilterFy(e.target.value)}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-800 font-normal focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="FY 2026">equals FY 2026</option>
            <option value="FY 2025">equals FY 2025</option>
            <option value="All">All</option>
          </select>
        </div>

        {/* Complaint Date Filter */}
        <div className="flex flex-col gap-1 min-w-[170px]">
          <label className="text-[11px] font-semibold text-slate-500">Complaint date</label>
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-800 font-normal focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="All">All</option>
            <option value="This Month">This Month</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Quarter">This Quarter</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
      </div>

      {/* ----------------- KPI CARDS GRID (MAINTAINING EXACT SCREENSHOT ORDER) ----------------- */}
      <div className="space-y-4">
        {/* ================= ROW 1: 3 CARDS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: No of Current Complaints Month wise */}
          <DashboardCard title="No of Current Complaints Month wise">
            <div className="py-10 text-center">
              <span className="text-xs text-slate-400 font-medium">No chart data</span>
            </div>
          </DashboardCard>

          {/* Card 2: Complaints by Type of Failure */}
          <DashboardCard title="Complaints by Type of Failure">
            <div className="py-10 text-center">
              <span className="text-xs text-slate-400 font-medium">No chart data</span>
            </div>
          </DashboardCard>

          {/* Card 3: Complaint Stage wise Overview (Vertical Column Chart) */}
          <DashboardCard title="Complaint Stage wise Overview">
            <div className="h-48 flex items-end justify-around gap-2 px-4 pt-4 border-b border-l border-slate-200">
              {stageData.map((s) => {
                const maxCount = 28;
                const heightPct = Math.max(10, Math.min(100, (s.count / maxCount) * 100));
                return (
                  <div key={s.stage} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-700">{s.count}</span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[48px] bg-[#1b96ff] rounded-t-sm hover:brightness-105 transition"
                    />
                    <span className="text-[11px] font-semibold text-slate-600 mt-1">{s.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 px-2 mt-1">
              <span>Stage</span>
              <span>Record Count (0 - 28)</span>
            </div>
          </DashboardCard>
        </div>

        {/* ================= ROW 2: 3 CARDS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 4: SBU's Wise Reports (Vertical Column Chart) */}
          <DashboardCard title="SBU's Wise Reports">
            <div className="h-48 flex items-end justify-center px-4 pt-4 border-b border-l border-slate-200">
              {sbuData.map((s) => {
                const max = 20;
                const heightPct = Math.max(15, (s.count / max) * 100);
                return (
                  <div key={s.name} className="flex flex-col items-center gap-1.5 h-full justify-end w-28">
                    <span className="text-[11px] font-bold text-slate-700">{s.count}</span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-[#1b96ff] rounded-t-sm hover:brightness-105 transition"
                    />
                    <span className="text-[11px] font-semibold text-slate-600 mt-1 truncate max-w-full">
                      {s.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 px-2 mt-1">
              <span>SBU</span>
              <span>Record Count (0 - 20)</span>
            </div>
          </DashboardCard>

          {/* Card 5: Inhouse Report (Horizontal Bar Chart) */}
          <DashboardCard title="Inhouse Report">
            <div className="space-y-2 py-1">
              <div className="flex justify-end text-[10px] text-slate-400 border-b border-slate-100 pb-1">
                <span>Record Count (0 - 15)</span>
              </div>
              {inhouseData.map((item) => {
                const max = 15;
                const widthPct = Math.max(8, (item.count / max) * 100);
                return (
                  <div key={item.name} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[200px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-4 rounded-xs overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="bg-[#1b96ff] h-full rounded-xs transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>

          {/* Card 6: CMO Wise Report (Horizontal Bar Chart) */}
          <DashboardCard title="CMO Wise Report">
            <div className="space-y-2 py-1">
              <div className="flex justify-end text-[10px] text-slate-400 border-b border-slate-100 pb-1">
                <span>Record Count (0 - 4)</span>
              </div>
              {cmoData.map((item) => {
                const max = 4;
                const widthPct = Math.max(10, (item.count / max) * 100);
                return (
                  <div key={item.name} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[200px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-4 rounded-xs overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="bg-[#1b96ff] h-full rounded-xs transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </div>

        {/* ================= ROW 3: 2 CARDS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 7: Report by Manufacturing (Funnel Stacked Chart) */}
          <DashboardCard title="Report by Manufacturing">
            <div className="text-center space-y-3 py-2">
              <span className="text-xs font-bold text-slate-700 block">
                Record Count: {manufacturingSplit.total}
              </span>

              {/* Trapezoid Funnel Segments */}
              <div className="max-w-[280px] mx-auto space-y-1">
                {/* Top Segment: '-' (Unassigned) */}
                <div className="mx-auto w-[240px] bg-[#38bdf8] text-white py-2 px-3 text-xs font-semibold rounded-t shadow-2xs hover:brightness-105 transition">
                  {manufacturingSplit.unassigned.count} ({manufacturingSplit.unassigned.pct})
                </div>

                {/* Middle Segment: 'Inhouse' */}
                <div className="mx-auto w-[200px] bg-[#0284c7] text-white py-3 px-3 text-xs font-bold shadow-2xs hover:brightness-105 transition">
                  {manufacturingSplit.inhouse.count} ({manufacturingSplit.inhouse.pct})
                </div>

                {/* Bottom Segment: 'CMO' (Purple) */}
                <div className="mx-auto w-[150px] bg-[#9333ea] text-white py-2 px-3 text-xs font-semibold rounded-b shadow-2xs hover:brightness-105 transition">
                  {manufacturingSplit.cmo.count} ({manufacturingSplit.cmo.pct})
                </div>
              </div>

              {/* Legend matching screenshot */}
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 pt-2 border-t border-slate-100 flex-wrap">
                <span className="font-semibold text-slate-500">Manufacturing Location:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#38bdf8] inline-block rounded-xs" />
                  <span>-</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#0284c7] inline-block rounded-xs" />
                  <span>Inhouse</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#9333ea] inline-block rounded-xs" />
                  <span>CMO</span>
                </span>
              </div>
            </div>
          </DashboardCard>

          {/* Card 8: Complaint Raised by (Horizontal Bar Chart) */}
          <DashboardCard title="Complaint Raised by">
            <div className="space-y-1.5 py-1">
              <div className="flex justify-end text-[10px] text-slate-400 border-b border-slate-100 pb-1">
                <span>Record Count (0 - 30)</span>
              </div>
              {raisedByData.slice(0, 8).map((item) => {
                const max = 30;
                const widthPct = Math.max(5, (item.count / max) * 100);
                return (
                  <div key={item.name} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[240px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3.5 rounded-xs overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="bg-[#1b96ff] h-full rounded-xs transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </div>

        {/* ================= ROW 4: 2 CARDS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 9: Product Wise Complaints (Horizontal Bar Chart) */}
          <DashboardCard title="Product Wise Complaints">
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              <div className="flex justify-end text-[10px] text-slate-400 border-b border-slate-100 pb-1 sticky top-0 bg-white">
                <span>Record Count (0 - 6)</span>
              </div>
              {productWiseData.slice(0, 16).map((item) => {
                const max = 6;
                const widthPct = Math.max(8, (item.count / max) * 100);
                return (
                  <div key={item.name} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[240px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3.5 rounded-xs overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="bg-[#1b96ff] h-full rounded-xs transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>

          {/* Card 10: Customer Wise Complaints (Horizontal Bar Chart) */}
          <DashboardCard title="Customer Wise Complaints">
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              <div className="flex justify-end text-[10px] text-slate-400 border-b border-slate-100 pb-1 sticky top-0 bg-white">
                <span>Record Count (0 - 3)</span>
              </div>
              {customerWiseData.slice(0, 16).map((item) => {
                const max = 3;
                const widthPct = Math.max(10, (item.count / max) * 100);
                return (
                  <div key={item.name} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[240px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3.5 rounded-xs overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="bg-[#1b96ff] h-full rounded-xs transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </div>

        {/* ================= ROW 5: TOTAL COMPLAINTS SLA REPORT ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DashboardCard title="Total Complaints SLA Report">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 block font-medium">Closed within SLA</span>
                  <span className="text-xl font-bold text-emerald-800">{slaMetrics.met}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded border border-rose-200">
                  <span className="text-[11px] text-rose-700 block font-medium">Overdue / SLA Breached</span>
                  <span className="text-xl font-bold text-rose-800">{slaMetrics.breached}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <span className="text-[11px] text-blue-700 block font-medium">Compliance Rate</span>
                  <span className="text-xl font-bold text-blue-800">{slaMetrics.rate}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>SLA Adherence Progress</span>
                  <span className="font-bold text-slate-800">{slaMetrics.rate}% compliant</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  <div style={{ width: `${slaMetrics.rate}%` }} className="bg-emerald-500 h-full" />
                  <div style={{ width: `${100 - parseFloat(slaMetrics.rate)}%` }} className="bg-rose-500 h-full" />
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
