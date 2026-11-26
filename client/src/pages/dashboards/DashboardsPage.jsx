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
  defaultTicks = [0, 5, 10, 15],
  defaultMax = 15,
  data = [],
  reportLink,
  reportLinkLabel,
  asOfDate,
  lastRefreshed,
  onRefresh,
}) {
  const maxInArray = Math.max(...data.map((d) => d.count || 0), 0);

  // Dynamic scale ticks based on real backend counts
  const { ticks, maxVal } = useMemo(() => {
    if (maxInArray === 0 || maxInArray <= defaultMax) {
      return { ticks: defaultTicks, maxVal: defaultMax };
    }
    const step = Math.ceil(maxInArray / 4);
    const max = step * 4;
    return {
      ticks: [0, step, step * 2, step * 3, max],
      maxVal: max,
    };
  }, [maxInArray, defaultMax, defaultTicks]);

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

        {data.length === 0 ? (
          <div className="py-12 flex items-center justify-center min-h-[190px]">
            <span className="text-xs text-slate-400 font-normal">No chart data.</span>
          </div>
        ) : (
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
            <div className="flex max-h-[190px] overflow-y-auto pr-1">
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
                    className="h-6 sm:h-7 flex items-center justify-end text-[10px] sm:text-[11px] text-slate-700 truncate"
                    title={item.label}
                  >
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Right: Plot Area with Vertical Dividing Line, Gridlines & Bars */}
              <div className="flex-1 relative border-l border-slate-400 flex flex-col justify-around py-0.5 min-h-[90px]">
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
                    <div key={idx} className="relative h-6 sm:h-7 flex items-center z-10">
                      <div
                        className="bg-[#1b8be8] hover:bg-[#0176d3] h-4.5 sm:h-5 flex items-center justify-end transition-all duration-300"
                        style={{ width: `${Math.max(widthPct, item.count > 0 ? 5 : 0)}%` }}
                        title={`${item.label}: ${item.count}`}
                      >
                        {item.count > 0 && (
                          <span className="text-white text-[9px] sm:text-[10px] font-bold pr-1.5 leading-none select-none">
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
        )}
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

// Reusable Salesforce Vertical Bar Chart matching exact Salesforce reference design
function SalesforceVerticalBarCard({
  title = 'Complaint Stage wise Overview',
  yAxisLabel = 'Record Count',
  xAxisLabel = 'Stage',
  defaultTicks = [28, 21, 14, 7, 0],
  defaultMax = 28,
  data = [],
  reportLink = '/reports?reportId=rep-33',
  reportLinkLabel = 'View Report (Complaint Stage wise Over...)',
  asOfDate,
  lastRefreshed,
  onRefresh,
}) {
  const maxInArray = Math.max(...data.map((d) => d.count || 0), 0);

  const { ticks, maxVal } = useMemo(() => {
    if (maxInArray === 0 || maxInArray <= defaultMax) {
      return { ticks: defaultTicks, maxVal: defaultMax };
    }
    const step = Math.ceil(maxInArray / 4);
    const max = step * 4;
    return {
      ticks: [max, step * 3, step * 2, step, 0],
      maxVal: max,
    };
  }, [maxInArray, defaultMax, defaultTicks]);

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

        {/* Chart Area */}
        <div className="pt-3 pb-1">
          <div className="flex">
            {/* Far Left: Rotated Y-Axis Label "Record Count" */}
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

            {/* Y-Axis Tick Numbers */}
            <div className="w-6 shrink-0 flex flex-col justify-between items-end pr-1.5 h-36 text-[9px] sm:text-[10px] text-slate-500 font-normal select-none py-0.5">
              {ticks.map((t) => (
                <span key={t} className="leading-none">{t}</span>
              ))}
            </div>

            {/* Plot Area with Horizontal Gridlines & Vertical Bars */}
            <div className="flex-1 relative h-36 border-b border-slate-300">
              {/* Background Horizontal Grid Lines at ticks */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-0.5">
                {ticks.map((t, idx) => (
                  <div
                    key={t}
                    className={`w-full ${idx === ticks.length - 1 ? 'border-b border-slate-300' : 'border-b border-slate-200'}`}
                  />
                ))}
              </div>

              {/* Bars Container */}
              <div className="absolute inset-0 flex items-end justify-around px-2 z-10">
                {data.map((item) => {
                  const heightPct = Math.min((item.count / maxVal) * 100, 100);
                  const isSmall = heightPct < 15;
                  return (
                    <div
                      key={item.label}
                      className="flex-1 max-w-[54px] mx-1 h-full flex items-end justify-center group"
                    >
                      <div
                        className="w-full bg-[#1b8be8] hover:bg-[#0176d3] transition-all duration-300 flex items-center justify-center relative cursor-pointer"
                        style={{ height: `${Math.max(heightPct, item.count > 0 ? 4 : 0)}%` }}
                        title={`${item.label}: ${item.count}`}
                      >
                        {item.count > 0 && (
                          <span
                            className={`text-slate-900 text-[10px] sm:text-[11px] font-bold select-none ${
                              isSmall ? 'absolute -top-4.5' : ''
                            }`}
                          >
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

          {/* Bottom X-Axis: Labels & Axis Title */}
          <div className="flex">
            <div className="w-11 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-around px-2 pt-1.5">
                {data.map((item) => (
                  <div
                    key={item.label}
                    className="flex-1 max-w-[54px] mx-1 text-center text-[10px] sm:text-[11px] text-slate-700 font-medium select-none truncate"
                    title={item.label}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="text-center text-[10px] text-slate-500 font-medium pt-1 select-none">
                {xAxisLabel}
              </div>
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

// Card 7: Funnel Chart matching Salesforce Lightning "Report by Manufacturing"
function SalesforceFunnelCard({
  title = 'Report by Manufacturing',
  manufacturingData,
  reportLink = '/reports?reportId=rep-29',
  reportLinkLabel = 'View Report (Report by Manufacturing)',
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

        {/* Funnel Visual Area */}
        <div className="pt-2 pb-1 flex flex-col items-center justify-center min-h-[190px]">
          <span className="text-[11px] font-semibold text-slate-700 mb-2 select-none">
            Record Count: {manufacturingData.total}
          </span>

          {/* Trapezoid Funnel Segments */}
          <div className="w-52 space-y-1">
            {/* Unassigned (-) */}
            <div
              className="w-full bg-[#2996f5] hover:bg-blue-500 text-white text-[10px] font-bold py-2 px-3 text-center rounded-t-xs shadow-2xs transition select-none"
              style={{ clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' }}
              title={`- : ${manufacturingData.unassigned.count} (${manufacturingData.unassigned.pct}%)`}
            >
              - : {manufacturingData.unassigned.count} ({manufacturingData.unassigned.pct}%)
            </div>
            {/* Inhouse */}
            <div
              className="w-[88%] mx-auto bg-[#0176d3] hover:bg-blue-600 text-white text-[10px] font-bold py-2.5 px-3 text-center shadow-2xs transition select-none"
              style={{ clipPath: 'polygon(5% 0%, 95% 0%, 88% 100%, 12% 100%)' }}
              title={`Inhouse : ${manufacturingData.inhouse.count} (${manufacturingData.inhouse.pct}%)`}
            >
              Inhouse : {manufacturingData.inhouse.count} ({manufacturingData.inhouse.pct}%)
            </div>
            {/* CMO */}
            <div
              className="w-[74%] mx-auto bg-[#9353d3] hover:bg-purple-600 text-white text-[10px] font-bold py-2 px-3 text-center rounded-b-xs shadow-2xs transition select-none"
              style={{ clipPath: 'polygon(8% 0%, 92% 0%, 82% 100%, 18% 100%)' }}
              title={`CMO : ${manufacturingData.cmo.count} (${manufacturingData.cmo.pct}%)`}
            >
              CMO : {manufacturingData.cmo.count} ({manufacturingData.cmo.pct}%)
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-slate-600 select-none">
            <span className="font-semibold text-slate-700">Manufacturing Location</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-2xs bg-[#2996f5]" /> -
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-2xs bg-[#0176d3]" /> Inhouse
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-2xs bg-[#9353d3]" /> CMO
            </span>
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

// Card 11: Matrix Table matching Salesforce Lightning "Total Complaints SLA Report"
function SalesforceMatrixReportCard({
  title = 'Total Complaints SLA Report',
  totalCount = 0,
  reportLink = '/reports?reportId=rep-37',
  reportLinkLabel = 'View Report (Total Complaints SLA Repo...)',
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

        {/* Matrix Table */}
        <div className="pt-2 pb-1">
          <Link
            to={reportLink}
            className="text-[11px] text-[#0176d3] hover:underline font-medium block mb-2 select-none"
          >
            Alternative
          </Link>

          <div className="border border-slate-200 rounded-2xs overflow-hidden">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-2 px-3 text-left font-semibold border-r border-slate-200 select-none">
                    Confirmed or Not ↑
                  </th>
                  <th className="py-2 px-3 text-left font-semibold border-r border-slate-200 select-none">
                    SLA Status ↑
                  </th>
                  <th className="py-2 px-3 text-right font-semibold select-none">
                    Record Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-1.5 px-3 border-r border-slate-200 select-none">-</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 select-none">-</td>
                  <td className="py-1.5 px-3 text-right font-medium">{totalCount}</td>
                </tr>
                <tr className="bg-slate-50/60 font-semibold text-slate-800">
                  <td className="py-1.5 px-3 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 select-none">Subtotal</td>
                  <td className="py-1.5 px-3 text-right">{totalCount}</td>
                </tr>
                <tr className="bg-slate-100/70 font-bold text-slate-900 border-t border-slate-300">
                  <td className="py-2 px-3 border-r border-slate-200 select-none">Total</td>
                  <td className="py-2 px-3 border-r border-slate-200"></td>
                  <td className="py-2 px-3 text-right text-[#0176d3] font-bold">{totalCount}</td>
                </tr>
              </tbody>
            </table>
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
          locType:
            c.manufacturingLocation ||
            c.d2?.investigation?.manufacturingLocation ||
            c.locType ||
            null,
          locDetail:
            c.locationDetail ||
            c.d2?.investigation?.locationDetail ||
            c.manufacturingLocationDetail ||
            c.locDetail ||
            null,
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

  // Card 3: Complaint Stage wise Overview (D2, D3, D4, Closed) - dynamic from backend
  const stageData = useMemo(() => {
    const order = ['D2', 'D3', 'D4', 'Closed'];
    const counts = { D2: 0, D3: 0, D4: 0, Closed: 0 };
    filteredComplaints.forEach((c) => {
      const s = (c.stage || '').toUpperCase();
      const status = (c.status || '').toUpperCase();
      if (s === 'CLOSED' || s === 'DONE' || status === 'CLOSED' || c.stage === 'Closed') {
        counts.Closed++;
      } else if (s === 'D2' || c.stage === 'D2') {
        counts.D2++;
      } else if (s === 'D3' || c.stage === 'D3') {
        counts.D3++;
      } else if (s === 'D4' || c.stage === 'D4') {
        counts.D4++;
      }
    });
    return order.map((stage) => ({ label: stage, count: counts[stage] }));
  }, [filteredComplaints]);

  // Card 4: SBU's Wise Reports - dynamic from backend
  const sbuData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      const s = c.sbu || 'AHP-Rumicare';
      counts[s] = (counts[s] || 0) + 1;
    });
    if (Object.keys(counts).length === 0) {
      counts['AHP-Rumicare'] = 0;
    }
    return Object.entries(counts).map(([sbu, count]) => ({ label: sbu, count }));
  }, [filteredComplaints]);

  // Card 5: Inhouse Report (Location detail) - dynamic from backend
  const inhouseData = useMemo(() => {
    const counts = {
      'NRPL-Bangalore-1100': 0,
      'NRPL-Anniyalam-AHP-2000': 0,
      'NRPL-Anniyalam-HHP-2100': 0,
      'NLPL- Pithampur Indore-70...': 0,
    };
    filteredComplaints.forEach((c) => {
      const detail = (c.locDetail || '').toLowerCase().trim();
      const mfg = (c.locType || '').toLowerCase().trim();

      let matched = null;
      if (detail.includes('bangalore') || detail.includes('1100')) {
        matched = 'NRPL-Bangalore-1100';
      } else if (detail.includes('anniyalam-ahp') || (detail.includes('anniyalam') && !detail.includes('hhp')) || detail.includes('2000')) {
        matched = 'NRPL-Anniyalam-AHP-2000';
      } else if (detail.includes('anniyalam-hhp') || detail.includes('2100')) {
        matched = 'NRPL-Anniyalam-HHP-2100';
      } else if (detail.includes('pithampur') || detail.includes('indore') || detail.includes('7000') || detail.includes('70')) {
        matched = 'NLPL- Pithampur Indore-70...';
      } else if (mfg === 'inhouse' || mfg.includes('inhouse') || detail.startsWith('nrpl') || detail.startsWith('nlpl')) {
        matched = 'NRPL-Bangalore-1100';
      }

      if (matched && counts[matched] !== undefined) {
        counts[matched]++;
      }
    });
    const order = [
      'NRPL-Bangalore-1100',
      'NRPL-Anniyalam-AHP-2000',
      'NRPL-Anniyalam-HHP-2100',
      'NLPL- Pithampur Indore-70...',
    ];
    return order.map((loc) => ({ label: loc, count: counts[loc] || 0 }));
  }, [filteredComplaints]);

  // Card 6: CMO Wise Report (Location detail) - dynamic from backend
  const cmoData = useMemo(() => {
    const counts = {
      'Shamanur pharma-3033': 0,
      'JCK-3004': 0,
      'Harshavardhan-4200': 0,
      'Indus spray-3003': 0,
      'Venkat pharma-3007': 0,
    };
    filteredComplaints.forEach((c) => {
      const detail = (c.locDetail || '').toLowerCase().trim();
      const mfg = (c.locType || '').toLowerCase().trim();

      let matched = null;
      if (detail.includes('shamanur') || detail.includes('3033')) {
        matched = 'Shamanur pharma-3033';
      } else if (detail.includes('jck') || detail.includes('3004')) {
        matched = 'JCK-3004';
      } else if (detail.includes('harshavardhan') || detail.includes('4200')) {
        matched = 'Harshavardhan-4200';
      } else if (detail.includes('indus') || detail.includes('3003')) {
        matched = 'Indus spray-3003';
      } else if (detail.includes('venkat') || detail.includes('3007')) {
        matched = 'Venkat pharma-3007';
      } else if (mfg === 'cmo' || mfg.includes('cmo')) {
        matched = 'Shamanur pharma-3033';
      }

      if (matched && counts[matched] !== undefined) {
        counts[matched]++;
      }
    });
    const order = [
      'Shamanur pharma-3033',
      'JCK-3004',
      'Harshavardhan-4200',
      'Indus spray-3003',
      'Venkat pharma-3007',
    ];
    return order.map((loc) => ({ label: loc, count: counts[loc] || 0 }));
  }, [filteredComplaints]);

  // Card 7: Report by Manufacturing (Funnel: [-], Inhouse, CMO) - dynamic from backend
  const manufacturingData = useMemo(() => {
    let unassigned = 0;
    let inhouse = 0;
    let cmo = 0;
    filteredComplaints.forEach((c) => {
      if (c.locType === 'Inhouse') inhouse++;
      else if (c.locType === 'CMO') cmo++;
      else unassigned++;
    });
    const total = filteredComplaints.length;
    const safeTotal = total || 1;
    return {
      total,
      unassigned: { count: unassigned, pct: ((unassigned / safeTotal) * 100).toFixed(2) },
      inhouse: { count: inhouse, pct: ((inhouse / safeTotal) * 100).toFixed(2) },
      cmo: { count: cmo, pct: ((cmo / safeTotal) * 100).toFixed(2) },
    };
  }, [filteredComplaints]);

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
        {monthData.length === 0 ? (
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
              <div className="py-16 flex items-center justify-center min-h-[190px]">
                <span className="text-xs text-slate-400 font-normal">No chart data.</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <Link to="/reports?reportId=rep-35" className="text-[#0176d3] hover:underline font-medium">
                View Report (No of Current Complaints ...)
              </Link>
              <span>As of {asOfDate}, {lastRefreshed}</span>
            </div>
          </div>
        ) : (
          <SalesforceHorizontalBarCard
            title="No of Current Complaints Month wise"
            yAxisLabel="Created Month"
            xAxisLabel="Record Count"
            data={monthData}
            reportLink="/reports?reportId=rep-35"
            reportLinkLabel="View Report (No of Current Complaints ...)"
            asOfDate={asOfDate}
            lastRefreshed={lastRefreshed}
            onRefresh={fetchLiveComplaints}
          />
        )}

        {/* ========================================================
            CARD 2: Complaints by Type of Failure
           ======================================================== */}
        {failureData.length === 0 ? (
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
              <div className="py-16 flex items-center justify-center min-h-[190px]">
                <span className="text-xs text-slate-400 font-normal">No chart data.</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <Link to="/reports?reportId=rep-36" className="text-[#0176d3] hover:underline font-medium">
                View Report (Complaints by Type of Fail...)
              </Link>
              <span>As of {asOfDate}, {lastRefreshed}</span>
            </div>
          </div>
        ) : (
          <SalesforceHorizontalBarCard
            title="Complaints by Type of Failure"
            yAxisLabel="Type of Failure"
            xAxisLabel="Record Count"
            data={failureData}
            reportLink="/reports?reportId=rep-36"
            reportLinkLabel="View Report (Complaints by Type of Fail...)"
            asOfDate={asOfDate}
            lastRefreshed={lastRefreshed}
            onRefresh={fetchLiveComplaints}
          />
        )}

        {/* ========================================================
            CARD 3: Complaint Stage wise Overview (Salesforce Vertical Bar Chart)
           ======================================================== */}
        <SalesforceVerticalBarCard
          title="Complaint Stage wise Overview"
          yAxisLabel="Record Count"
          xAxisLabel="Stage"
          defaultTicks={[28, 21, 14, 7, 0]}
          defaultMax={28}
          data={stageData}
          reportLink="/reports?reportId=rep-33"
          reportLinkLabel="View Report (Complaint Stage wise Over...)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 4: SBU's Wise Reports (Salesforce Vertical Bar Chart)
           ======================================================== */}
        <SalesforceVerticalBarCard
          title="SBU's Wise Reports"
          yAxisLabel="Record Count"
          xAxisLabel="SBU"
          defaultTicks={[20, 15, 10, 5, 0]}
          defaultMax={20}
          data={sbuData}
          reportLink="/reports?reportId=rep-34"
          reportLinkLabel="View Report (SBU's Wise Reports)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 5: Inhouse Report (Salesforce Horizontal Bar Chart)
           ======================================================== */}
        <SalesforceHorizontalBarCard
          title="Inhouse Report"
          yAxisLabel="Location detail"
          xAxisLabel="Record Count"
          defaultTicks={[0, 5, 10, 15]}
          defaultMax={15}
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
          defaultTicks={[0, 1, 2, 3, 4]}
          defaultMax={4}
          data={cmoData}
          reportLink="/reports?reportId=rep-28"
          reportLinkLabel="View Report (CMO Wise Report)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 7: Report by Manufacturing (Salesforce Funnel Chart)
           ======================================================== */}
        <SalesforceFunnelCard
          title="Report by Manufacturing"
          manufacturingData={manufacturingData}
          reportLink="/reports?reportId=rep-29"
          reportLinkLabel="View Report (Report by Manufacturing)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 8: Complaint Raised by (Salesforce Horizontal Bar Chart)
           ======================================================== */}
        <SalesforceHorizontalBarCard
          title="Complaint Raised by"
          yAxisLabel="Complaint: Created By"
          xAxisLabel="Record Count"
          defaultTicks={[0, 10, 20, 30]}
          defaultMax={30}
          data={raisedByData}
          reportLink="/reports?reportId=rep-30"
          reportLinkLabel="View Report (Complaint Raised By)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 9: Product Wise Complaints (Salesforce Horizontal Bar Chart)
           ======================================================== */}
        <SalesforceHorizontalBarCard
          title="Product Wise Complaints"
          yAxisLabel="Product name"
          xAxisLabel="Record Count"
          defaultTicks={[0, 1, 2, 3, 4, 5, 6]}
          defaultMax={6}
          data={productData}
          reportLink="/reports?reportId=rep-31"
          reportLinkLabel="View Report (Product Wise Complaints)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 10: Customer Wise Complaints (Salesforce Horizontal Bar Chart)
           ======================================================== */}
        <SalesforceHorizontalBarCard
          title="Customer Wise Complaints"
          yAxisLabel="Distributor / Retailer Name"
          xAxisLabel="Record Count"
          defaultTicks={[0, 0.5, 1, 1.5, 2, 2.5, 3]}
          defaultMax={3}
          data={customerData}
          reportLink="/reports?reportId=rep-32"
          reportLinkLabel="View Report (Customer Wise Complaints)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />

        {/* ========================================================
            CARD 11: Total Complaints SLA Report (Salesforce Matrix Table)
           ======================================================== */}
        <SalesforceMatrixReportCard
          title="Total Complaints SLA Report"
          totalCount={slaData.total}
          reportLink="/reports?reportId=rep-37"
          reportLinkLabel="View Report (Total Complaints SLA Repo...)"
          asOfDate={asOfDate}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchLiveComplaints}
        />
      </div>
    </div>
  );
}
