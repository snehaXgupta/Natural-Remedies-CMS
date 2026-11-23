import { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Settings,
  Folder,
  FileText,
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
} from 'lucide-react';
import { reportApi } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';

// All official complaint reports authored under Narayan Rao Vakamudi
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
    stats: { total: 20, percentage: '92% On-Time', avgTime: '4.8 days', status: 'Compliant' },
    rows: [
      { num: 'CMP-2026-0001', prod: 'Rumicare Bolus 4s', batch: 'RC2601', sbu: 'AHP - Rumicare', intakeDate: '01/01/2026', closedDate: '05/01/2026', daysToClose: '4 days', slaTarget: '15 days' },
      { num: 'CMP-2026-0002', prod: 'Rumicare Liquid 500ml', batch: 'RL2602', sbu: 'AHP - Rumicare', intakeDate: '03/01/2026', closedDate: '07/01/2026', daysToClose: '4 days', slaTarget: '15 days' },
      { num: 'CMP-2026-0005', prod: 'Rumicare Powder 100g', batch: 'RP2605', sbu: 'AHP - Rumicare', intakeDate: '10/01/2026', closedDate: '15/01/2026', daysToClose: '5 days', slaTarget: '15 days' },
      { num: 'CMP-2026-0006', prod: 'Rumicare Bolus 4s', batch: 'RC2606', sbu: 'AHP - Rumicare', intakeDate: '14/01/2026', closedDate: '18/01/2026', daysToClose: '4 days', slaTarget: '15 days' },
      { num: 'CMP-2026-0010', prod: 'Rumicare Gel 250ml', batch: 'RG2610', sbu: 'AHP - Rumicare', intakeDate: '25/01/2026', closedDate: '31/01/2026', daysToClose: '6 days', slaTarget: '15 days' },
    ],
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
    stats: { total: 8, percentage: '40% of Open', avgTime: '5.2 days', status: 'In Investigation' },
    rows: [
      { num: 'CMP-2026-0004', prod: 'Rumicare Liquid 500ml', batch: 'RL2604', sbu: 'AHP - Rumicare', stage: 'D2 In Progress', daysOpen: '4 days', assignedFrp: 'Sneha' },
      { num: 'CMP-2026-0007', prod: 'Rumicare Powder 100g', batch: 'RP2607', sbu: 'AHP - Rumicare', stage: 'D3 Root Cause', daysOpen: '7 days', assignedFrp: 'Jensy Josephine' },
      { num: 'CMP-2026-0011', prod: 'Rumicare Liquid 500ml', batch: 'RL2611', sbu: 'AHP - Rumicare', stage: 'D3 Root Cause', daysOpen: '6 days', assignedFrp: 'Sneha' },
      { num: 'CMP-2026-0013', prod: 'Rumicare Bolus 4s', batch: 'RC2613', sbu: 'AHP - Rumicare', stage: 'D2 In Progress', daysOpen: '3 days', assignedFrp: 'Unnati' },
    ],
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
    stats: { total: 6, percentage: '30% of Open', avgTime: '3.6 days', status: 'Packaging / Transit' },
    rows: [
      { num: 'CMP-2026-0009', prod: 'Rumicare Bolus 4s', batch: 'RC2609', sbu: 'AHP - Rumicare', issueType: 'Blister Foil Crushed', daysOpen: '3 days', stage: 'D2 In Progress' },
      { num: 'CMP-2026-0012', prod: 'Rumicare Liquid 500ml', batch: 'RL2612', sbu: 'AHP - Rumicare', issueType: 'Cap Seal Leakage', daysOpen: '4 days', stage: 'D4 In Progress' },
      { num: 'CMP-2026-0016', prod: 'Rumicare Powder 100g', batch: 'RP2616', sbu: 'AHP - Rumicare', issueType: 'Outer Carton Wet', daysOpen: '2 days', stage: 'D1 Acknowledged' },
      { num: 'CMP-2026-0018', prod: 'Rumicare Bolus 4s', batch: 'RC2618', sbu: 'AHP - Rumicare', issueType: 'Missing Batch Print', daysOpen: '5 days', stage: 'D3 Investigation' },
    ],
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
    stats: { total: 20, percentage: '-41.2% Reduction', avgTime: 'YoY Quality Trend', status: 'Significant Improvement' },
    rows: [
      { year: '2024', totalComplaints: 48, confirmed: 40, nonConfirmed: 8, resolutionRate: '98%', reduction: 'Baseline' },
      { year: '2025', totalComplaints: 34, confirmed: 28, nonConfirmed: 6, resolutionRate: '100%', reduction: '-29.2%' },
      { year: '2026 (YTD)', totalComplaints: 20, confirmed: 16, nonConfirmed: 4, resolutionRate: '100%', reduction: '-41.2%' },
    ],
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
    stats: { total: 20, percentage: '70% Open / 30% Closed', avgTime: 'Active Pipeline', status: 'Audited' },
    rows: [
      { statusCategory: 'Active Open Complaints', count: 14, percentage: '70%', stageBreakdown: 'D1: 9, D2: 2, D3: 1, D4: 2', slaHealth: '12 On Schedule, 2 Escalated' },
      { statusCategory: 'Closed & SOP Verified', count: 6, percentage: '30%', stageBreakdown: 'Form NR/QAD/SOP/001-F01/04 complete', slaHealth: '100% Closed On Time' },
    ],
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
    stats: { total: 20, percentage: '-41.2% Volume', avgTime: '2025 vs 2026', status: 'Down Trend' },
    rows: [
      { month: 'Q1 (Jan - Mar)', complaints2025: 11, complaints2026: 7, variancePct: '-36.4%' },
      { month: 'Q2 (Apr - Jun)', complaints2025: 8, complaints2026: 5, variancePct: '-37.5%' },
      { month: 'Q3 (Jul - Sep)', complaints2025: 9, complaints2026: 6, variancePct: '-33.3%' },
      { month: 'Q4 (Oct - Dec)', complaints2025: 6, complaints2026: 2, variancePct: '-66.7%' },
    ],
  },
  // 7. Screenshot Report 7 (Rumicare Previous)
  {
    id: 'rep-7',
    name: 'Complaints Current Vs Previous rumicare',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '4/2/2025, 10:13 am',
    subscribed: false,
    type: 'rumicare-comparison',
    stats: { total: 11, percentage: '-50% in Rumicare', avgTime: 'Annual Comparison', status: 'Defects Halved' },
    rows: [
      { productItem: 'Rumicare Bolus 4s', incidents2025: 12, incidents2026: 6, change: '-50.0%' },
      { productItem: 'Rumicare Liquid 500ml', incidents2025: 8, incidents2026: 3, change: '-62.5%' },
      { productItem: 'Rumicare Powder 100g', incidents2025: 5, incidents2026: 2, change: '-60.0%' },
      { productItem: 'Rumicare Gel 250ml', incidents2025: 2, incidents2026: 0, change: '-100.0%' },
    ],
  },
  // 8. Screenshot Report 8 (Rumicare Monthly)
  {
    id: 'rep-8',
    name: 'Current Complaints Month wise Rumicare',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '4/2/2025, 10:41 am',
    subscribed: false,
    type: 'rumicare-monthly',
    stats: { total: 11, percentage: '1.2 / Month Avg', avgTime: 'Current Year 2026', status: 'Normal Intake' },
    rows: [
      { monthName: 'January 2026', rumicareCount: 2, primaryIssue: 'Foil pinhole' },
      { monthName: 'February 2026', rumicareCount: 2, primaryIssue: 'Cap seal leak' },
      { monthName: 'March 2026', rumicareCount: 1, primaryIssue: 'Retained sample normal' },
      { monthName: 'April 2026', rumicareCount: 1, primaryIssue: 'Carton transit damage' },
      { monthName: 'May 2026', rumicareCount: 1, primaryIssue: 'Efficacy evaluation' },
      { monthName: 'June 2026', rumicareCount: 1, primaryIssue: 'Label smudge' },
      { monthName: 'July 2026', rumicareCount: 1, primaryIssue: 'Blister seal' },
      { monthName: 'August 2026', rumicareCount: 1, primaryIssue: 'Duplicate claim' },
      { monthName: 'September 2026', rumicareCount: 1, primaryIssue: 'Efficacy feedback' },
      { monthName: 'October 2026', rumicareCount: 0, primaryIssue: 'Nil' },
      { monthName: 'November 2026', rumicareCount: 0, primaryIssue: 'Nil' },
    ],
  },
  // 9. Screenshot Report 9 (Rumicare Raised)
  {
    id: 'rep-9',
    name: 'Complaint Raised By Rumicare',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '4/2/2025, 10:49 am',
    subscribed: false,
    type: 'rumicare-raised',
    stats: { total: 11, percentage: '55% of All SBU', avgTime: 'Dealer & Vet Network', status: 'Active Inflow' },
    rows: [
      { requesterType: 'Veterinary Doctors / Clinics', count: 5, percentage: '45.5%', primaryChannel: 'WhatsApp Chatbot' },
      { requesterType: 'Authorised Distributors / Stockists', count: 4, percentage: '36.4%', primaryChannel: 'WhatsApp & Portal' },
      { requesterType: 'Retail Veterinary Pharmacies', count: 2, percentage: '18.1%', primaryChannel: 'Direct Call / Portal' },
    ],
  },
  // 10. Screenshot Report 10 (Rumicare Type of Failure)
  {
    id: 'rep-10',
    name: 'Type of Failure - Rumicare Complaints',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '4/2/2025, 10:52 am',
    subscribed: false,
    type: 'rumicare-failures',
    stats: { total: 11, percentage: '4 Major Modes', avgTime: 'Ishikawa Root Causes', status: 'CAPA Tracked' },
    rows: [
      { failureType: 'Packaging & Seal Integrity', incidentCount: 5, share: '45.5%', riskLevel: 'Medium', capaStatus: 'Tooling realigned' },
      { failureType: 'Physical Defect / Damage', incidentCount: 3, share: '27.3%', riskLevel: 'Low', capaStatus: 'Transit packaging reinforced' },
      { failureType: 'Efficacy / Clinical Performance', incidentCount: 2, share: '18.2%', riskLevel: 'High', capaStatus: 'Retained lot chemical assay passed' },
      { failureType: 'Labeling & Batch Stamping', incidentCount: 1, share: '9.0%', riskLevel: 'Low', capaStatus: 'Curing oven temp calibrated' },
    ],
  },
  // 11. Screenshot Report 11 (Rumicare Stage Overview)
  {
    id: 'rep-11',
    name: 'Complaint Stage wise Overview Rumicare',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '4/2/2025, 10:54 am',
    subscribed: false,
    type: 'rumicare-stages',
    stats: { total: 11, percentage: '4 Stages Active', avgTime: '8D Progression', status: 'Healthy Flow' },
    rows: [
      { stageLabel: 'D1 – Problem Intake & Acknowledgement', activeCount: 4, onTimeSla: '100% (< 24 hrs)' },
      { stageLabel: 'D2 – Situation & RPN Risk Scoring', activeCount: 2, onTimeSla: '100% (< 48 hrs)' },
      { stageLabel: 'D3 – Root Cause & CAPA Sign-off', activeCount: 1, onTimeSla: '100% (< 5 days)' },
      { stageLabel: 'D4 – Effectiveness & COPQ Audit', activeCount: 1, onTimeSla: '100% (< 10 days)' },
      { stageLabel: 'Closed – SOP Verified and Customer Confirmed', activeCount: 3, onTimeSla: '100% (≤ 15 days)' },
    ],
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
    stats: { total: 6, percentage: '30% of Total', avgTime: 'Lab Assay < 5d', status: 'Controlled' },
    rows: [
      { num: 'CMP-2026-0004', prod: 'Rumicare Liquid 500ml', batch: 'RL2604', assayResult: 'Active ingredient 99.4% (Within limit)', outcome: 'Retained lot compliant' },
      { num: 'CMP-2026-0007', prod: 'Rumicare Powder 100g', batch: 'RP2607', assayResult: 'Active ingredient 98.8% (Within limit)', outcome: 'Clinical usage guideline re-issued' },
      { num: 'CMP-2026-0011', prod: 'Rumicare Liquid 500ml', batch: 'RL2611', assayResult: 'Microbiological test pending', outcome: 'External lab test in progress' },
    ],
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
    stats: { total: 4, percentage: '20%', avgTime: '1.2 days', status: 'Audited' },
    rows: [
      { num: 'CMP-2026-0003', prod: 'Rumicare Bolus 4s', batch: 'RC2603', sbu: 'AHP - Rumicare', reason: 'Transit carton crushed by courier; blisters undamaged', resolution: 'Courier claim filed, non-product defect', closedOn: '12/1/2024' },
      { num: 'CMP-2026-0008', prod: 'Rumicare Liquid 500ml', batch: 'RL2608', sbu: 'AHP - Rumicare', reason: 'Customer reported colour change after opening bottle 6 months ago', resolution: 'Retained sample checked & normal; opened storage issue', closedOn: '18/2/2024' },
      { num: 'CMP-2026-0014', prod: 'Rumicare Powder 100g', batch: 'RP2614', sbu: 'AHP - Rumicare', reason: 'Moisture ingress suspected by retailer without pouch leak', resolution: 'Factory seal intact, pinhole test negative', closedOn: '5/5/2024' },
      { num: 'CMP-2026-0019', prod: 'Rumicare Bolus 4s', batch: 'RC2619', sbu: 'AHP - Rumicare', reason: 'Unverified distributor stock reconciliation error', resolution: 'Duplicate complaint closed without investigation', closedOn: '22/8/2024' },
    ],
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
    stats: { total: 14, percentage: '87.5%', avgTime: '4.2 days', status: 'Compliant' },
    rows: [
      { num: 'CMP-2026-0001', prod: 'Rumicare Bolus 4s', batch: 'RC2601', sbu: 'AHP - Rumicare', intakeDate: '01/01/2026', closedDate: '05/01/2026', turnaround: '4 days', slaTarget: '15 days', slaStatus: 'Within SLA' },
      { num: 'CMP-2026-0002', prod: 'Rumicare Liquid 500ml', batch: 'RL2602', sbu: 'AHP - Rumicare', intakeDate: '03/01/2026', closedDate: '07/01/2026', turnaround: '4 days', slaTarget: '15 days', slaStatus: 'Within SLA' },
      { num: 'CMP-2026-0005', prod: 'Rumicare Powder 100g', batch: 'RP2605', sbu: 'AHP - Rumicare', intakeDate: '10/01/2026', closedDate: '15/01/2026', turnaround: '5 days', slaTarget: '15 days', slaStatus: 'Within SLA' },
      { num: 'CMP-2026-0006', prod: 'Rumicare Bolus 4s', batch: 'RC2606', sbu: 'AHP - Rumicare', intakeDate: '14/01/2026', closedDate: '18/01/2026', turnaround: '4 days', slaTarget: '15 days', slaStatus: 'Within SLA' },
      { num: 'CMP-2026-0010', prod: 'Rumicare Gel 250ml', batch: 'RG2610', sbu: 'AHP - Rumicare', intakeDate: '25/01/2026', closedDate: '31/01/2026', turnaround: '6 days', slaTarget: '15 days', slaStatus: 'Within SLA' },
      { num: 'CMP-2026-0015', prod: 'Rumicare Bolus 4s', batch: 'RC2615', sbu: 'AHP - Rumicare', intakeDate: '02/02/2026', closedDate: '06/02/2026', turnaround: '4 days', slaTarget: '15 days', slaStatus: 'Within SLA' },
    ],
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
    stats: { total: 34, percentage: '-41.2%', avgTime: '2025 vs 2026', status: 'Decreasing Trend' },
    rows: [
      { period: 'Calendar Year 2024', totalComplaints: 48, confirmed: 40, nonConfirmed: 8, resolutionRate: '98%', avgDays: '5.8 days' },
      { period: 'Calendar Year 2025', totalComplaints: 34, confirmed: 28, nonConfirmed: 6, resolutionRate: '100%', avgDays: '5.1 days' },
      { period: 'Calendar Year 2026 (YTD)', totalComplaints: 20, confirmed: 16, nonConfirmed: 4, resolutionRate: '100%', avgDays: '4.8 days' },
    ],
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
    stats: { total: 2, percentage: '10%', avgTime: '+4.5 days overdue', status: 'Escalated' },
    rows: [
      { num: 'CMP-2026-0011', prod: 'Rumicare Liquid 500ml', batch: 'RL2611', sbu: 'AHP - Rumicare', intakeDate: '15/10/2026', daysOpen: '19 days', slaTarget: '15 days', delayReason: 'External third-party lab microbiological test report awaited', frp: 'Sneha', status: 'In D3 Investigation' },
      { num: 'CMP-2026-0017', prod: 'Rumicare Bolus 4s', batch: 'RC2617', sbu: 'AHP - Rumicare', intakeDate: '22/10/2026', daysOpen: '17 days', slaTarget: '15 days', delayReason: 'Supplier raw material packaging foil audit in progress', frp: 'Jensy Josephine', status: 'In D3 Rework' },
    ],
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
    stats: { total: 2, percentage: '88% Reduction', avgTime: '30-Day Window', status: 'Positive Impact' },
    rows: [
      { defectType: 'Induction Seal Leakage', prod: 'Rumicare Liquid 500ml', baseline2025: '12 incidents', current2026: '1 incident', reductionPct: '91.7%', capaRef: 'CAPA-2026-001 (Induction sealing head replaced)' },
      { defectType: 'Foil Blister Pin-hole', prod: 'Rumicare Bolus 4s', baseline2025: '9 incidents', current2026: '1 incident', reductionPct: '88.9%', capaRef: 'CAPA-2026-004 (Blister tooling roller realigned)' },
      { defectType: 'Label Printing Smudge', prod: 'Rumicare Powder 100g', baseline2025: '6 incidents', current2026: '0 incidents', reductionPct: '100%', capaRef: 'CAPA-2025-019 (UV ink curing oven temperature calibrated)' },
    ],
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
    stats: { total: 4, percentage: '100% On-Time', avgTime: '1.2 days', status: '100% SLA Met' },
    rows: [
      { num: 'CMP-2026-0003', prod: 'Rumicare Bolus 4s', intakeDate: '08/01/2026', evaluatedDate: '09/01/2026', slaHours: '24 hrs', targetHours: '48 hrs', finding: 'Transit physical mishandling; blister intact' },
      { num: 'CMP-2026-0008', prod: 'Rumicare Liquid 500ml', intakeDate: '15/02/2026', evaluatedDate: '16/02/2026', slaHours: '28 hrs', targetHours: '48 hrs', finding: 'Cap opened for 6 months at farm; sample stable' },
      { num: 'CMP-2026-0014', prod: 'Rumicare Powder 100g', intakeDate: '02/05/2026', evaluatedDate: '03/05/2026', slaHours: '22 hrs', targetHours: '48 hrs', finding: 'Pouch seal validated with dye penetration test' },
      { num: 'CMP-2026-0019', prod: 'Rumicare Bolus 4s', intakeDate: '19/08/2026', evaluatedDate: '20/08/2026', slaHours: '20 hrs', targetHours: '48 hrs', finding: 'Duplicate claim already processed under CMP-2026-0018' },
    ],
  },
  // 19. User Report 7
  {
    id: 'rep-19',
    name: 'No of Previous Year Complaints Month wis',
    description: '',
    folder: 'Complaint Management Reports',
    createdBy: 'Narayan Rao Vakamudi',
    createdOn: '20/9/2023, 4:06 pm',
    subscribed: false,
    type: 'prev-year-monthly',
    stats: { total: 34, percentage: '2.8 / mo Avg', avgTime: '12 Months', status: 'Historical Baseline' },
    rows: [
      { month: 'January', complaints2025: 3, complaints2026: 2, variance: '-33%' },
      { month: 'February', complaints2025: 4, complaints2026: 2, variance: '-50%' },
      { month: 'March', complaints2025: 4, complaints2026: 3, variance: '-25%' },
      { month: 'April', complaints2025: 3, complaints2026: 2, variance: '-33%' },
      { month: 'May', complaints2025: 2, complaints2026: 1, variance: '-50%' },
      { month: 'June', complaints2025: 3, complaints2026: 2, variance: '-33%' },
      { month: 'July', complaints2025: 3, complaints2026: 2, variance: '-33%' },
      { month: 'August', complaints2025: 3, complaints2026: 2, variance: '-33%' },
      { month: 'September', complaints2025: 3, complaints2026: 2, variance: '-33%' },
      { month: 'October', complaints2025: 4, complaints2026: 1, variance: '-75%' },
      { month: 'November', complaints2025: 1, complaints2026: 1, variance: '0%' },
      { month: 'December', complaints2025: 1, complaints2026: '—', variance: '—' },
    ],
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
    stats: { total: 16, percentage: '93.7% On-Time', avgTime: '4.8 days', status: 'High Compliance' },
    rows: [
      { num: 'CMP-2026-0001', d1AckSla: '2.1 hrs (Met)', d2FrpSla: '12 hrs (Met)', d3CapaSla: '4 days (Met)', d4CloseSla: '5 days (Met)', overallStatus: 'Compliant' },
      { num: 'CMP-2026-0002', d1AckSla: '1.8 hrs (Met)', d2FrpSla: '14 hrs (Met)', d3CapaSla: '3 days (Met)', d4CloseSla: '4 days (Met)', overallStatus: 'Compliant' },
      { num: 'CMP-2026-0004', d1AckSla: '2.4 hrs (Met)', d2FrpSla: '16 hrs (Met)', d3CapaSla: 'In Progress', d4CloseSla: 'Pending D3', overallStatus: 'On Schedule' },
      { num: 'CMP-2026-0005', d1AckSla: '1.5 hrs (Met)', d2FrpSla: '10 hrs (Met)', d3CapaSla: '4 days (Met)', d4CloseSla: '5 days (Met)', overallStatus: 'Compliant' },
      { num: 'CMP-2026-0007', d1AckSla: '3.0 hrs (Met)', d2FrpSla: '18 hrs (Met)', d3CapaSla: 'In Progress', d4CloseSla: 'Pending D3', overallStatus: 'On Schedule' },
      { num: 'CMP-2026-0011', d1AckSla: '2.0 hrs (Met)', d2FrpSla: '24 hrs (Met)', d3CapaSla: 'Overdue (+4d)', d4CloseSla: 'Pending Lab', overallStatus: 'Escalated' },
    ],
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
    stats: { total: 12, percentage: '88% On-Time', avgTime: '6.4 days', status: 'Compliant' },
    rows: [
      { num: 'CMP-2026-0003', prod: 'Rumicare Bolus 4s', batch: 'RC2603', intakeDate: '05/01/2026', closedDate: '11/01/2026', daysToClose: '6 days', target: '15 days' },
      { num: 'CMP-2026-0008', prod: 'Rumicare Liquid 500ml', batch: 'RL2608', intakeDate: '12/01/2026', closedDate: '19/01/2026', daysToClose: '7 days', target: '15 days' },
    ],
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
    stats: { total: 20, percentage: '80% Confirmed', avgTime: '4 Confirmed / 1 Not', status: 'Active' },
    rows: [
      { category: 'Confirmed Complaints', count: 16, percentage: '80.0%', description: 'Attributed to product, packaging, or formulation defect' },
      { category: 'Not-Confirmed Complaints', count: 4, percentage: '20.0%', description: 'Transit mishandling, dispensing error, or unverified distributor claim' },
    ],
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
    stats: { total: 14, percentage: '70% of Pipeline', avgTime: '4.2 days avg open', status: 'Under Action' },
    rows: [
      { num: 'CMP-2026-0004', prod: 'Rumicare Liquid 500ml', batch: 'RL2604', stage: 'D2 In Progress', daysOpen: '4 days', assignedFrp: 'Sneha' },
      { num: 'CMP-2026-0007', prod: 'Rumicare Powder 100g', batch: 'RP2607', stage: 'D3 Root Cause', daysOpen: '7 days', assignedFrp: 'Jensy Josephine' },
      { num: 'CMP-2026-0011', prod: 'Rumicare Liquid 500ml', batch: 'RL2611', stage: 'D3 Root Cause', daysOpen: '6 days', assignedFrp: 'Sneha' },
    ],
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
    stats: { total: 6, percentage: '30% of Pipeline', avgTime: '4.8 days avg turnaround', status: 'Resolved' },
    rows: [
      { num: 'CMP-2026-0001', prod: 'Rumicare Bolus 4s', batch: 'RC2601', closedDate: '05/01/2026', daysToClose: '4 days', resolution: 'Batch assay re-tested and released' },
      { num: 'CMP-2026-0002', prod: 'Rumicare Liquid 500ml', batch: 'RL2602', closedDate: '07/01/2026', daysToClose: '4 days', resolution: 'Cap torque re-calibrated on filling line' },
    ],
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
    stats: { total: 8, percentage: '100% On-Time', avgTime: '3.8 days', status: 'Compliant' },
    rows: [
      { num: 'CMP-2026-0009', prod: 'Rumicare Bolus 4s', issueType: 'Blister Foil Crushed', daysToClose: '3 days', slaTarget: '15 days' },
      { num: 'CMP-2026-0012', prod: 'Rumicare Liquid 500ml', issueType: 'Cap Seal Leakage', daysToClose: '4 days', slaTarget: '15 days' },
    ],
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
    stats: { total: 20, percentage: '100% Quality Audited', avgTime: '4.8 days avg resolution', status: 'All Systems Nominal' },
    rows: [
      { metric: 'Total Complaints Received (YTD)', value: '20', trend: '-41.2% YoY', status: 'Optimal' },
      { metric: 'Confirmed vs Non-Confirmed Ratio', value: '16 : 4 (80% / 20%)', trend: 'Stable', status: 'Optimal' },
      { metric: 'SLA Adherence Rate', value: '95.0%', trend: '+8.3%', status: 'Compliant' },
      { metric: 'CAPA Implementation Rate', value: '100% (2 of 2 actions)', trend: 'Closed', status: 'Verified' },
    ],
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
    stats: { total: 14, percentage: '70% Manufacturing / Packing', avgTime: 'In-House Quality Scope', status: 'Controlled' },
    rows: [
      { department: 'Production / Compounding', total: 6, open: 4, closed: 2, primaryIssue: 'Formulation dissolution rate verification' },
      { department: 'Primary Packaging (Strip / Blister)', total: 5, open: 3, closed: 2, primaryIssue: 'Foil seal inspection & temperature log' },
      { department: 'Warehouse & Internal Logistics', total: 3, open: 2, closed: 1, primaryIssue: 'Carton stacking integrity' },
    ],
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
    stats: { total: 6, percentage: '30% Contract Mfg', avgTime: 'CMO Partner Audit', status: 'Active Surveillance' },
    rows: [
      { cmoPartner: 'CMO Unit-1 (Bangalore)', siteCode: 'CMO-BLR-01', totalComplaints: 3, open: 2, closed: 1, complianceStatus: 'Audited' },
      { cmoPartner: 'CMO Unit-2 (Hyderabad)', siteCode: 'CMO-HYD-02', totalComplaints: 2, open: 1, closed: 1, complianceStatus: 'Audited' },
      { cmoPartner: 'CMO Unit-3 (Baddi)', siteCode: 'CMO-BDD-03', totalComplaints: 1, open: 0, closed: 1, complianceStatus: 'Certified' },
    ],
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
    stats: { total: 9, percentage: '45% Manufacturing Origin', avgTime: 'Batch Root Cause Tracked', status: 'Investigated' },
    rows: [
      { plantLocation: 'Bangalore Plant (Unit-I)', batchSeries: 'RC2601 - RC2610', count: 5, rootCause: 'Machinery speed variance during high humidity shift', status: 'Corrected' },
      { plantLocation: 'Hosur Manufacturing Facility', batchSeries: 'RL2602 - RL2615', count: 4, rootCause: 'Torque tightening calibration threshold adjusted', status: 'Corrected' },
    ],
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
    stats: { total: 20, percentage: '55% Field Veterinarians', avgTime: 'Customer Origin', status: 'All Channels' },
    rows: [
      { channel: 'Veterinary Practitioners / Clinics', complaintsCount: 11, percentage: '55.0%', primaryComplaint: 'Efficacy / Clinical outcome' },
      { channel: 'Authorized Stockists & Distributors', complaintsCount: 5, percentage: '25.0%', primaryComplaint: 'Outer packaging / transit' },
      { channel: 'Dairy Farmers & End-Users', complaintsCount: 3, percentage: '15.0%', primaryComplaint: 'Palatability / bolus administration' },
      { channel: 'Internal QA / Field Audit', complaintsCount: 1, percentage: '5.0%', primaryComplaint: 'Label verification' },
    ],
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
    stats: { total: 20, percentage: '100% SKU Coverage', avgTime: 'SKU Distribution', status: 'Updated' },
    rows: [
      { product: 'Rumicare Bolus 4s', skuCode: 'RUM-BOL-4S', totalComplaints: 9, open: 6, closed: 3, ratePpm: '24 PPM' },
      { product: 'Rumicare Liquid 500ml', skuCode: 'RUM-LIQ-500', totalComplaints: 7, open: 5, closed: 2, ratePpm: '18 PPM' },
      { product: 'Rumicare Powder 100g', skuCode: 'RUM-PWD-100', totalComplaints: 3, open: 2, closed: 1, ratePpm: '11 PPM' },
      { product: 'Rumicare Gel 250ml', skuCode: 'RUM-GEL-250', totalComplaints: 1, open: 1, closed: 0, ratePpm: '6 PPM' },
    ],
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
    stats: { total: 16, percentage: 'Top 10 Accounts', avgTime: 'Customer Health Score', status: 'Under Account Mgmt' },
    rows: [
      { customerName: 'North Star Veterinary Clinic', location: 'Ambala, Punjab', complaintsCount: 3, open: 1, keyConcern: 'Liquid cap seal leakage' },
      { customerName: 'Apex Animal Care & Feeds', location: 'Ahmedabad, Gujarat', complaintsCount: 3, open: 2, keyConcern: 'Bolus disintegration rate' },
      { customerName: 'Krishna Medical Agencies', location: 'Guntur, AP', complaintsCount: 2, open: 1, keyConcern: 'Outer carton transit damage' },
      { customerName: 'Shiv Dairy Supplies', location: 'Pune, Maharashtra', complaintsCount: 2, open: 0, keyConcern: 'Expiry print legibility' },
    ],
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
    stats: { total: 20, percentage: '70% Open / 30% Closed', avgTime: 'Workflow Pipeline', status: 'In Process' },
    rows: [
      { stageCode: 'D1', stageName: 'Awaiting Acknowledgement', count: 9, percentage: '45.0%', slaTargetDays: '2 days' },
      { stageCode: 'D2', stageName: 'Awaiting FRP Assignment', count: 2, percentage: '10.0%', slaTargetDays: '3 days' },
      { stageCode: 'D3', stageName: 'In Investigation / Root Cause', count: 1, percentage: '5.0%', slaTargetDays: '7 days' },
      { stageCode: 'D4', stageName: 'In D4 / CAPA Implementation', count: 2, percentage: '10.0%', slaTargetDays: '5 days' },
      { stageCode: 'Done', stageName: 'Closed & QA Verified', count: 6, percentage: '30.0%', slaTargetDays: '15 days' },
    ],
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
    stats: { total: 20, percentage: 'Animal Health SBU', avgTime: 'Business Unit Breakdown', status: 'Active' },
    rows: [
      { sbuName: 'Animal Health Products (AHP) - Large Animal', divisionHead: 'Dr. Ramesh Sharma', total: 14, open: 10, closed: 4 },
      { sbuName: 'Animal Health Products (AHP) - Poultry', divisionHead: 'Dr. K. Srinivas', total: 4, open: 3, closed: 1 },
      { sbuName: 'Companion Animal Care (CAC)', divisionHead: 'Dr. Priya Menon', total: 2, open: 1, closed: 1 },
    ],
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
    stats: { total: 20, percentage: 'Current Year 2026', avgTime: 'Monthly Velocity', status: 'Tracked' },
    rows: [
      { month: 'January 2026', complaintsReceived: 7, closedOnTime: 5, openAtMonthEnd: 2 },
      { month: 'February 2026', complaintsReceived: 8, closedOnTime: 1, openAtMonthEnd: 7 },
      { month: 'March 2026 (MTD)', complaintsReceived: 5, closedOnTime: 0, openAtMonthEnd: 5 },
    ],
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
    stats: { total: 20, percentage: 'Defect Classification', avgTime: 'Failure Analysis', status: 'Categorized' },
    rows: [
      { failureCategory: 'Product Efficacy / Sub-potent Claim', count: 8, percentage: '40.0%', department: 'Formulation QA' },
      { failureCategory: 'Packaging Integrity & Leakage', count: 5, percentage: '25.0%', department: 'Packaging Quality' },
      { failureCategory: 'Labeling & Batch Print Smudge', count: 3, percentage: '15.0%', department: 'Secondary Packing' },
      { failureCategory: 'Physical Appearance / Color Variation', count: 2, percentage: '10.0%', department: 'Compounding' },
      { failureCategory: 'Transit & Handling Damage', count: 2, percentage: '10.0%', department: 'Supply Chain / Logistics' },
    ],
  },
];

