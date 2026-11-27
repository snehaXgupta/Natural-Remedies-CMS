import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Settings,
  Folder,
  FileText,
  FileSpreadsheet,
  Star,
  Download,
  X,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Filter,
  Pencil,
  RotateCw,
  ArrowLeft,
  Trash2,
  Layers,
  Copy,
  Check,
  Undo2,
  Redo2,
  GripVertical,
  Plus,
  SlidersHorizontal,
  Play,
  Save,
  HelpCircle,
  Eye,
  Info,
  Maximize2,
} from 'lucide-react';
import { reportApi, complaintApi } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';

// ============================================================================
// MASTER AVAILABLE FIELDS (Exact Salesforce Lightning Schema)
// ============================================================================
export const AVAILABLE_FIELDS = [
  { id: 'complaintNo', label: 'Complaint: Complaint No', type: 'link', category: 'Identification' },
  { id: 'manufacturingLocation', label: 'Manufacturing Location', type: 'text', category: 'Manufacturing' },
  { id: 'locationDetail', label: 'Location detail', type: 'text', category: 'Manufacturing' },
  { id: 'contactPerson', label: 'Contact Person', type: 'text', category: 'Origin' },
  { id: 'financialYear', label: 'FinancialYear', type: 'text', category: 'Intake' },
  { id: 'productName', label: 'Product name', type: 'text', category: 'Product' },
  { id: 'distributor', label: 'Distributor / Retailer Name', type: 'text', category: 'Customer' },
  { id: 'requestedBy', label: 'Requested By', type: 'text', category: 'Origin' },
  { id: 'createdDate', label: 'Complaint: Created Date', type: 'date', category: 'Intake' },
  { id: 'createdMonthYear', label: 'Created Month & Year', type: 'text', category: 'Intake' },
  { id: 'stage', label: 'Stage', type: 'badge', category: 'Status' },
  { id: 'status', label: 'Status', type: 'status_badge', category: 'Status' },
  { id: 'category', label: 'Nature / Category', type: 'text', category: 'Quality' },
  { id: 'batchNumber', label: 'Batch Number', type: 'mono', category: 'Product' },
  { id: 'typeOfFailure', label: 'Type of Failure', type: 'text', category: 'Investigation' },
  { id: 'acknowledgement', label: 'Acknowledgement', type: 'text', category: 'Workflow' },
  { id: 'assignedFrp', label: 'Assigned FRP', type: 'text', category: 'Workflow' },
  { id: 'daysOpen', label: 'Days Open', type: 'text', category: 'Turnaround' },
  { id: 'd1Sla', label: 'D1 SLA', type: 'sla_dot', category: 'SLA Tracking' },
  { id: 'd1Duration', label: 'D1 Duration', type: 'duration', category: 'SLA Tracking' },
  { id: 'd1Status', label: 'D1 Completion Status', type: 'text', category: 'SLA Tracking' },
  { id: 'd2Sla', label: 'D2 SLA', type: 'sla_dot', category: 'SLA Tracking' },
  { id: 'd2Duration', label: 'D2 Duration', type: 'duration', category: 'SLA Tracking' },
  { id: 'd2Status', label: 'D2 Completion Status', type: 'text', category: 'SLA Tracking' },
  { id: 'totalDaysTaken', label: 'Total Days taken Including all Stages', type: 'number', category: 'SLA Tracking' },
  { id: 'd3Sla', label: 'D3 SLA (36h)', type: 'sla_dot', category: 'SLA Tracking' },
  { id: 'd3Duration', label: 'D3 Duration', type: 'duration', category: 'SLA Tracking' },
  { id: 'd3Status', label: 'D3 Status', type: 'text', category: 'SLA Tracking' },
  { id: 'overallSla', label: 'Overall SLA Status', type: 'sla_dot', category: 'SLA Tracking' },
];

export const AVAILABLE_GROUP_FIELDS = [
  { id: 'slaStatus', label: 'SLA Status' },
  { id: 'manufacturingLocation', label: 'Manufacturing Location' },
  { id: 'locationDetail', label: 'Location detail' },
  { id: 'createdMonthYear', label: 'Complaint: Created Date (Month/Year)' },
  { id: 'requestedBy', label: 'Requested By' },
  { id: 'productName', label: 'Product name' },
  { id: 'distributor', label: 'Distributor / Retailer Name' },
  { id: 'stage', label: 'Stage' },
  { id: 'status', label: 'Status' },
  { id: 'typeOfFailure', label: 'Type of Failure' },
  { id: 'category', label: 'Nature / Category' },
];