export function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState(NARAYAN_RAO_REPORTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSidebar, setActiveSidebar] = useState('all-folders');
  const [activeReport, setActiveReport] = useState(null); // Report Runner Modal
  const [newReportModalOpen, setNewReportModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [rowMenuOpenId, setRowMenuOpenId] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter reports according to search and left sidebar
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

  const handleCreateReport = (e) => {
    e.preventDefault();
    if (!newReportName.trim()) return;
    const newEntry = {
      id: `rep-${Date.now()}`,
      name: newReportName.trim(),
      description: '',
      folder: 'Complaint Management Reports',
      createdBy: 'Narayan Rao Vakamudi',
      createdOn: new Date().toLocaleString(),
      subscribed: false,
      type: 'custom',
      stats: { total: 0, percentage: '0%', avgTime: '—', status: 'New' },
      rows: [],
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
        <div className="flex flex-col md:flex-row min-h-[500px]">
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
                    className="py-2.5 px-3 min-w-[280px] cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Name</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Description Column */}
                  <th
                    onClick={() => toggleSort('description')}
                    className="py-2.5 px-3 min-w-[120px] cursor-pointer hover:bg-slate-100 transition hidden sm:table-cell"
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
                    className="py-2.5 px-3 min-w-[160px] cursor-pointer hover:bg-slate-100 transition"
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

                  {/* Actions Column */}
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

                      {/* Description (Empty matching screenshot) */}
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-sm hidden sm:table-cell">
                        {report.description || ''}
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

                      {/* Subscribed Star */}
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
                  Authored by {activeReport.createdBy} on {activeReport.createdOn} • As of Today, {new Date().toLocaleDateString()}
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
                  <span className="text-xs text-slate-500 block">Report Scope Count</span>
                  <span className="text-xl font-bold text-slate-900">{activeReport.stats?.total ?? 20}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">SLA Metric / Rate</span>
                  <span className="text-xl font-bold text-blue-600">{activeReport.stats?.percentage ?? '90%'}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Cycle / Lead Time</span>
                  <span className="text-xl font-bold text-emerald-600">{activeReport.stats?.avgTime ?? '4.8 days'}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Audit Status</span>
                  <span className="text-xl font-bold text-slate-800">{activeReport.stats?.status ?? 'Compliant'}</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-xs text-slate-700 flex justify-between items-center">
                  <span>Report Records: {activeReport.name}</span>
                  <span className="text-slate-400 font-normal">Author: Narayan Rao Vakamudi</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#fafafb] text-slate-600 font-medium">
                        {activeReport.rows && activeReport.rows.length > 0 &&
                          Object.keys(activeReport.rows[0]).map((key) => (
                            <th key={key} className="py-2 px-3 capitalize">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeReport.rows && activeReport.rows.length > 0 ? (
                        activeReport.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.entries(row).map(([k, val], cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-2 px-3 ${
                                  cIdx === 0
                                    ? 'font-semibold text-blue-600'
                                    : k.toLowerCase().includes('status')
                                    ? 'font-medium text-emerald-700'
                                    : 'text-slate-700'
                                }`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No records currently recorded for this report.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                End of report output for <strong>{activeReport.name}</strong>
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
                  placeholder="e.g. Non - Confirmed: Complaints SLA Reports"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Author / Created By</label>
                <input
                  type="text"
                  readOnly
                  value="Narayan Rao Vakamudi"
                  className="w-full px-3 py-2 rounded border border-slate-200 bg-slate-50 text-slate-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Folder</label>
                <select className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:border-blue-600">
                  <option value="Complaint Management Reports">Complaint Management Reports</option>
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
    </div>
  );
}