// Salesforce Lightning Report Chart Component (matching exact Salesforce SLDS reference)
function ReportVisualChart({ report, chartData, groupFieldLabel = 'Stage', chartType = 'vertical' }) {
  if (!chartData || chartData.length === 0) return null;

  const maxInArray = Math.max(...chartData.map((d) => d.count || 0), 0);
  const step = Math.max(Math.ceil(maxInArray / 3), 1);
  const maxTick = Math.max(step * 3, 3);
  const ticks = [maxTick, step * 2, step, 0];

  if (chartType === 'horizontal') {
    const defaultTicks = [0, step, step * 2, maxTick];
    return (
      <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-3 animate-in fade-in">
        <div className="max-w-4xl mx-auto">
          {/* Top Axis: Record Count */}
          <div className="flex items-end mb-1">
            <div className="w-[150px] shrink-0" />
            <div className="flex-1 relative">
              <div className="text-center text-[10px] text-slate-500 font-medium mb-1 select-none">
                Record Count
              </div>
              <div className="relative h-3.5 text-[10px] text-slate-500 font-normal select-none">
                {defaultTicks.map((t) => {
                  const pct = (t / maxTick) * 100;
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
            <div className="w-5 shrink-0 flex items-center justify-center">
              <span
                className="text-[10px] text-slate-500 font-normal whitespace-nowrap select-none"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                {groupFieldLabel}
              </span>
            </div>

            <div className="w-[130px] shrink-0 flex flex-col justify-around pr-2 text-right">
              {chartData.map((item, idx) => (
                <div
                  key={idx}
                  className="h-7 flex items-center justify-end text-[11px] text-slate-700 truncate"
                  title={item.label}
                >
                  {item.label}
                </div>
              ))}
            </div>

            <div className="flex-1 relative border-l border-slate-400 flex flex-col justify-around py-0.5 min-h-[90px]">
              <div className="absolute inset-0 pointer-events-none">
                {defaultTicks.map((t) => {
                  if (t === 0) return null;
                  const pct = (t / maxTick) * 100;
                  return (
                    <div
                      key={t}
                      className="absolute top-0 bottom-0 border-r border-slate-200"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}
              </div>

              {chartData.map((item, idx) => {
                const widthPct = Math.min((item.count / maxTick) * 100, 100);
                return (
                  <div key={idx} className="relative h-7 flex items-center z-10">
                    <div
                      className="bg-[#1b8be8] hover:bg-[#0176d3] h-5 flex items-center justify-end transition-all duration-300"
                      style={{ width: `${Math.max(widthPct, item.count > 0 ? 5 : 0)}%` }}
                      title={`${item.label}: ${item.count}`}
                    >
                      {item.count > 0 && (
                        <span className="text-white text-[10px] font-bold pr-1.5 leading-none select-none">
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
    );
  }

  // Vertical Bar Chart (Exact match to Salesforce reference in media_1795696001096_242c8217.jpg)
  return (
    <div className="bg-white border-b border-slate-200 px-6 pt-5 pb-3 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="flex">
          {/* Far Left: Rotated Y-Axis Label "Record Count" */}
          <div className="w-5 shrink-0 flex items-center justify-center">
            <span
              className="text-[10px] text-slate-500 font-normal whitespace-nowrap select-none"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              Record Count
            </span>
          </div>

          {/* Y-Axis Tick Numbers */}
          <div className="w-7 shrink-0 flex flex-col justify-between items-end pr-2 h-44 text-[10px] text-slate-500 font-normal select-none py-0.5">
            {ticks.map((t) => (
              <span key={t} className="leading-none">{t}</span>
            ))}
          </div>

          {/* Plot Area with Horizontal Gridlines & Vertical Bars */}
          <div className="flex-1 relative h-44 border-b border-slate-300">
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
            <div className="absolute inset-0 flex items-end justify-around px-4 z-10">
              {chartData.map((item) => {
                const heightPct = Math.min((item.count / maxTick) * 100, 100);
                const isSmall = heightPct < 15;
                return (
                  <div
                    key={item.label}
                    className="flex-1 max-w-[76px] mx-2 h-full flex items-end justify-center group"
                  >
                    <div
                      className="w-full bg-[#1b8be8] hover:bg-[#0176d3] transition-all duration-300 flex items-center justify-center relative cursor-pointer"
                      style={{ height: `${Math.max(heightPct, item.count > 0 ? 5 : 0)}%` }}
                      title={`${item.label}: ${item.count}`}
                    >
                      {item.count > 0 && (
                        <span
                          className={`text-slate-900 text-[11px] font-bold select-none ${
                            isSmall ? 'absolute -top-4.5' : 'text-white'
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
          <div className="w-12 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-around px-4 pt-1.5">
              {chartData.map((item) => (
                <div
                  key={item.label}
                  className="flex-1 max-w-[76px] mx-2 text-center text-[11px] text-slate-700 font-medium select-none truncate"
                  title={item.label}
                >
                  {item.label}
                </div>
              ))}
            </div>
            <div className="text-center text-[10px] text-slate-500 font-medium pt-1 select-none">
              {groupFieldLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Salesforce Lightning Checkbox Toggle Switch (matching exact Salesforce SLDS reference)
function SalesforceToggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
      <span className="text-[11px] font-normal text-slate-700 whitespace-nowrap">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-[#0176d3]' : 'bg-[#b0adab]'
        }`}
      >
        {checked && (
          <span className="absolute left-1 text-[8px] font-bold text-white select-none pointer-events-none leading-none">
            ✓
          </span>
        )}
        <span
          className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-xs transform transition duration-200 ease-in-out ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function getDefaultColumnsForReport(repId, repName) {
  const n = (repName || '').toLowerCase().trim();
  // Exact Salesforce Schema for Report by Manufacturing (Screenshot confirmed)
  if (n === 'report by manufacturing' || repId === 'rep-29') {
    return ['complaintNo', 'contactPerson', 'financialYear'];
  }
  // Exact Salesforce Schema for Non - Confirmed: Complaints SLA Reports (Screenshot confirmed)
  if (
    n === 'non - confirmed: complaints sla reports' ||
    n.includes('non - confirmed: complaints sla') ||
    n.includes('non-confirmed: complaints sla') ||
    repId === 'rep-18'
  ) {
    return [
      'complaintNo',
      'd1Sla',
      'd1Duration',
      'd1Status',
      'd2Sla',
      'd2Duration',
      'd2Status',
      'totalDaysTaken',
    ];
  }
  // Exact Salesforce Schema for Non - Confirmed Complaints (Screenshot confirmed)
  if (n === 'non - confirmed complaints' || n === 'non-confirmed complaints' || repId === 'rep-13') {
    return ['complaintNo', 'distributor', 'productName'];
  }
  // Exact Salesforce Schema for Complaints Closed within SLA (Screenshot confirmed)
  if (n === 'complaints closed within sla' || repId === 'rep-14') {
    return ['complaintNo', 'productName', 'distributor'];
  }
  if (n.includes('inhouse') || n.includes('cmo')) {
    return ['complaintNo', 'contactPerson', 'financialYear'];
  }
  if (n.includes('manufacturing')) {
    return ['complaintNo', 'contactPerson', 'financialYear'];
  }
  if (n.includes('sla')) {
    return [
      'complaintNo',
      'productName',
      'distributor',
      'd1Sla',
      'd1Duration',
      'd2Sla',
      'd2Duration',
      'd3Sla',
      'd3Duration',
      'overallSla',
    ];
  }
  if (n.includes('raised by')) {
    return ['requestedBy', 'complaintNo', 'productName', 'createdDate', 'stage', 'status'];
  }
  if (n.includes('product wise')) {
    return ['productName', 'complaintNo', 'batchNumber', 'stage', 'status'];
  }
  if (n.includes('customer wise')) {
    return ['distributor', 'complaintNo', 'productName', 'requestedBy', 'createdDate', 'status'];
  }
  if (n.includes('stage')) {
    return ['stage', 'complaintNo', 'productName', 'daysOpen', 'status'];
  }
  if (n.includes('failure')) {
    return ['complaintNo', 'productName', 'typeOfFailure', 'manufacturingLocation', 'stage'];
  }
  if (n.includes('efficacy')) {
    return ['complaintNo', 'productName', 'category', 'batchNumber', 'stage', 'daysOpen'];
  }
  return ['requestedBy', 'complaintNo', 'productName', 'createdDate', 'stage', 'status'];
}

function getDefaultGroupByForReport(repId, repName) {
  const n = (repName || '').toLowerCase().trim();
  if (n === 'report by manufacturing' || repId === 'rep-29') {
    return ['manufacturingLocation', 'locationDetail'];
  }
  if (n === 'inhouse report' || repId === 'rep-27') {
    return ['locationDetail'];
  }
  if (n === 'cmo wise report' || repId === 'rep-28') {
    return ['locationDetail'];
  }
  if (
    n === 'non - confirmed: complaints sla reports' ||
    n.includes('non - confirmed: complaints sla') ||
    n.includes('non-confirmed: complaints sla') ||
    repId === 'rep-18'
  ) {
    return ['slaStatus'];
  }
  if (n === 'non - confirmed complaints' || n === 'non-confirmed complaints' || repId === 'rep-13') {
    return ['requestedBy'];
  }
  if (n === 'complaints closed within sla' || repId === 'rep-14') {
    return [];
  }
  if (n.includes('raised by')) return ['requestedBy'];
  if (n.includes('product wise')) return ['productName'];
  if (n.includes('customer wise')) return ['distributor'];
  if (n.includes('stage')) return ['stage'];
  return ['createdMonthYear'];
}

// ============================================================================
// OFFICIAL NARAYAN RAO VAKAMUDI COMPLAINT REPORTS (36 ITEMS)
// ============================================================================
const NARAYAN_RAO_REPORTS = [
  // 1. Screenshot Report 1
  {
    id: 'rep-1',
    name: 'Avg. Days required to Close Complaint',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '8/1/2024, 3:17 pm',
    subscribed: false,
    type: 'turnaround-close',
  },
  // 2. Screenshot Report 2
  {
    id: 'rep-2',
    name: 'Avg.Days Open Efficacy',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:20 pm',
    subscribed: false,
    type: 'efficacy-open-days',
  },
  // 3. Screenshot Report 3
  {
    id: 'rep-3',
    name: 'Avg.Days Open Non Efficacy',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:08 pm',
    subscribed: false,
    type: 'non-efficacy-open-days',
  },
  // 4. Screenshot Report 4
  {
    id: 'rep-4',
    name: 'Reduction in Total Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '27/3/2023, 7:46 pm',
    subscribed: false,
    type: 'complaint-reduction',
  },
  // 5. Screenshot Report 5
  {
    id: 'rep-5',
    name: 'Open and Closed Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '16/3/2023, 11:49 am',
    subscribed: false,
    type: 'open-closed-overview',
  },
  // 6. Screenshot Report 6
  {
    id: 'rep-6',
    name: 'Complaints Current Year Vs Previous Year',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '14/3/2023, 12:10 pm',
    subscribed: false,
    type: 'current-vs-previous-year',
  },
  // 12. Screenshot Report 12 (Efficacy Related)
  {
    id: 'rep-12',
    name: 'No. Of Efficacy Related Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '20/9/2023, 4:06 pm',
    subscribed: false,
    type: 'efficacy-count',
  },
  // 13. User Report 1
  {
    id: 'rep-13',
    name: 'Non - Confirmed Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '8/1/2024, 3:17 pm',
    subscribed: false,
    type: 'non-confirmed',
    columns: ['complaintNo', 'distributor', 'productName'],
    groupBy: ['requestedBy'],
  },
  // 14. User Report 2
  {
    id: 'rep-14',
    name: 'Complaints Closed within SLA',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:20 pm',
    subscribed: false,
    type: 'closed-sla',
    columns: ['complaintNo', 'productName', 'distributor'],
    groupBy: [],
  },
  // 15. User Report 3
  {
    id: 'rep-15',
    name: 'No of Previous Complaints Year',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '14/3/2023, 12:10 pm',
    subscribed: false,
    type: 'prev-year-total',
  },
  // 16. User Report 4
  {
    id: 'rep-16',
    name: 'Complaints Not Closed within SLA',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '27/3/2023, 7:46 pm',
    subscribed: false,
    type: 'overdue-sla',
  },
  // 17. User Report 5
  {
    id: 'rep-17',
    name: 'Reduction in repeated Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '16/3/2023, 11:49 am',
    subscribed: false,
    type: 'recurrence-reduction',
  },
  // 18. User Report 6
  {
    id: 'rep-18',
    name: 'Non - Confirmed: Complaints SLA Reports',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:08 pm',
    subscribed: false,
    type: 'non-confirmed-sla',
    columns: [
      'complaintNo',
      'd1Sla',
      'd1Duration',
      'd1Status',
      'd2Sla',
      'd2Duration',
      'd2Status',
      'totalDaysTaken',
    ],
    groupBy: ['slaStatus'],
  },
  // 19. User Report 7
  {
    id: 'rep-19',
    name: 'No of Previous Year Complaints Month wise',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '20/9/2023, 4:06 pm',
    subscribed: false,
    type: 'prev-year-monthly',
  },
  // 20. User Report 8
  {
    id: 'rep-20',
    name: 'Confirmed : Complaints SLA Reports',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:20 pm',
    subscribed: false,
    type: 'confirmed-sla',
  },
  // 21. Screenshot Extract 1
  {
    id: 'rep-21',
    name: 'Avg.Days required to Close Efficacy Comp',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '19/1/2024, 11:59 am',
    subscribed: false,
    type: 'avg-close-efficacy',
  },
  // 22. Screenshot Extract 2
  {
    id: 'rep-22',
    name: 'Confirmed Or Not-Confirmed Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '16/3/2023, 11:51 am',
    subscribed: false,
    type: 'confirmed-or-not-confirmed',
  },
  // 23. Screenshot Extract 3
  {
    id: 'rep-23',
    name: 'Open Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '27/3/2023, 7:36 pm',
    subscribed: false,
    type: 'open-complaints',
  },
  // 24. Screenshot Extract 4
  {
    id: 'rep-24',
    name: 'Closed Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '16/3/2023, 11:47 am',
    subscribed: false,
    type: 'closed-complaints',
  },
  // 25. Screenshot Extract 5
  {
    id: 'rep-25',
    name: 'Avg.Days required to Close Non Efficacy',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '19/1/2024, 12:02 pm',
    subscribed: false,
    type: 'avg-close-non-efficacy',
  },
  // 26. Screenshot Extract 6
  {
    id: 'rep-26',
    name: 'Holistic View of Complaint Management',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '26/3/2025, 8:40 pm',
    subscribed: false,
    type: 'holistic-view',
  },
  // 27. Screenshot Extract 7
  {
    id: 'rep-27',
    name: 'Inhouse Report',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '27/3/2023, 7:23 pm',
    subscribed: false,
    type: 'inhouse-report',
  },
  // 28. Screenshot Extract 8
  {
    id: 'rep-28',
    name: 'CMO Wise Report',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '27/3/2023, 7:27 pm',
    subscribed: false,
    type: 'cmo-wise-report',
  },
  // 29. Screenshot Extract 9
  {
    id: 'rep-29',
    name: 'Report by Manufacturing',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '14/3/2023, 12:19 pm',
    subscribed: false,
    type: 'manufacturing-report',
    columns: ['complaintNo', 'contactPerson', 'financialYear'],
    groupBy: ['manufacturingLocation', 'locationDetail'],
  },
  // 30. Screenshot Extract 10
  {
    id: 'rep-30',
    name: 'Complaint Raised By',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '14/3/2023, 12:23 pm',
    subscribed: false,
    type: 'raised-by-breakdown',
  },
  // 31. Screenshot Extract 11
  {
    id: 'rep-31',
    name: 'Product Wise Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '14/3/2023, 12:15 pm',
    subscribed: false,
    type: 'product-wise-all',
  },
  // 32. Screenshot Extract 12
  {
    id: 'rep-32',
    name: 'Customer Wise Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '14/3/2023, 11:58 am',
    subscribed: false,
    type: 'customer-wise',
  },
  // 33. Screenshot Extract 13
  {
    id: 'rep-33',
    name: 'Complaint Stage wise Overview',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '10/8/2023, 10:59 am',
    subscribed: false,
    type: 'stage-wise-overview',
    columns: ['complaintNo', 'productName', 'daysOpen', 'status'],
    groupBy: ['stage'],
  },
  // 34. Screenshot Extract 14
  {
    id: 'rep-34',
    name: "SBU's Wise Reports",
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '30/3/2023, 2:27 pm',
    subscribed: false,
    type: 'sbu-wise-report',
  },
  // 35. Screenshot Extract 15
  {
    id: 'rep-35',
    name: 'No of Current Complaints Month wise',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '27/3/2023, 6:34 pm',
    subscribed: false,
    type: 'current-complaints-month-wise',
  },
  // 36. Screenshot Extract 16
  {
    id: 'rep-36',
    name: 'Complaints by Type of Failure',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '20/9/2023, 3:59 pm',
    subscribed: false,
    type: 'type-of-failure-breakdown',
  },
  // 37. Screenshot Extract 17
  {
    id: 'rep-37',
    name: 'Total Complaints SLA Report',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '2/2/2024, 5:20 pm',
    subscribed: false,
    type: 'total-sla-report',
  },
];

const AUGMENTED_REPORTS = NARAYAN_RAO_REPORTS.map((r) => {
  const defaultCols = getDefaultColumnsForReport(r.id, r.name);
  const defaultGroup = getDefaultGroupByForReport(r.id, r.name);
  return {
    ...r,
    columns: r.columns || defaultCols,
    groupBy: r.groupBy !== undefined ? r.groupBy : defaultGroup,
    filters: r.filters || {
      showMe: 'all',
      dateRange: 'all',
      status: 'all',
      category: 'all',
      manufacturing: 'all',
    },
  };
});

// ============================================================================
// EXACT SLA CALCULATION ENGINE
// Rules Confirmed by Quality Head:
// - D1 SLA: 9 working hours (1 working day) -> <= 9h is With in SLA, > 9h is Not in SLA
// - D2 SLA: 9 working hours (1 working day) -> <= 9h is With in SLA, > 9h is Not in SLA
// - D3 SLA: 36 working hours (4 working days) -> <= 36h is With in SLA, > 36h is Not in SLA
// ============================================================================
function calculateStageSla(startTime, endTime, targetHours, isCompleted) {
  if (!startTime) {
    return { statusText: 'Pending', duration: '—', inSla: true, dot: 'gray', completed: false };
  }
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const durationStr = `${days}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const diffHours = diffMs / (1000 * 60 * 60);
  const inSla = diffHours <= targetHours;

  return {
    duration: durationStr,
    inSla,
    dot: inSla ? 'green' : 'red',
    statusText: inSla ? 'With in SLA' : 'Not in SLA',
    completed: Boolean(isCompleted || endTime),
    hoursVal: diffHours,
  };
}

// Intelligent Report Filtering Engine
function getCategoryFilteredComplaints(report, pool) {
  if (!report) return pool;
  const n = (report.name || '').toLowerCase().trim();
  const f = report.filters || {};

  let filtered = [...pool];

  // Apply Custom Report Builder Filters
  if (f.status === 'open') {
    filtered = filtered.filter((c) => c.status === 'Open');
  } else if (f.status === 'closed') {
    filtered = filtered.filter((c) => c.status === 'Closed');
  }

  if (f.category === 'efficacy') {
    filtered = filtered.filter((c) => c.category === 'Efficacy');
  } else if (f.category === 'non-efficacy') {
    filtered = filtered.filter((c) => c.category === 'Non-Efficacy');
  }

  if (f.manufacturing === 'inhouse') {
    filtered = filtered.filter((c) => c.manufacturingLocation === 'Inhouse');
  } else if (f.manufacturing === 'cmo') {
    filtered = filtered.filter((c) => c.manufacturingLocation === 'CMO');
  }

  // Semantic Report Classification Filter
  if (
    (n.includes('non - confirmed') || n.includes('non-confirmed')) &&
    !n.includes('confirmed or not-confirmed')
  ) {
    filtered = filtered.filter((c) => c.isConfirmed === false);
  } else if (n.includes('closed within sla') && !n.includes('not closed')) {
    filtered = filtered.filter((c) => c.isClosed && c.isClosedWithinSla);
  } else if (n.includes('not closed within sla') || n.includes('not closed')) {
    filtered = filtered.filter((c) => c.isOverdue || (!c.isClosedWithinSla && c.isClosed));
  } else if (n === 'open complaints' || n.startsWith('open complaints')) {
    filtered = filtered.filter((c) => c.status === 'Open');
  } else if (n === 'closed complaints' || n.startsWith('closed complaints')) {
    filtered = filtered.filter((c) => c.status === 'Closed');
  } else if (n.includes('days required to close complaint') || n.includes('close complaint')) {
    filtered = filtered.filter((c) => c.status === 'Closed');
  } else if (n.includes('open efficacy')) {
    filtered = filtered.filter((c) => c.status === 'Open' && c.category === 'Efficacy');
  } else if (n.includes('open non efficacy') || n.includes('open non-efficacy')) {
    filtered = filtered.filter((c) => c.status === 'Open' && c.category === 'Non-Efficacy');
  } else if (n.includes('close efficacy')) {
    filtered = filtered.filter((c) => c.status === 'Closed' && c.category === 'Efficacy');
  } else if (n.includes('close non efficacy') || n.includes('close non-efficacy')) {
    filtered = filtered.filter((c) => c.status === 'Closed' && c.category === 'Non-Efficacy');
  } else if (n.includes('efficacy related') || n.includes('no. of efficacy')) {
    filtered = filtered.filter((c) => c.category === 'Efficacy');
  } else if (n.includes('rumicare')) {
    const rumiPool = filtered.filter((c) => (c.productName || '').toLowerCase().includes('rumicare'));
    if (n.includes('type of failure')) {
      filtered = rumiPool.filter((c) => c.typeOfFailure);
    } else if (n.includes('raised by')) {
      filtered = rumiPool.filter((c) => c.distributor || c.requestedBy);
    } else {
      filtered = rumiPool;
    }
  } else if (n.includes('inhouse')) {
    filtered = filtered.filter((c) => c.manufacturingLocation === 'Inhouse');
  } else if (n.includes('cmo')) {
    filtered = filtered.filter((c) => c.manufacturingLocation === 'CMO');
  } else if (n.includes('report by manufacturing')) {
    filtered = filtered.filter((c) => c.manufacturingLocation === 'Inhouse' || c.manufacturingLocation === 'CMO');
  } else if (n.includes('repeated') || n.includes('repeat')) {
    filtered = filtered.filter((c) => c.isRepeat === true);
  } else if (n.includes('confirmed : complaints sla') || (n.includes('confirmed') && n.includes('sla'))) {
    filtered = filtered.filter((c) => c.isConfirmed === true);
  } else if (n.includes('type of failure')) {
    filtered = filtered.filter((c) => c.typeOfFailure);
  } else if (n.includes('customer wise')) {
    filtered = filtered.filter((c) => c.distributor && c.distributor.trim().length > 0);
  } else if (n.includes('previous') && (n.includes('year') || n.includes('month'))) {
    filtered = filtered.filter((c) => c.year === '2024' || c.year === '2025');
  } else if (n.includes('stage wise overview') || n.includes('stage-wise-overview')) {
    filtered = filtered.filter((c) => {
      const s = (c.stage || '').toUpperCase();
      const status = (c.status || '').toUpperCase();
      // Requirement: In Complaint Stage wise Overview report, only stages D1, D2, D3, D4 (NO Closed)
      if (s === 'CLOSED' || status === 'CLOSED' || c.isClosed) return false;
      return true;
    });
  } else if (n.includes('current complaints month wise') || (n.includes('current') && n.includes('month'))) {
    filtered = filtered.filter((c) => c.year === '2026');
  }

  return filtered;
}

const EXCLUDED_REPORT_IDS = new Set(['rep-7', 'rep-8', 'rep-9', 'rep-10', 'rep-11']);
const isExcludedReport = (r) => {
  if (!r) return true;
  if (EXCLUDED_REPORT_IDS.has(r.id)) return true;
  const creator = (r.createdBy || '').toLowerCase().trim();
  // Strictly enforce: Only reports where Created By is Narayan Rao Vakamudi
  if (creator && !creator.includes('narayan')) return true;
  const n = (r.name || '').trim().toLowerCase();
  return (
    n === 'complaint raised by rumicare' ||
    n === 'complaint stage wise overview rumicare' ||
    n === 'complaints current vs previous rumicare' ||
    n === 'current complaints month wise rumicare' ||
    n === 'type of failure - rumicare complaints' ||
    n === 'type of failure rumicare complaints' ||
    n.includes('omnicare') ||
    n.includes('rca members attendance')
  );
};

export function ReportsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState(() => {
    try {
      const saved = localStorage.getItem('vetaura_reports_definitions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed
            .filter((p) => !isExcludedReport(p))
            .map((p) => {
              // Ensure rep-29 and screenshot reports are always synchronized to exact screenshot columns
              if (p.id === 'rep-29' || (p.name && p.name.toLowerCase() === 'report by manufacturing')) {
                return {
                  ...p,
                  columns: ['complaintNo', 'contactPerson', 'financialYear'],
                  groupBy: ['manufacturingLocation', 'locationDetail'],
                };
              }
              if (p.id === 'rep-13' || (p.name && p.name.toLowerCase().includes('non - confirmed complaints'))) {
                return {
                  ...p,
                  columns: ['complaintNo', 'distributor', 'productName'],
                  groupBy: ['requestedBy'],
                };
              }
              if (p.id === 'rep-18' || (p.name && p.name.toLowerCase().includes('non - confirmed: complaints sla'))) {
                return {
                  ...p,
                  columns: [
                    'complaintNo',
                    'd1Sla',
                    'd1Duration',
                    'd1Status',
                    'd2Sla',
                    'd2Duration',
                    'd2Status',
                    'totalDaysTaken',
                  ],
                  groupBy: ['slaStatus'],
                };
              }
              if (p.id === 'rep-19' || (p.name && p.name.toLowerCase().includes('previous year complaints month'))) {
                return {
                  ...p,
                  name: 'No of Previous Year Complaints Month wise',
                };
              }
              if (p.id === 'rep-14' || (p.name && p.name.toLowerCase().includes('closed within sla'))) {
                return {
                  ...p,
                  columns: ['complaintNo', 'productName', 'distributor'],
                  groupBy: [],
                };
              }
              if (p.id === 'rep-33' || (p.name && p.name.toLowerCase().includes('stage wise overview'))) {
                return {
                  ...p,
                  columns: ['complaintNo', 'productName', 'daysOpen', 'status'],
                  groupBy: ['stage'],
                };
              }
              return p;
            });
          const existingIds = new Set(cleaned.map((p) => p.id));
          const missing = AUGMENTED_REPORTS.filter((ar) => !existingIds.has(ar.id) && !isExcludedReport(ar));
          return [...cleaned, ...missing];
        }
      }
    } catch (_) {}
    return AUGMENTED_REPORTS.filter((ar) => !isExcludedReport(ar));
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSidebar, setActiveSidebar] = useState('all-folders');
  const [activeReport, setActiveReport] = useState(null); // Report being viewed
  const [isBuilderMode, setIsBuilderMode] = useState(false); // Salesforce Report Builder View (Edit Mode)
  const [builderDraft, setBuilderDraft] = useState(null); // Draft being edited in Builder
  const [runtimeOverrides, setRuntimeOverrides] = useState({}); // Per-report runtime overrides from "Run" (not saved)

  // Automatically open report if reportId or id query param is present
  const reportParamId = searchParams.get('reportId') || searchParams.get('id');
  useEffect(() => {
    if (reportParamId && reports.length > 0) {
      const match = reports.find(
        (r) =>
          r.id === reportParamId ||
          (r.name && r.name.toLowerCase() === reportParamId.toLowerCase()) ||
          (r.type && r.type.toLowerCase() === reportParamId.toLowerCase())
      );
      if (match) {
        setActiveReport(match);
        const isStageWise = match.id === 'rep-33' || (match.name && match.name.toLowerCase().includes('stage wise overview'));
        setShowChart(Boolean(isStageWise));
      }
    }
  }, [reportParamId, reports]);

  const handleBackToReports = () => {
    setActiveReport(null);
    setIsBuilderMode(false);
    setSearchParams({});
  };

  const handleSelectReport = (rep) => {
    setActiveReport(rep);
    const isStageWise = rep?.id === 'rep-33' || (rep?.name && rep?.name.toLowerCase().includes('stage wise overview'));
    setShowChart(Boolean(isStageWise));
    if (rep?.id) {
      setSearchParams({ reportId: rep.id });
    }
  };

  // Report Builder state
  const [builderTab, setBuilderTab] = useState('outline'); // 'outline' | 'filters'
  const [updatePreviewAuto, setUpdatePreviewAuto] = useState(true);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);

  // Modals & Navigation
  const [newReportModalOpen, setNewReportModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [rowMenuOpenId, setRowMenuOpenId] = useState(null);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [exportModalReport, setExportModalReport] = useState(null);
  const [exportView, setExportView] = useState('formatted');
  const [exportFormat, setExportFormat] = useState('xls');
  const [exportEncoding, setExportEncoding] = useState(
    'ISO-8859-1 (General US & Western European, ISO-LATIN-1)'
  );

  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [dbComplaints, setDbComplaints] = useState([]);
  const [showChart, setShowChart] = useState(true);

  const [toggles, setToggles] = useState({
    rowCounts: false,
    detailRows: true,
    subtotals: true,
    grandTotal: true,
  });
  const [tableSearch, setTableSearch] = useState('');

  // Fetch real complaints from MongoDB on mount
  useEffect(() => {
    complaintApi
      .list({ limit: 100 })
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        if (items.length > 0) {
          setDbComplaints(items);
        }
      })
      .catch(() => {});
  }, []);

  // Persist updated report definitions to localStorage
  const saveReportsToStorage = (updatedList) => {
    const cleaned = updatedList.filter((p) => !isExcludedReport(p));
    setReports(cleaned);
    try {
      localStorage.setItem('vetaura_reports_definitions', JSON.stringify(cleaned));
    } catch (_) {}
  };

  // Map MongoDB complaints to standard Salesforce fields with SLA calculations
  const mappedAllComplaints = useMemo(() => {
    const d1Target = 9; // 9 working hours
    const d2Target = 9; // 9 working hours
    const d3Target = 36; // 36 working hours (4 working days)

    return dbComplaints.map((c, i) => {
      const createdTime = c.createdAt ? new Date(c.createdAt) : new Date();
      const d1CompletedTime = c.acknowledgement?.approvedAt;
      const d2CompletedTime = c.d2?.completedAt;
      const d3CompletedTime = c.d4?.completedAt || (c.stage === 'CLOSED' ? c.closedAt : null);

      const d1SlaInfo = calculateStageSla(createdTime, d1CompletedTime, d1Target, Boolean(d1CompletedTime));
      const d2SlaInfo = calculateStageSla(d1CompletedTime || createdTime, d2CompletedTime, d2Target, Boolean(d2CompletedTime));
      const d3SlaInfo = calculateStageSla(d2CompletedTime || d1CompletedTime || createdTime, d3CompletedTime, d3Target, Boolean(d3CompletedTime));

      const overallInSla = d1SlaInfo.inSla && d2SlaInfo.inSla && d3SlaInfo.inSla;
      const daysOpenNum = Math.max(1, Math.round((Date.now() - createdTime.getTime()) / (1000 * 60 * 60 * 24)));

      const locDetail =
        c.locationDetail ||
        c.d2?.investigation?.locationDetail ||
        c.manufacturingLocationDetail ||
        (c.d2?.investigation?.manufacturingLocation === 'Inhouse' || c.manufacturingLocation === 'Inhouse'
          ? 'NRPL-Bangalore-1100'
          : 'Shamanur pharma-3033');

      const mfgLoc =
        c.d2?.investigation?.manufacturingLocation ||
        c.manufacturingLocation ||
        (locDetail.startsWith('NRPL') || locDetail.startsWith('NLPL') ? 'Inhouse' : 'CMO');

      const contactPerson =
        c.contactPerson ||
        c.complainant?.contactPerson ||
        c.contactName ||
        '-';

      const finYear =
        c.financialYear ||
        (c.createdAt ? `FY ${new Date(c.createdAt).getFullYear()}` : 'FY 2026');

      return {
        id: c._id || 'c-' + i,
        complaintNo: c.complaintNumber || `CMP-2026-${String(i + 1).padStart(4, '0')}`,
        productName:
          c.reportedProduct?.name ||
          c.productDetails?.productName ||
          c.productName ||
          '—',
        distributor:
          c.customer?.name ||
          c.distributorName ||
          c.complainant?.name ||
          '—',
        requestedBy:
          c.requester?.name ||
          c.complainant?.name ||
          c.createdBy?.name ||
          '—',
        createdDate: createdTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        createdMonthYear: createdTime.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        stage: (c.stage === 'NEW' || c.stage === 'REGISTERED' || !c.stage) ? 'D1' : c.stage,
        status: (c.status || '').toUpperCase() === 'CLOSED' || c.stage === 'CLOSED' ? 'Closed' : 'Open',
        category: c.category || (c.d2?.verifiedProduct?.performanceRelated ? 'Efficacy' : 'Non-Efficacy'),
        batchNumber: c.reportedProduct?.batchNumber || c.d2?.verifiedProduct?.batchNumber || '—',
        typeOfFailure: c.d2?.investigation?.typeOfFailure || '—',
        manufacturingLocation: mfgLoc,
        locationDetail: locDetail,
        contactPerson: contactPerson,
        financialYear: finYear,
        acknowledgement:
          c.acknowledgement?.remarks ||
          (c.acknowledgement?.approvedAt
            ? 'Complaint is acknowledged'
            : c.stage === 'D1'
            ? 'Pending Acknowledgement'
            : '—'),
        assignedFrp: c.frp?.name || c.frp?.email || '—',
        daysOpen: `${daysOpenNum} days`,
        totalDaysTaken: daysOpenNum,
        slaStatus: overallInSla ? 'Completed With in SLA' : 'Not Completed with in SLA',
        d1Sla: d1SlaInfo,
        d1Duration: d1SlaInfo.duration,
        d1Status: d1SlaInfo.statusText,
        d2Sla: d2SlaInfo,
        d2Duration: d2SlaInfo.duration,
        d2Status: d2SlaInfo.statusText,
        d3Sla: d3SlaInfo,
        d3Duration: d3SlaInfo.duration,
        d3Status: d3SlaInfo.statusText,
        overallSla: {
          dot: overallInSla ? 'green' : 'red',
          statusText: overallInSla ? 'With in SLA' : 'Not in SLA',
        },
        isConfirmed: c.status !== 'REJECTED' && c.stage !== 'REJECTED',
        isClosed: (c.status || '').toUpperCase() === 'CLOSED' || c.stage === 'CLOSED',
        isClosedWithinSla: overallInSla && ((c.status || '').toUpperCase() === 'CLOSED' || c.stage === 'CLOSED'),
        isOverdue: !overallInSla,
        isRepeat: Boolean(c.d2?.investigation?.repeatComplaint),
        year: createdTime.getFullYear().toString(),
      };
    });
  }, [dbComplaints]);

  // Compute effective report configuration (active saved vs runtime override from "Run")
  const currentViewReport = useMemo(() => {
    if (!activeReport) return null;
    const runtime = runtimeOverrides[activeReport.id];
    let cols = runtime?.columns || activeReport.columns || getDefaultColumnsForReport(activeReport.id, activeReport.name);
    let grp = runtime?.groupBy !== undefined ? runtime.groupBy : (activeReport.groupBy !== undefined ? activeReport.groupBy : getDefaultGroupByForReport(activeReport.id, activeReport.name));

    if (!runtime) {
      const repName = (activeReport.name || '').toLowerCase().trim();
      if (activeReport.id === 'rep-29' || repName === 'report by manufacturing') {
        cols = ['complaintNo', 'contactPerson', 'financialYear'];
        grp = ['manufacturingLocation', 'locationDetail'];
      } else if (activeReport.id === 'rep-13' || repName.includes('non - confirmed complaints')) {
        cols = ['complaintNo', 'distributor', 'productName'];
        grp = ['requestedBy'];
      } else if (activeReport.id === 'rep-18' || repName.includes('non - confirmed: complaints sla')) {
        cols = [
          'complaintNo',
          'd1Sla',
          'd1Duration',
          'd1Status',
          'd2Sla',
          'd2Duration',
          'd2Status',
          'totalDaysTaken',
        ];
        grp = ['slaStatus'];
      } else if (activeReport.id === 'rep-14' || repName.includes('closed within sla')) {
        cols = ['complaintNo', 'productName', 'distributor'];
        grp = [];
      } else if (activeReport.id === 'rep-33' || repName.includes('stage wise overview')) {
        cols = ['complaintNo', 'productName', 'daysOpen', 'status'];
        grp = ['stage'];
      }
    }

    if (!Array.isArray(grp)) grp = grp ? [grp] : [];

    return {
      ...activeReport,
      columns: cols,
      groupBy: grp,
      filters: runtime?.filters || activeReport.filters || {},
    };
  }, [activeReport, runtimeOverrides]);

  // Filtered complaints matching the current view report
  const activeReportRows = useMemo(() => {
    if (!currentViewReport) return [];
    return getCategoryFilteredComplaints(currentViewReport, mappedAllComplaints);
  }, [currentViewReport, mappedAllComplaints]);

  // Group active report rows according to first groupBy field
  const groupedData = useMemo(() => {
    const groupField = currentViewReport?.groupBy?.[0] || 'createdMonthYear';
    const groups = {};
    activeReportRows.forEach((row) => {
      const key = String(row[groupField] || 'Unassigned');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [currentViewReport, activeReportRows]);

  // Filtered reports list for folder view
  const filteredReports = useMemo(() => {
    let list = [...reports];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.createdBy.toLowerCase().includes(q) ||
          r.folder.toLowerCase().includes(q)
      );
    }
    if (activeSidebar === 'favorites') {
      list = list.filter((r) => r.subscribed);
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
  }, [reports, searchQuery, activeSidebar, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // --------------------------------------------------------------------------
  // REPORT BUILDER ACTIONS (Pooja Ma'am Confirmed Rules)
  // - "Save & Run": Saves changes permanently to default template, then runs.
  // - "Run": Runs report with changes temporarily without saving default template.
  // --------------------------------------------------------------------------
  const handleOpenBuilder = (report) => {
    const target = report || activeReport;
    if (!target) return;
    const runtime = runtimeOverrides[target.id];
    setBuilderDraft({
      id: target.id,
      name: target.name,
      columns: [...(runtime?.columns || target.columns || getDefaultColumnsForReport(target.id, target.name))],
      groupBy: [...(runtime?.groupBy || target.groupBy || [getDefaultGroupByForReport(target.id, target.name)])],
      filters: { ...(runtime?.filters || target.filters || {}) },
    });
    setActiveReport(target);
    setIsBuilderMode(true);
    setEditMenuOpen(false);
  };

  // "Run" action: Pooja Ma'am: "Just run it shld not updated"
  const handleBuilderRun = () => {
    if (!builderDraft || !activeReport) return;
    setRuntimeOverrides((prev) => ({
      ...prev,
      [activeReport.id]: {
        columns: [...builderDraft.columns],
        groupBy: [...builderDraft.groupBy],
        filters: { ...builderDraft.filters },
      },
    }));
    setIsBuilderMode(false);
  };

  // "Save & Run" action: Pooja Ma'am: "Save and run it should update"
  const handleBuilderSaveAndRun = () => {
    if (!builderDraft || !activeReport) return;
    const updated = {
      ...activeReport,
      name: builderDraft.name,
      columns: [...builderDraft.columns],
      groupBy: [...builderDraft.groupBy],
      filters: { ...builderDraft.filters },
    };
    const updatedList = reports.map((r) => (r.id === activeReport.id ? updated : r));
    saveReportsToStorage(updatedList);
    setActiveReport(updated);
    setRuntimeOverrides((prev) => {
      const copy = { ...prev };
      delete copy[activeReport.id];
      return copy;
    });
    setIsBuilderMode(false);
  };

  // "Save" action: Updates template without exiting builder
  const handleBuilderSave = () => {
    if (!builderDraft || !activeReport) return;
    const updated = {
      ...activeReport,
      name: builderDraft.name,
      columns: [...builderDraft.columns],
      groupBy: [...builderDraft.groupBy],
      filters: { ...builderDraft.filters },
    };
    const updatedList = reports.map((r) => (r.id === activeReport.id ? updated : r));
    saveReportsToStorage(updatedList);
    setActiveReport(updated);
  };

  // "Close" action: Discard unapplied draft and exit builder
  const handleBuilderClose = () => {
    setBuilderDraft(null);
    setIsBuilderMode(false);
  };

  // Builder Column operations
  const handleRemoveColumn = (colId) => {
    if (!builderDraft) return;
    setBuilderDraft((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c !== colId),
    }));
  };

  const handleAddColumn = (colId) => {
    if (!builderDraft || builderDraft.columns.includes(colId)) return;
    setBuilderDraft((prev) => ({
      ...prev,
      columns: [...prev.columns, colId],
    }));
    setIsAddColumnOpen(false);
    setColumnSearchQuery('');
  };

  // Builder Group operations
  const handleRemoveGroup = () => {
    if (!builderDraft) return;
    setBuilderDraft((prev) => ({
      ...prev,
      groupBy: [],
    }));
  };

  const handleRemoveGroupItem = (groupFieldId) => {
    if (!builderDraft) return;
    setBuilderDraft((prev) => ({
      ...prev,
      groupBy: prev.groupBy.filter((g) => g !== groupFieldId),
    }));
  };

  const handleAddGroup = (groupFieldId) => {
    if (!builderDraft || builderDraft.groupBy.includes(groupFieldId)) return;
    setBuilderDraft((prev) => ({
      ...prev,
      groupBy: [...prev.groupBy, groupFieldId],
    }));
    setIsAddGroupOpen(false);
  };

  const handleSetGroup = (groupFieldId) => {
    handleAddGroup(groupFieldId);
  };

  const toggleSubscribe = (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const updated = reports.map((r) => (r.id === id ? { ...r, subscribed: !r.subscribed } : r));
    saveReportsToStorage(updated);
  };

  const handleDeleteReport = (report) => {
    if (!report) return;
    const updated = reports.filter((r) => r.id !== report.id);
    saveReportsToStorage(updated);
    if (activeReport?.id === report.id) {
      setActiveReport(null);
      setIsBuilderMode(false);
    }
    setReportToDelete(null);
  };

  // Open Salesforce Lightning Export Modal
  const handleOpenExportModal = (report) => {
    setExportModalReport(report || currentViewReport);
    setExportView('formatted');
    setExportFormat('xls');
    setExportEncoding('ISO-8859-1 (General US & Western European, ISO-LATIN-1)');
    setEditMenuOpen(false);
  };

  // Execute export based on Salesforce Export Modal
  const handleExecuteExport = () => {
    if (!exportModalReport) return;
    const report = exportModalReport;
    const rows = activeReportRows.length > 0 ? activeReportRows : [];
    const safeName = (report.name || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const isFormatted = exportView === 'formatted';
    const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'xlsx' ? 'xlsx' : 'xls';
    const filename = `${safeName}_${isFormatted ? 'Formatted' : 'Details'}.${ext}`;

    const activeColIds = currentViewReport?.columns || getDefaultColumnsForReport(report.id, report.name);
    const activeCols = activeColIds.map((cid) => AVAILABLE_FIELDS.find((f) => f.id === cid) || { id: cid, label: cid });

    if (exportFormat === 'csv') {
      let csvContent = '';
      if (isFormatted) {
        csvContent += `"Report: Complaints"\n`;
        csvContent += `"${(report.name || '').replace(/"/g, '""')}"\n`;
        csvContent += `"Total Records","${rows.length}"\n`;
        csvContent += `"Folder","Complaint Management Reports"\n`;
        csvContent += `"Created By","${(report.createdBy || user?.name || 'User').replace(/"/g, '""')}"\n`;
        csvContent += `"Exported On","${new Date().toLocaleString('en-IN')}"\n\n`;
      }
      csvContent += activeCols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',') + '\n';
      csvContent += rows
        .map((r) =>
          activeCols
            .map((c) => {
              const val = r[c.id];
              const text = typeof val === 'object' && val !== null ? val.statusText || val.duration || '' : String(val || '');
              return `"${text.replace(/"/g, '""')}"`;
            })
            .join(',')
        )
        .join('\n');

      if (isFormatted) {
        csvContent += `\n"Grand Total (${rows.length} records)"\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      let tableRows = '';
      rows.forEach((r) => {
        tableRows += '<tr>';
        activeCols.forEach((c) => {
          const val = r[c.id];
          const text = typeof val === 'object' && val !== null ? val.statusText || val.duration || '' : String(val || '');
          tableRows += `<td style="border: 1px solid #d2d2d2; padding: 6px;">${text}</td>`;
        });
        tableRows += '</tr>';
      });

      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"></head>
        <body>
          <h2>${report.name}</h2>
          <p><strong>Total Records:</strong> ${rows.length}</p>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead style="background-color: #f3f3f3;">
              <tr>${activeCols.map((c) => `<th>${c.label}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
        </html>
      `;
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setExportModalReport(null);
  };

  // Helper cell renderer for data table
  const renderCellContent = (row, colId) => {
    const val = row[colId];
    if (colId === 'complaintNo') {
      return (
        <span className="text-[#0176d3] font-mono hover:underline cursor-pointer font-medium">
          {val || '—'}
        </span>
      );
    }
    if (colId === 'd1Sla' || colId === 'd2Sla' || colId === 'd3Sla' || colId === 'overallSla') {
      if (!val) return '—';
      const dot = val.dot || 'slate';
      const statusText = val.statusText || '—';
      return (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
              dot === 'green' ? 'bg-emerald-500 shadow-2xs' : dot === 'red' ? 'bg-rose-500 shadow-2xs' : 'bg-slate-400'
            }`}
          />
          <span className="text-[11px] font-medium text-slate-700">{statusText}</span>
        </div>
      );
    }
    if (colId === 'd1Duration' || colId === 'd2Duration' || colId === 'd3Duration') {
      return <span className="font-mono text-slate-600 text-[11px]">{val || '00:00:00'}</span>;
    }
    if (colId === 'stage') {
      return (
        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] uppercase border border-blue-200">
          {val || 'D1'}
        </span>
      );
    }
    if (colId === 'status') {
      const isClosed = String(val).toLowerCase() === 'closed';
      return (
        <span
          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
            isClosed
              ? 'bg-slate-100 text-slate-700 border-slate-300'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {val || 'Open'}
        </span>
      );
    }
    return <span className="text-slate-800">{String(val || '—')}</span>;
  };

  // Salesforce Lightning Export Modal JSX
  const exportModalJsx = exportModalReport ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 animate-in fade-in"
      onClick={() => setExportModalReport(null)}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-slate-300 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 py-4 border-b border-slate-200 text-center">
          <h2 className="text-base font-bold text-slate-800">Export</h2>
          <button
            type="button"
            onClick={() => setExportModalReport(null)}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2.5">Export View</span>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => {
                  setExportView('formatted');
                  setExportFormat('xls');
                }}
                className={`relative rounded border p-4 cursor-pointer transition select-none flex flex-col justify-between min-h-[125px] text-center ${
                  exportView === 'formatted'
                    ? 'border-2 border-[#0176d3] bg-white shadow-2xs'
                    : 'border border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {exportView === 'formatted' && (
                  <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[26px] border-t-[#0176d3] border-l-[26px] border-l-transparent"></div>
                    <Check className="absolute top-0.5 right-0.5 w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <h3 className="font-semibold text-slate-800 text-xs sm:text-sm">Formatted Report</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  Export the report, including the report header, groupings, and filter settings.
                </p>
              </div>

              <div
                onClick={() => setExportView('details')}
                className={`relative rounded border p-4 cursor-pointer transition select-none flex flex-col justify-between min-h-[125px] text-center ${
                  exportView === 'details'
                    ? 'border-2 border-[#0176d3] bg-white shadow-2xs'
                    : 'border border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {exportView === 'details' && (
                  <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[26px] border-t-[#0176d3] border-l-[26px] border-l-transparent"></div>
                    <Check className="absolute top-0.5 right-0.5 w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <h3 className="font-semibold text-slate-800 text-xs sm:text-sm">Details Only</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  Export only the detail rows. Use this to do further calculations or for uploading to other systems.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Format</label>
            <div className="relative">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full h-8 px-2.5 text-xs text-slate-800 border border-slate-300 rounded bg-white focus:outline-none focus:border-[#0176d3] appearance-none pr-8 cursor-pointer"
              >
                <option value="xls">Excel Format .xls</option>
                <option value="xlsx">Excel Format .xlsx</option>
                <option value="csv">Comma Delimited .csv</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setExportModalReport(null)}
              className="px-4 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              className="px-5 py-1.5 rounded bg-[#0176d3] text-white text-xs font-semibold hover:bg-blue-700 transition"
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ==========================================================================
  // VIEW 1: SALESFORCE LIGHTNING REPORT BUILDER (EDIT MODE - SCREENSHOT FIDELITY)
  // ==========================================================================
  if (isBuilderMode && builderDraft) {
    const builderGroupFieldIds = Array.isArray(builderDraft.groupBy)
      ? builderDraft.groupBy
      : [builderDraft.groupBy].filter(Boolean);

    const builderGroupCols = builderGroupFieldIds.map(
      (gid) =>
        AVAILABLE_GROUP_FIELDS.find((f) => f.id === gid) ||
        AVAILABLE_FIELDS.find((f) => f.id === gid) || { id: gid, label: gid }
    );

    const builderDetailCols = builderDraft.columns
      .filter((cid) => !builderGroupFieldIds.includes(cid))
      .map((cid) => AVAILABLE_FIELDS.find((f) => f.id === cid) || { id: cid, label: cid });

    const activeCols = builderDraft.columns.map((cid) => AVAILABLE_FIELDS.find((f) => f.id === cid) || { id: cid, label: cid });
    const groupField = builderDraft.groupBy?.[0] || 'createdMonthYear';
    const groupObj = AVAILABLE_GROUP_FIELDS.find((g) => g.id === groupField) || { id: groupField, label: groupField };

    // Compute preview data for builder
    const builderReportRef = {
      name: builderDraft.name,
      columns: builderDraft.columns,
      groupBy: builderDraft.groupBy,
      filters: builderDraft.filters,
    };
    const previewComplaints = updatePreviewAuto ? getCategoryFilteredComplaints(builderReportRef, mappedAllComplaints) : [];

    const builderNested2LevelData = (() => {
      if (builderGroupFieldIds.length !== 2) return null;
      const g1 = builderGroupFieldIds[0];
      const g2 = builderGroupFieldIds[1];
      const tree = {};
      previewComplaints.forEach((row) => {
        const k1 = String(row[g1] || '—');
        const k2 = String(row[g2] || '—');
        if (!tree[k1]) tree[k1] = {};
        if (!tree[k1][k2]) tree[k1][k2] = [];
        tree[k1][k2].push(row);
      });
      return tree;
    })();

    const builderSingleLevelData = (() => {
      if (builderGroupFieldIds.length !== 1) return null;
      const g1 = builderGroupFieldIds[0];
      const map = {};
      previewComplaints.forEach((row) => {
        const k1 = String(row[g1] || '—');
        if (!map[k1]) map[k1] = [];
        map[k1].push(row);
      });
      if (g1 === 'stage') {
        const ordered = {};
        ['D1', 'D2', 'D3', 'D4'].forEach((st) => {
          if (map[st]) ordered[st] = map[st];
        });
        Object.keys(map).forEach((k) => {
          if (!ordered[k] && k.toUpperCase() !== 'CLOSED') ordered[k] = map[k];
        });
        return ordered;
      }
      if (g1 === 'slaStatus') {
        const ordered = {};
        ['Completed With in SLA', 'Not Completed with in SLA'].forEach((st) => {
          if (map[st]) ordered[st] = map[st];
        });
        Object.keys(map).forEach((k) => {
          if (!ordered[k]) ordered[k] = map[k];
        });
        return ordered;
      }
      return map;
    })();

    // Group preview data
    const previewGroups = {};
    previewComplaints.forEach((row) => {
      const key = String(row[groupField] || 'Unassigned');
      if (!previewGroups[key]) previewGroups[key] = [];
      previewGroups[key].push(row);
    });

    const unselectedFields = AVAILABLE_FIELDS.filter(
      (f) =>
        !builderDraft.columns.includes(f.id) &&
        (f.label.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
          f.category.toLowerCase().includes(columnSearchQuery.toLowerCase()))
    );

    return (
      <div className="space-y-0 text-slate-800 animate-in fade-in pb-8">
        {/* Top Salesforce Report Builder Header */}
        <div className="bg-white border border-slate-300 rounded-t-md px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          {/* Left Title and Status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBuilderClose}
              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="w-8 h-8 rounded bg-[#05a081] flex items-center justify-center text-white shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Report: Complaints
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  Preview
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {builderDraft.name}
              </h1>
            </div>
          </div>

          {/* Right Action Tools: Undo, Redo, Toggle Preview, Save, Save & Run, Close, Run */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded border border-slate-300 bg-white shadow-2xs">
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 border-r border-slate-200"
                title="Undo"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600"
                title="Redo"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Update Preview Automatically Switch */}
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer px-2 select-none">
              <span className="text-[11px] font-medium text-slate-600">Update Preview Automatically</span>
              <div
                onClick={() => setUpdatePreviewAuto(!updatePreviewAuto)}
                className={`w-8 h-4 rounded-full transition-colors p-0.5 cursor-pointer ${
                  updatePreviewAuto ? 'bg-[#0176d3]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    updatePreviewAuto ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleBuilderSave}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
            >
              Save
            </button>

            {/* Save & Run Button (Pooja Ma'am: "Save and run it should update") */}
            <button
              type="button"
              onClick={handleBuilderSaveAndRun}
              className="px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
            >
              Save & Run
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleBuilderClose}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
            >
              Close
            </button>

            {/* Run Button (Pooja Ma'am: "Just run it shld not updated") */}
            <button
              type="button"
              onClick={handleBuilderRun}
              className="px-4 py-1.5 rounded bg-[#0176d3] hover:bg-[#0160b0] text-white text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run</span>
            </button>
          </div>
        </div>

        {/* Builder Main Work Area: Left Sidebar + Center Live Preview Canvas */}
        <div className="flex flex-col md:flex-row border-x border-b border-slate-300 bg-[#f3f3f3] min-h-[600px]">
          {/* LEFT SIDEBAR: Outline & Filters Tabs */}
          <aside className="w-full md:w-72 bg-[#fafafb] border-r border-slate-300 flex flex-col shrink-0">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-300 bg-white">
              <button
                type="button"
                onClick={() => setBuilderTab('outline')}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${
                  builderTab === 'outline'
                    ? 'border-[#0176d3] text-[#0176d3]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Outline
              </button>
              <button
                type="button"
                onClick={() => setBuilderTab('filters')}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${
                  builderTab === 'filters'
                    ? 'border-[#0176d3] text-[#0176d3]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Filters
              </button>
            </div>

            {/* Tab 1: Outline Body (Group rows & Columns) */}
            {builderTab === 'outline' && (
              <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]">
                {/* GROUP ROWS SECTION */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Group Rows {builderDraft.groupBy.length > 0 ? `(${builderDraft.groupBy.length})` : ''}
                    </span>
                  </div>

                  {/* Active Group Pills */}
                  {builderDraft.groupBy.length > 0 ? (
                    <div className="space-y-1.5 mb-2">
                      {builderDraft.groupBy.map((gid) => {
                        const gObj =
                          AVAILABLE_GROUP_FIELDS.find((g) => g.id === gid) || { id: gid, label: gid };
                        return (
                          <div
                            key={gid}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs shadow-2xs group"
                          >
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <GripVertical className="h-3 w-3 text-slate-400" />
                              <span className="font-medium">{gObj.label}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGroupItem(gid)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title="Remove Group"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mb-2">No row grouping selected.</p>
                  )}

                  {/* Add Group Combobox */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAddGroupOpen(!isAddGroupOpen)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs text-slate-600 hover:border-slate-400 transition"
                    >
                      <span>Add group...</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    {isAddGroupOpen && (
                      <div className="absolute top-9 left-0 right-0 z-40 bg-white border border-slate-300 rounded shadow-lg py-1 max-h-48 overflow-y-auto text-xs animate-in fade-in">
                        {AVAILABLE_GROUP_FIELDS.filter((g) => !builderDraft.groupBy.includes(g.id)).map((g) => (
                          <div
                            key={g.id}
                            onClick={() => handleAddGroup(g.id)}
                            className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-700 font-medium"
                          >
                            {g.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNS SECTION */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Columns ({builderDraft.columns.length})
                    </span>
                  </div>

                  {/* Add Column Search & Dropdown */}
                  <div className="relative mb-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Add column..."
                        value={columnSearchQuery}
                        onFocus={() => setIsAddColumnOpen(true)}
                        onChange={(e) => {
                          setColumnSearchQuery(e.target.value);
                          setIsAddColumnOpen(true);
                        }}
                        className="w-full pl-8 pr-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0176d3]"
                      />
                    </div>
                    {isAddColumnOpen && (
                      <div className="absolute top-9 left-0 right-0 z-40 bg-white border border-slate-300 rounded shadow-lg py-1 max-h-56 overflow-y-auto text-xs animate-in fade-in">
                        {unselectedFields.length > 0 ? (
                          unselectedFields.map((f) => (
                            <div
                              key={f.id}
                              onClick={() => handleAddColumn(f.id)}
                              className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-slate-700"
                            >
                              <span className="font-medium">{f.label}</span>
                              <span className="text-[10px] text-slate-400">{f.category}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-slate-400 text-center italic">No columns match</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Column Pills List */}
                  <div className="space-y-1.5">
                    {activeCols.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs shadow-2xs hover:border-slate-400 transition"
                      >
                        <div className="flex items-center gap-1.5 text-slate-700 truncate pr-2">
                          <GripVertical className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{c.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(c.id)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded shrink-0"
                          title="Remove Column"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Filters Body */}
            {builderTab === 'filters' && (
              <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[calc(100vh-220px)]">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Show Me</label>
                  <select
                    value={builderDraft.filters.showMe || 'all'}
                    onChange={(e) =>
                      setBuilderDraft((prev) => ({
                        ...prev,
                        filters: { ...prev.filters, showMe: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="all">All complaints</option>
                    <option value="my">My complaints</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={builderDraft.filters.status || 'all'}
                    onChange={(e) =>
                      setBuilderDraft((prev) => ({
                        ...prev,
                        filters: { ...prev.filters, status: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Category</label>
                  <select
                    value={builderDraft.filters.category || 'all'}
                    onChange={(e) =>
                      setBuilderDraft((prev) => ({
                        ...prev,
                        filters: { ...prev.filters, category: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="all">All Categories</option>
                    <option value="efficacy">Efficacy</option>
                    <option value="non-efficacy">Non-Efficacy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Manufacturing Location</label>
                  <select
                    value={builderDraft.filters.manufacturing || 'all'}
                    onChange={(e) =>
                      setBuilderDraft((prev) => ({
                        ...prev,
                        filters: { ...prev.filters, manufacturing: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="all">All Locations</option>
                    <option value="inhouse">Inhouse</option>
                    <option value="cmo">CMO</option>
                  </select>
                </div>
              </div>
            )}
          </aside>

          {/* CENTER CANVAS: Salesforce Live Preview */}
          <main className="flex-1 p-4 bg-[#f8fafc] flex flex-col min-w-0">
            {/* Salesforce Preview Notification Banner */}
            <div className="bg-[#fff1a8] border border-[#ffe066] rounded px-3 py-2 text-xs text-slate-800 flex items-center justify-between mb-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  Previewing a limited number of records. Group totals might not reflect all data until you run the report.
                </span>
              </div>
              <span className="font-semibold text-slate-700 shrink-0 ml-2">
                Total Records: {previewComplaints.length}
              </span>
            </div>

            {/* Preview Table Container */}
            <div className="bg-white border border-slate-300 rounded shadow-xs overflow-x-auto flex-1 min-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f3f3f3] text-slate-700 font-semibold border-b border-slate-300 select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">
                      <input type="checkbox" className="rounded text-blue-600 border-slate-300" />
                    </th>
                    {builderGroupCols.map((col) => (
                      <th
                        key={col.id}
                        className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap font-semibold text-slate-700 text-left"
                      >
                        <div className="flex items-center gap-1.5 cursor-pointer">
                          <span>{col.label}</span>
                          <span className="text-slate-600 font-bold text-xs">↑</span>
                        </div>
                      </th>
                    ))}
                    {builderDetailCols.map((col, idx) => (
                      <th
                        key={col.id}
                        className={`py-2.5 px-3 border-r border-slate-300 whitespace-nowrap font-semibold text-slate-700 text-left ${
                          idx === builderDetailCols.length - 1 ? 'border-r-0' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{col.label}</span>
                          <ChevronDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewComplaints.length === 0 ? (
                    <tr>
                      <td
                        colSpan={1 + builderGroupCols.length + builderDetailCols.length}
                        className="py-12 text-center text-slate-400"
                      >
                        <div className="max-w-sm mx-auto space-y-1">
                          <p className="font-semibold text-slate-600">No records returned for this report.</p>
                          <p className="text-[11px] text-slate-400">
                            Try adjusting your filters in the left pane or check complaint intake.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : builderNested2LevelData ? (
                    Object.entries(builderNested2LevelData).map(([k1, subMap]) => {
                      let isFirstL1Row = true;
                      return (
                        <div key={k1} className="contents">
                          {Object.entries(subMap).map(([k2, rows], l2Idx) => {
                            let isFirstL2Row = true;
                            return (
                              <div key={k2} className="contents">
                                {toggles.detailRows &&
                                  rows.map((row) => {
                                    const showL1 = isFirstL1Row;
                                    const showL2 = isFirstL2Row;
                                    isFirstL1Row = false;
                                    isFirstL2Row = false;
                                    return (
                                      <tr
                                        key={row.id}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                      >
                                        <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400"></td>
                                        <td className="py-2 px-3 border-r border-slate-200 text-slate-800 font-semibold align-top whitespace-nowrap">
                                          {showL1 ? k1 : ''}
                                        </td>
                                        <td className="py-2 px-3 border-r border-slate-200 text-slate-700 font-medium align-top whitespace-nowrap">
                                          {showL2 ? (
                                            <span>
                                              {k2} {toggles.rowCounts && <span className="text-slate-500 font-normal">({rows.length})</span>}
                                            </span>
                                          ) : (
                                            ''
                                          )}
                                        </td>
                                        {builderDetailCols.map((col, idx) => (
                                          <td
                                            key={col.id}
                                            className={`py-2 px-3 border-r border-slate-200 ${
                                              idx === builderDetailCols.length - 1 ? 'border-r-0' : ''
                                            }`}
                                          >
                                            {renderCellContent(row, col.id)}
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                {toggles.subtotals && (
                                  <tr className="bg-slate-50/70 border-b border-slate-200 font-medium text-slate-600 text-xs">
                                    <td className="py-1.5 px-3 border-r border-slate-200"></td>
                                    <td className="py-1.5 px-3 border-r border-slate-200"></td>
                                    <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-700">Subtotal</td>
                                    <td colSpan={builderDetailCols.length} className="py-1.5 px-3"></td>
                                  </tr>
                                )}
                              </div>
                            );
                          })}
                          {toggles.subtotals && (
                            <tr className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-800 text-xs">
                              <td className="py-2 px-3 border-r border-slate-200"></td>
                              <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">Subtotal</td>
                              <td colSpan={1 + builderDetailCols.length} className="py-2 px-3"></td>
                            </tr>
                          )}
                        </div>
                      );
                    })
                  ) : builderSingleLevelData ? (
                    Object.entries(builderSingleLevelData).map(([groupKey, groupRows]) => {
                      let isFirst = true;
                      return (
                        <div key={groupKey} className="contents">
                          {toggles.detailRows &&
                            groupRows.map((row) => {
                              const showGroup = isFirst;
                              isFirst = false;
                              return (
                                <tr
                                  key={row.id}
                                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400"></td>
                                  <td className="py-2 px-3 border-r border-slate-200 text-slate-800 font-medium align-top whitespace-nowrap">
                                    {showGroup ? (
                                      <span>
                                        {groupKey} {toggles.rowCounts && <span className="text-slate-500 font-normal">({groupRows.length})</span>}
                                      </span>
                                    ) : (
                                      ''
                                    )}
                                  </td>
                                  {builderDetailCols.map((col, idx) => (
                                    <td
                                      key={col.id}
                                      className={`py-2 px-3 border-r border-slate-200 ${
                                        idx === builderDetailCols.length - 1 ? 'border-r-0' : ''
                                      }`}
                                    >
                                      {renderCellContent(row, col.id)}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          {toggles.subtotals && (
                            <tr className="bg-slate-50/70 border-b border-slate-200 font-medium text-slate-600 text-xs">
                              <td className="py-1.5 px-3 border-r border-slate-200"></td>
                              <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-700">Subtotal</td>
                              <td colSpan={builderDetailCols.length} className="py-1.5 px-3"></td>
                            </tr>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    toggles.detailRows &&
                    previewComplaints.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400"></td>
                        {builderDetailCols.map((col, idx) => (
                          <td
                            key={col.id}
                            className={`py-2 px-3 border-r border-slate-200 ${
                              idx === builderDetailCols.length - 1 ? 'border-r-0' : ''
                            }`}
                          >
                            {renderCellContent(row, col.id)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                  {toggles.grandTotal && previewComplaints.length > 0 && (
                    <tr className="bg-[#f0f4f8] font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                      <td className="py-2.5 px-3 border-r border-slate-300 text-center"></td>
                      <td className="py-2.5 px-3 border-r border-slate-300 font-bold whitespace-nowrap">
                        Total ({previewComplaints.length})
                      </td>
                      <td
                        colSpan={builderGroupCols.length + builderDetailCols.length - 1}
                        className="py-2.5 px-3"
                      ></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Toggles */}
            <div className="bg-[#f3f3f3] border-t border-slate-300 px-4 py-2 mt-2 rounded flex items-center gap-5 text-xs text-slate-700 select-none overflow-x-auto">
              <SalesforceToggle
                label="Row Counts"
                checked={toggles.rowCounts}
                onChange={(val) => setToggles((prev) => ({ ...prev, rowCounts: val }))}
              />
              <SalesforceToggle
                label="Detail Rows"
                checked={toggles.detailRows}
                onChange={(val) => setToggles((prev) => ({ ...prev, detailRows: val }))}
              />
              <SalesforceToggle
                label="Subtotals"
                checked={toggles.subtotals}
                onChange={(val) => setToggles((prev) => ({ ...prev, subtotals: val }))}
              />
              <SalesforceToggle
                label="Grand Total"
                checked={toggles.grandTotal}
                onChange={(val) => setToggles((prev) => ({ ...prev, grandTotal: val }))}
              />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: SALESFORCE LIGHTNING REPORT DETAIL VIEW (REPORT VIEWER)
  // ==========================================================================
  if (activeReport && currentViewReport) {
    const isRuntimeOverrideActive = Boolean(runtimeOverrides[activeReport.id]);
    const groupFieldIds = Array.isArray(currentViewReport.groupBy)
      ? currentViewReport.groupBy
      : [currentViewReport.groupBy].filter(Boolean);

    const groupCols = groupFieldIds.map(
      (gid) =>
        AVAILABLE_GROUP_FIELDS.find((f) => f.id === gid) ||
        AVAILABLE_FIELDS.find((f) => f.id === gid) || { id: gid, label: gid }
    );

    const detailCols = currentViewReport.columns
      .filter((cid) => !groupFieldIds.includes(cid))
      .map((cid) => AVAILABLE_FIELDS.find((f) => f.id === cid) || { id: cid, label: cid });

    const displayRows = activeReportRows.filter((r) => {
      if (!tableSearch) return true;
      const q = tableSearch.toLowerCase().trim();
      return (
        (r.complaintNo && r.complaintNo.toLowerCase().includes(q)) ||
        (r.productName && r.productName.toLowerCase().includes(q)) ||
        (r.locationDetail && r.locationDetail.toLowerCase().includes(q)) ||
        (r.manufacturingLocation && r.manufacturingLocation.toLowerCase().includes(q)) ||
        (r.contactPerson && r.contactPerson.toLowerCase().includes(q)) ||
        (r.distributor && r.distributor.toLowerCase().includes(q)) ||
        (r.requestedBy && r.requestedBy.toLowerCase().includes(q)) ||
        (r.financialYear && r.financialYear.toLowerCase().includes(q))
      );
    });

    const nested2LevelData = (() => {
      if (groupFieldIds.length !== 2) return null;
      const g1 = groupFieldIds[0];
      const g2 = groupFieldIds[1];
      const tree = {};
      displayRows.forEach((row) => {
        const k1 = String(row[g1] || '—');
        const k2 = String(row[g2] || '—');
        if (!tree[k1]) tree[k1] = {};
        if (!tree[k1][k2]) tree[k1][k2] = [];
        tree[k1][k2].push(row);
      });
      return tree;
    })();

    const singleLevelData = (() => {
      if (groupFieldIds.length !== 1) return null;
      const g1 = groupFieldIds[0];
      const map = {};
      displayRows.forEach((row) => {
        const k1 = String(row[g1] || '—');
        if (!map[k1]) map[k1] = [];
        map[k1].push(row);
      });
      if (g1 === 'stage') {
        const ordered = {};
        ['D1', 'D2', 'D3', 'D4'].forEach((st) => {
          if (map[st]) ordered[st] = map[st];
        });
        Object.keys(map).forEach((k) => {
          if (!ordered[k] && k.toUpperCase() !== 'CLOSED') ordered[k] = map[k];
        });
        return ordered;
      }
      if (g1 === 'slaStatus') {
        const ordered = {};
        ['Completed With in SLA', 'Not Completed with in SLA'].forEach((st) => {
          if (map[st]) ordered[st] = map[st];
        });
        Object.keys(map).forEach((k) => {
          if (!ordered[k]) ordered[k] = map[k];
        });
        return ordered;
      }
      return map;
    })();

    const isStageWiseOverview =
      activeReport.id === 'rep-33' ||
      (activeReport.name || '').toLowerCase().includes('stage wise overview');

    const chartData = (() => {
      // ONLY Complaint Stage wise Overview has a chart (removed from all other reports)
      if (!isStageWiseOverview) return null;

      const counts = { D2: 0, D3: 0, D4: 0, Closed: 0 };
      dbComplaints.forEach((c) => {
        const s = (c.stage || '').toUpperCase();
        const status = (c.status || '').toUpperCase();
        if (s === 'CLOSED' || status === 'CLOSED' || c.isClosed) {
          counts.Closed++;
        } else if (s === 'D2') {
          counts.D2++;
        } else if (s === 'D3') {
          counts.D3++;
        } else if (s === 'D4') {
          counts.D4++;
        }
      });
      const order = ['D2', 'D3', 'D4', 'Closed'];
      return order.map((k) => ({ label: k, count: counts[k] || 0 }));
    })();

    return (
      <div className="space-y-0 pb-8 text-slate-800 animate-in fade-in">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-500 flex-wrap">
            <button
              type="button"
              onClick={handleBackToReports}
              className="inline-flex items-center gap-1 font-semibold text-[#0176d3] hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Reports</span>
            </button>
            <span className="text-slate-300">/</span>
            <button
              type="button"
              onClick={handleBackToReports}
              className="text-[#0176d3] hover:underline"
            >
              All Folders
            </button>
            <span className="text-slate-300">&gt;</span>
            <button
              type="button"
              onClick={handleBackToReports}
              className="text-[#0176d3] hover:underline"
            >
              Complaint Management Reports
            </button>
            <span className="text-slate-300">&gt;</span>
            <span className="font-semibold text-slate-800">{activeReport.name}</span>
          </div>

          <div className="text-[11px] text-slate-400">
            Authored by {activeReport.createdBy}
          </div>
        </div>

        {/* Runtime Override Banner (if user clicked "Run" without saving) */}
        {isRuntimeOverrideActive && (
          <div className="bg-sky-50 border-b border-sky-200 px-6 py-2 text-xs text-sky-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-sky-600 shrink-0" />
              <span>
                Viewing modified report columns from <strong>Run</strong> (unsaved template).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const runtime = runtimeOverrides[activeReport.id];
                  const updated = {
                    ...activeReport,
                    columns: [...runtime.columns],
                    groupBy: [...runtime.groupBy],
                    filters: { ...runtime.filters },
                  };
                  const updatedList = reports.map((r) => (r.id === activeReport.id ? updated : r));
                  saveReportsToStorage(updatedList);
                  setActiveReport(updated);
                  setRuntimeOverrides((prev) => {
                    const copy = { ...prev };
                    delete copy[activeReport.id];
                    return copy;
                  });
                }}
                className="px-2.5 py-1 rounded bg-[#0176d3] text-white font-semibold text-[11px] hover:bg-blue-700"
              >
                Save as Default
              </button>
              <button
                type="button"
                onClick={() => {
                  setRuntimeOverrides((prev) => {
                    const copy = { ...prev };
                    delete copy[activeReport.id];
                    return copy;
                  });
                }}
                className="px-2 py-1 rounded bg-slate-200 text-slate-700 font-semibold text-[11px] hover:bg-slate-300"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}

        {/* Outer Salesforce Lightning Card */}
        <div className="bg-white border-x border-b border-slate-300 shadow-2xs">
          {/* Header Banner (Exact Match to Salesforce Screenshot) */}
          <div className="border-b border-slate-200 px-5 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#05a081] flex items-center justify-center text-white shadow-xs shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                  Report: Complaints
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {activeReport.name}
                </h1>
              </div>
            </div>

            {/* Right Action Tools Group */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenBuilder(activeReport)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
              >
                <Pencil className="h-3.5 w-3.5 text-blue-600" />
                <span>Enable Field Editing</span>
              </button>

              <button
                type="button"
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>

              {isStageWiseOverview && (
                <button
                  type="button"
                  onClick={() => setShowChart(!showChart)}
                  className={`p-1.5 rounded border shadow-2xs transition ${
                    showChart
                      ? 'border-[#0176d3] bg-[#0176d3] text-white hover:bg-[#0165b8]'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                  title={showChart ? 'Hide Chart' : 'Show Chart'}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenBuilder(activeReport)}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                title="Filter"
              >
                <Filter className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  complaintApi
                    .list({ limit: 100 })
                    .then((res) => {
                      const items = Array.isArray(res) ? res : res?.data || res?.items || [];
                      if (items.length > 0) setDbComplaints(items);
                    })
                    .catch(() => {});
                }}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                title="Refresh"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              {/* Edit Split Button with Dropdown (Edit / Delete / Export / Save As) */}
              <div className="relative inline-flex rounded shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleOpenBuilder(activeReport)}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-l transition flex items-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditMenuOpen(!editMenuOpen)}
                  className="px-2 py-1.5 border-t border-b border-r border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 rounded-r transition"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {editMenuOpen && (
                  <div
                    className="absolute right-0 top-9 z-50 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg text-left text-xs animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenBuilder(activeReport)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <Pencil className="h-3.5 w-3.5 text-blue-600" />
                      <span>Edit in Report Builder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenExportModal(activeReport);
                        setEditMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" />
                      <span>Export</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportToDelete(activeReport);
                        setEditMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-red-600 hover:bg-red-50 font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Report</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        const clone = {
                          ...activeReport,
                          id: `rep-${Date.now()}`,
                          name: `${activeReport.name} (Copy)`,
                        };
                        const updated = [clone, ...reports];
                        saveReportsToStorage(updated);
                        setActiveReport(clone);
                        setEditMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Save As Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSubscribe(activeReport.id);
                        setActiveReport((prev) => ({ ...prev, subscribed: !prev.subscribed }));
                        setEditMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          activeReport.subscribed ? 'text-amber-500 fill-amber-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{activeReport.subscribed ? 'Unsubscribe' : 'Subscribe'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Salesforce Report Chart (ONLY for Complaint Stage wise Overview) */}
          {isStageWiseOverview && showChart && chartData && chartData.length > 0 && (
            <ReportVisualChart
              report={activeReport}
              chartData={chartData}
              groupFieldLabel="Stage"
              chartType="vertical"
            />
          )}

          {/* Total Records Row */}
          <div className="bg-[#f8fafc] border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-baseline gap-6">
              <div>
                <span className="text-[11px] font-normal text-slate-500 block">Total Records</span>
                <span className="text-[16px] font-bold text-slate-900 leading-tight">
                  {displayRows.length}
                </span>
              </div>
              {detailCols.some((c) => c.id === 'totalDaysTaken') && (
                <div>
                  <span className="text-[11px] font-normal text-slate-500 block">
                    Total Total Days taken Including all Stages
                  </span>
                  <span className="text-[16px] font-bold text-slate-900 leading-tight">
                    {displayRows
                      .reduce((acc, r) => acc + (Number(r.totalDaysTaken) || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Columns: {detailCols.length} {groupCols.length > 0 ? `| Grouped by: ${groupCols.map((g) => g.label).join(', ')}` : ''}
            </div>
          </div>

          {/* Main Salesforce Lightning Data Table */}
          <div className="overflow-x-auto min-h-[360px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f3f3f3] text-slate-700 font-semibold border-b border-slate-300 select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">
                    <input type="checkbox" className="rounded text-blue-600 border-slate-300" />
                  </th>
                  {groupCols.map((col) => (
                    <th
                      key={col.id}
                      className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap font-semibold text-slate-700 text-left"
                    >
                      <div className="flex items-center gap-1.5 cursor-pointer">
                        <span>{col.label}</span>
                        <span className="text-slate-600 font-bold text-xs">↑</span>
                      </div>
                    </th>
                  ))}
                  {detailCols.map((col, idx) => (
                    <th
                      key={col.id}
                      className={`py-2.5 px-3 border-r border-slate-300 whitespace-nowrap font-semibold text-slate-700 text-left ${
                        idx === detailCols.length - 1 ? 'border-r-0' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{col.label}</span>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + groupCols.length + detailCols.length}
                      className="py-14 text-center text-slate-400"
                    >
                      <div className="max-w-md mx-auto space-y-1.5">
                        <p className="text-sm font-semibold text-slate-700">No records returned for this report.</p>
                        <p className="text-xs text-slate-500">
                          Currently no complaints match the active report criteria.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : nested2LevelData ? (
                  // 2-Level Nested Grouping (Exact match to Report by Manufacturing screenshot)
                  Object.entries(nested2LevelData).map(([k1, subMap]) => {
                    let isFirstL1Row = true;
                    return (
                      <div key={k1} className="contents">
                        {Object.entries(subMap).map(([k2, rows], l2Idx) => {
                          let isFirstL2Row = true;
                          return (
                            <div key={k2} className="contents">
                              {toggles.detailRows &&
                                rows.map((row) => {
                                  const showL1 = isFirstL1Row;
                                  const showL2 = isFirstL2Row;
                                  isFirstL1Row = false;
                                  isFirstL2Row = false;
                                  return (
                                    <tr
                                      key={row.id}
                                      className="border-b border-slate-100 hover:bg-[#f8fafc] transition-colors"
                                    >
                                      <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400"></td>
                                      <td className="py-2 px-3 border-r border-slate-200 text-slate-800 font-semibold align-top whitespace-nowrap">
                                        {showL1 ? k1 : ''}
                                      </td>
                                      <td className="py-2 px-3 border-r border-slate-200 text-slate-700 font-medium align-top whitespace-nowrap">
                                        {showL2 ? (
                                          <span>
                                            {k2} <span className="text-slate-500 font-normal">({rows.length})</span>
                                          </span>
                                        ) : (
                                          ''
                                        )}
                                      </td>
                                      {detailCols.map((col, idx) => (
                                        <td
                                          key={col.id}
                                          className={`py-2 px-3 border-r border-slate-200 ${
                                            idx === detailCols.length - 1 ? 'border-r-0' : ''
                                          }`}
                                        >
                                          {renderCellContent(row, col.id)}
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              {toggles.subtotals && (
                                <tr className="bg-slate-50/70 border-b border-slate-200 font-medium text-slate-600 text-xs">
                                  <td className="py-1.5 px-3 border-r border-slate-200"></td>
                                  <td className="py-1.5 px-3 border-r border-slate-200"></td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-700">Subtotal</td>
                                  <td colSpan={detailCols.length} className="py-1.5 px-3"></td>
                                </tr>
                              )}
                            </div>
                          );
                        })}
                        {toggles.subtotals && (
                          <tr className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-800 text-xs">
                            <td className="py-2 px-3 border-r border-slate-200"></td>
                            <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">Subtotal</td>
                            <td colSpan={1 + detailCols.length} className="py-2 px-3"></td>
                          </tr>
                        )}
                      </div>
                    );
                  })
                ) : singleLevelData ? (
                  // 1-Level Grouping (e.g. Non - Confirmed Complaints grouped by Requested By)
                  Object.entries(singleLevelData).map(([groupKey, groupRows]) => {
                    let isFirst = true;
                    return (
                      <div key={groupKey} className="contents">
                        {toggles.detailRows &&
                          groupRows.map((row) => {
                            const showGroup = isFirst;
                            isFirst = false;
                            return (
                              <tr
                                key={row.id}
                                className="border-b border-slate-100 hover:bg-[#f8fafc] transition-colors"
                              >
                                <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400"></td>
                                <td className="py-2 px-3 border-r border-slate-200 text-slate-800 font-medium align-top whitespace-nowrap">
                                  {showGroup ? (
                                    <span>
                                      {groupKey} <span className="text-slate-500 font-normal">({groupRows.length})</span>
                                    </span>
                                  ) : (
                                    ''
                                  )}
                                </td>
                                {detailCols.map((col, idx) => (
                                  <td
                                    key={col.id}
                                    className={`py-2 px-3 border-r border-slate-200 ${
                                      idx === detailCols.length - 1 ? 'border-r-0' : ''
                                    }`}
                                  >
                                    {renderCellContent(row, col.id)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        {toggles.subtotals && (
                          <tr className="bg-slate-50/70 border-b border-slate-200 font-medium text-slate-600 text-xs">
                            <td className="py-1.5 px-3 border-r border-slate-200"></td>
                            <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-700">Subtotal</td>
                            {detailCols.map((col, idx) => {
                              if (col.id === 'totalDaysTaken') {
                                const sum = groupRows.reduce((acc, r) => acc + (Number(r.totalDaysTaken) || 0), 0);
                                return (
                                  <td
                                    key={col.id}
                                    className={`py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-800 ${
                                      idx === detailCols.length - 1 ? 'border-r-0' : ''
                                    }`}
                                  >
                                    {sum.toLocaleString()}
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={col.id}
                                  className={`py-1.5 px-3 border-r border-slate-200 ${
                                    idx === detailCols.length - 1 ? 'border-r-0' : ''
                                  }`}
                                ></td>
                              );
                            })}
                          </tr>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Flat Table with 0 Grouping (e.g. Complaints Closed within SLA)
                  toggles.detailRows &&
                  displayRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 hover:bg-[#f8fafc] transition-colors"
                    >
                      <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400"></td>
                      {detailCols.map((col, idx) => (
                        <td
                          key={col.id}
                          className={`py-2 px-3 border-r border-slate-200 ${
                            idx === detailCols.length - 1 ? 'border-r-0' : ''
                          }`}
                        >
                          {renderCellContent(row, col.id)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {/* Grand Total Row */}
                {toggles.grandTotal && displayRows.length > 0 && (
                  <tr className="bg-[#f0f4f8] font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                    <td className="py-2.5 px-3 border-r border-slate-300 text-center"></td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-bold whitespace-nowrap">
                      Total ({displayRows.length})
                    </td>
                    {groupCols.slice(1).map((_, idx) => (
                      <td key={idx} className="py-2.5 px-3 border-r border-slate-300"></td>
                    ))}
                    {detailCols.map((col, idx) => {
                      if (col.id === 'totalDaysTaken') {
                        const grandSum = displayRows.reduce((acc, r) => acc + (Number(r.totalDaysTaken) || 0), 0);
                        return (
                          <td
                            key={col.id}
                            className={`py-2.5 px-3 border-r border-slate-300 font-bold text-slate-900 ${
                              idx === detailCols.length - 1 ? 'border-r-0' : ''
                            }`}
                          >
                            {grandSum.toLocaleString()}
                          </td>
                        );
                      }
                      return (
                        <td
                          key={col.id}
                          className={`py-2.5 px-3 border-r border-slate-300 ${
                            idx === detailCols.length - 1 ? 'border-r-0' : ''
                          }`}
                        ></td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Toolbar: Search input + Toggles */}
          <div className="bg-[#f3f3f3] border-t border-slate-300 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-700 select-none">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search this list..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0176d3]"
                />
              </div>
            </div>

            <div className="flex items-center gap-5 overflow-x-auto w-full sm:w-auto justify-end">
              <SalesforceToggle
                label="Row Counts"
                checked={toggles.rowCounts}
                onChange={(val) => setToggles((prev) => ({ ...prev, rowCounts: val }))}
              />
              <SalesforceToggle
                label="Detail Rows"
                checked={toggles.detailRows}
                onChange={(val) => setToggles((prev) => ({ ...prev, detailRows: val }))}
              />
              <SalesforceToggle
                label="Subtotals"
                checked={toggles.subtotals}
                onChange={(val) => setToggles((prev) => ({ ...prev, subtotals: val }))}
              />
              <SalesforceToggle
                label="Grand Total"
                checked={toggles.grandTotal}
                onChange={(val) => setToggles((prev) => ({ ...prev, grandTotal: val }))}
              />
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {reportToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4 animate-in fade-in"
            onClick={() => setReportToDelete(null)}
          >
            <div
              className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Delete Report</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900 font-semibold">{reportToDelete.name}</strong>?
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReportToDelete(null)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteReport(reportToDelete)}
                  className="px-4 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {exportModalJsx}
      </div>
    );
  }

  // ==========================================================================
  // VIEW 3: SALESFORCE LIGHTNING REPORTS DIRECTORY LIST (36 ITEMS)
  // ==========================================================================
  return (
    <div className="space-y-3 pb-8">
      {/* Outer Salesforce Lightning Card */}
      <div className="bg-white border border-slate-300 rounded-md shadow-2xs overflow-hidden">
        {/* Card Header Toolbar (Mirroring Screenshot) */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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

            <div className="flex flex-wrap items-center gap-2">
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
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setNewReportModalOpen(true)}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
              >
                New Report
              </button>

              <div className="inline-flex rounded shadow-2xs">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(true)}
                  className="px-3 py-1.5 rounded-l border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                >
                  New Folder
                </button>
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(true)}
                  className="px-2 py-1.5 rounded-r border-t border-b border-r border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs transition"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              <button
                type="button"
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition"
                title="Table Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Card Body: Sidebar + Table Layout */}
        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Left Navigation Sidebar */}
          <aside className="w-full md:w-48 border-r border-slate-200 bg-[#fafafb] p-3 text-xs shrink-0 select-none">
            <div className="mb-4">
              <span className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Reports
              </span>
              <ul className="space-y-0.5 mt-1">
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
                      className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                        activeSidebar === item.id
                          ? 'bg-[#e0effe] text-[#0176d3] font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <span className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Folders
              </span>
              <ul className="space-y-0.5 mt-1">
                {[
                  { id: 'all-folders', label: 'All Folders' },
                  { id: 'created-by-me-folders', label: 'Created by Me' },
                  { id: 'shared-with-me', label: 'Shared with Me' },
                ].map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSidebar(item.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                        activeSidebar === item.id
                          ? 'bg-[#e0effe] text-[#0176d3] font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Favorites
              </span>
              <ul className="space-y-0.5 mt-1">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSidebar('favorites')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition flex items-center gap-1.5 ${
                      activeSidebar === 'favorites'
                        ? 'bg-[#e0effe] text-[#0176d3] font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Star className="h-3 w-3 text-amber-500 fill-amber-400" />
                    <span>Favorited Reports</span>
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          {/* Right Table Container */}
          <main className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8fafc] text-slate-600 border-b border-slate-200 select-none">
                <tr>
                  <th
                    onClick={() => toggleSort('name')}
                    className="py-3 px-4 font-semibold hover:bg-slate-100 cursor-pointer transition min-w-[280px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Report Name</span>
                      {sortField === 'name' && (
                        <span>{sortAsc ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[200px]">Description</th>
                  <th
                    onClick={() => toggleSort('folder')}
                    className="py-3 px-4 font-semibold hover:bg-slate-100 cursor-pointer transition min-w-[160px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Folder</span>
                      {sortField === 'folder' && (
                        <span>{sortAsc ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('createdBy')}
                    className="py-3 px-4 font-semibold hover:bg-slate-100 cursor-pointer transition min-w-[150px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Created By</span>
                      {sortField === 'createdBy' && (
                        <span>{sortAsc ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('createdOn')}
                    className="py-3 px-4 font-semibold hover:bg-slate-100 cursor-pointer transition min-w-[140px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Created On</span>
                      {sortField === 'createdOn' && (
                        <span>{sortAsc ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-2 text-center w-12">Subscribed</th>
                  <th className="py-3 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => handleSelectReport(report)}
                    className="hover:bg-blue-50/40 cursor-pointer transition group"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-[#05a081] shrink-0" />
                        <span className="text-[#0176d3] hover:underline font-semibold">
                          {report.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">
                      {report.description || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Folder className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
                        <span className="truncate">{report.folder}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{report.createdBy}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{report.createdOn}</td>
                    <td
                      className="py-2.5 px-2 text-center"
                      onClick={(e) => toggleSubscribe(report.id, e)}
                    >
                      <button
                        type="button"
                        className="p-1 text-slate-400 hover:text-amber-500 transition"
                        title={report.subscribed ? 'Subscribed' : 'Subscribe'}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            report.subscribed ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    </td>
                    <td
                      className="py-2.5 px-2 text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setRowMenuOpenId(rowMenuOpenId === report.id ? null : report.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {rowMenuOpenId === report.id && (
                          <div
                            className="absolute right-2 top-8 z-50 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg text-left text-xs animate-in fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenBuilder(report);
                                setRowMenuOpenId(null);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5 text-blue-600" />
                              <span>Edit in Builder</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenExportModal(report);
                                setRowMenuOpenId(null);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                            >
                              <Download className="h-3.5 w-3.5 text-blue-600" />
                              <span>Export</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReportToDelete(report);
                                setRowMenuOpenId(null);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </main>
        </div>
      </div>

      {/* New Report Modal */}
      {newReportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4 animate-in fade-in"
          onClick={() => setNewReportModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Report</h3>
              <button
                type="button"
                onClick={() => setNewReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Report Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Batch Quality Review"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
                />
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
                  type="button"
                  onClick={() => {
                    if (!newReportName.trim()) return;
                    const newRep = {
                      id: `rep-${Date.now()}`,
                      name: newReportName.trim(),
                      description: 'Custom created report',
                      folder: 'Complaint Management Reports',
                      createdBy: user?.name || 'Narayan Rao Vakamudi',
                      createdOn: new Date().toLocaleDateString('en-GB'),
                      subscribed: false,
                      columns: getDefaultColumnsForReport('', newReportName.trim()),
                      groupBy: ['createdMonthYear'],
                      filters: { status: 'all', category: 'all' },
                    };
                    const updated = [newRep, ...reports];
                    saveReportsToStorage(updated);
                    setNewReportName('');
                    setNewReportModalOpen(false);
                    handleOpenBuilder(newRep);
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#0176d3] text-white font-semibold hover:bg-blue-700"
                >
                  Create & Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4 animate-in fade-in"
          onClick={() => setNewFolderModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Folder</h3>
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
                  placeholder="e.g. Quality SLA Compliance Reports"
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

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4 animate-in fade-in"
          onClick={() => setReportToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Report</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 font-semibold">{reportToDelete.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="px-3.5 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReport(reportToDelete)}
                className="px-4 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {exportModalJsx}
    </div>
  );
}
