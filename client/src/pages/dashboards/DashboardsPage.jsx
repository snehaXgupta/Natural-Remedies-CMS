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

// Baseline Historical & Mock Data from Salesforce Screenshot
const BASELINE_COMPLAINTS = [
  // Database complaints
  { id: 'c-1', num: 'AHP-26-11-001', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', stage: 'Closed', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'KOLIN PLUS FC', customer: 'AIDP', failure: 'Assay Release', withinSla: true },
  { id: 'c-2', num: 'AHP-26-11-002', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', stage: 'Closed', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'KOLIN PLUS FC', customer: 'Herbalife', failure: 'Documentation', withinSla: true },
  { id: 'c-3', num: 'AHP-26-11-003', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', stage: 'Closed', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'Phytocare Ruchi', customer: 'INCD', failure: 'Reconciliation', withinSla: true },
  { id: 'c-4', num: 'AHP-26-11-004', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', stage: 'D2', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'KOLIN PLUS FC', customer: 'IMCD Australia', failure: 'Bioavailability', withinSla: true },
  { id: 'c-5', num: 'AHP-26-11-005', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', stage: 'D3', locType: 'CMO', locDetail: 'Shamanur pharma-3033', creator: 'Complaint Capture Site Gu...', product: 'KOLIN PLUS FC', customer: 'Innochroma', failure: 'Granulation Homogeneity', withinSla: true },
  { id: 'c-6', num: 'AHP-26-11-006', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', stage: 'D2', locType: 'CMO', locDetail: 'JCK-3004', creator: 'Akrati Singh', product: 'Phytocare Ruchi', customer: 'NA', failure: 'Induction Seal Leakage', withinSla: false },
  { id: 'c-7', num: 'AHP-26-11-007', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', stage: 'D4', locType: 'Inhouse', locDetail: 'NLPL- Pithampur Indore-70...', creator: 'Muskan Goel', product: 'Becomind', customer: 'Aabha Marketing', failure: 'Dissolution Delay', withinSla: true },

  // Stage distribution & Inhouse / CMO mapping from screenshot
  { id: 'b-1', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'Phytocare Ruchi', customer: 'AIDP', withinSla: true },
  { id: 'b-2', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'Phytocare Ruchi', customer: 'Herbalife', withinSla: true },
  { id: 'b-3', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'Phytocare Ruchi', customer: 'AIDP', withinSla: true },
  { id: 'b-4', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Chandan Hj', product: 'Becomind', customer: 'INCD', withinSla: true },
  { id: 'b-5', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Chandan Hj', product: 'Feed-X', customer: 'IMCD Australia', withinSla: true },
  { id: 'b-6', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Chandan Hj', product: 'Feed-X', customer: 'Innochroma', withinSla: true },
  { id: 'b-7', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'Galgant', customer: 'NA', withinSla: true },
  { id: 'b-8', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'Galgant', customer: 'Aabha Marketing Company', withinSla: true },
  { id: 'b-9', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Chandan Hj', product: 'NRAts7', customer: 'AGRICOLA ORGANICO', withinSla: true },
  { id: 'b-10', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Chandan Hj', product: 'NRAts7', customer: 'AIDP Inc.', withinSla: true },
  { id: 'b-11', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NLPL- Pithampur Indore-70...', creator: 'Complaint Capture Site Gu...', product: 'Allercese /NRA2/ (AS000)', customer: 'B K MEDICAL', withinSla: true },
  { id: 'b-12', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NLPL- Pithampur Indore-70...', creator: 'Complaint Capture Site Gu...', product: 'Ashvapure', customer: 'BVD', withinSla: true },
  { id: 'b-13', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'Corn silk granules', customer: 'BVD Thailand', withinSla: true },
  { id: 'b-14', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'Curzerone', customer: 'CPF India', withinSla: true },
  { id: 'b-15', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'Doodhsaagar 10kg', customer: 'CPF - India', withinSla: true },
  { id: 'b-16', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'Ginger Extract 4% - NNZ004', customer: 'CPF India', withinSla: true },
  { id: 'b-17', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'Himalayan Batsa (10g)', customer: 'CPP Indonesia', withinSla: true },
  { id: 'b-18', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'Holixer', customer: 'Daebo', withinSla: true },
  { id: 'b-19', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-HHP-2100', creator: 'Chandan Hj', product: 'Kolin Plus', customer: 'Dairy Farm', withinSla: true },
  { id: 'b-20', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NLPL- Pithampur Indore-70...', creator: 'Chandan Hj', product: 'Momordica Charantia Extract', customer: 'EMAMI GROUP', withinSla: true },

  // D3 Stage (17 items)
  { id: 'd3-1', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'Phytocare Ruchi', customer: 'GK VET Sangamner', withinSla: true },
  { id: 'd3-2', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'KOLIN PLUS FC', customer: 'Herbalife Nutrition', withinSla: true },
  { id: 'd3-3', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'Neblon', customer: 'Murnau Oomikron', withinSla: true },
  { id: 'd3-4', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'NNGQP10HRD Glycyrrhiza glabra', customer: 'IMCD, Australia', withinSla: true },
  { id: 'd3-5', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: 'CMO', locDetail: 'Shamanur pharma-3033', creator: 'Complaint Capture Site Gu...', product: 'Ocimum sanctum and Becomind', customer: 'AIDP', withinSla: true },
  { id: 'd3-6', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'CMO', locDetail: 'Shamanur pharma-3033', creator: 'Complaint Capture Site Gu...', product: 'Phytocal Ruchi Slt', customer: 'Herbalife', withinSla: true },
  { id: 'd3-7', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'CMO', locDetail: 'Shamanur pharma-3033', creator: 'Complaint Capture Site Gu...', product: 'Phytocare Ruchi', customer: 'INCD', withinSla: true },
  { id: 'd3-8', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'CMO', locDetail: 'JCK-3004', creator: 'Complaint Capture Site Gu...', product: 'KOLIN PLUS FC', customer: 'IMCD Australia', withinSla: true },
  { id: 'd3-9', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'CMO', locDetail: 'Harshavardhan-4200', creator: 'Amandeep Sangra', product: 'Becomind', customer: 'Innochroma', withinSla: true },
  { id: 'd3-10', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'CMO', locDetail: 'Harshavardhan-4200', creator: 'ComplaintRequest Site Gu...', product: 'Feed-X', customer: 'NA', withinSla: true },
  { id: 'd3-11', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'CMO', locDetail: 'Indus spray-3003', creator: 'EQMS Common user', product: 'Galgant', customer: 'AIDP', withinSla: true },
  { id: 'd3-12', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'CMO', locDetail: 'Venkat pharma-3007', creator: 'Josephine Jensy', product: 'Rumicare Bolus 4s', customer: 'Herbalife', withinSla: true },
  { id: 'd3-13', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Meena MS', product: 'Rumicare Liquid 500ml', customer: 'Aabha Marketing', withinSla: true },
  { id: 'd3-14', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Sanjeev Kumar R', product: 'Rumicare Powder 100g', customer: 'Apoorva Pet Palace', withinSla: false },
  { id: 'd3-15', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Chandan Hj', product: 'Rumicare Gel 250ml', customer: 'Dynvac pvt Ltd', withinSla: false },
  { id: 'd3-16', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Chandan Hj', product: 'HEPASURE', customer: 'NUTAN MEDICAL HALL', withinSla: true },
  { id: 'd3-17', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'Fresh me up Foam', customer: 'Kukuaja Agencies', withinSla: true },

  // D2 Stage (5 items)
  { id: 'd2-1', stage: 'D2', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Complaint Capture Site Gu...', product: 'Judiclean', customer: 'Abhi Enterprices', withinSla: true },
  { id: 'd2-2', stage: 'D2', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'Lushme up', customer: 'Website', withinSla: true },
  { id: 'd2-3', stage: 'D2', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Anniyalam-AHP-2000', creator: 'Complaint Capture Site Gu...', product: 'Reliflam', customer: 'Yadhava priyan', withinSla: true },

  // D4 Stage (2 items)
  { id: 'd4-1', stage: 'D4', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: 'Inhouse', locDetail: 'NRPL-Bangalore-1100', creator: 'Chandan Hj', product: 'Fresh Me Up', customer: 'Yadhava priyan', withinSla: true },

  // Unassigned Location (-) (12 items)
  { id: 'u-1', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'Orthoron Tablets', customer: 'BOW MEOW, Bangalore', withinSla: true },
  { id: 'u-2', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'HEPASURE', customer: 'BOW MEOW, Bangalore', withinSla: true },
  { id: 'u-3', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'HEPASURE', customer: 'BOW MEOW, Bangalore', withinSla: true },
  { id: 'u-4', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'Lush Me Up 175 ml', customer: 'Kukuaja Agencies', withinSla: true },
  { id: 'u-5', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'Nellife 30 ml', customer: 'Abhi Enterprices', withinSla: true },
  { id: 'u-6', stage: 'D2', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'Phytocare Ruchi', customer: 'AIDP', withinSla: true },
  { id: 'u-7', stage: 'D2', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: '-', locDetail: 'Unassigned', creator: 'Chandan Hj', product: 'KOLIN PLUS FC', customer: 'Herbalife', withinSla: true },
  { id: 'u-8', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: '-', locDetail: 'Unassigned', creator: 'Chandan Hj', product: 'Rumicare Bolus 4s', customer: 'INCD', withinSla: true },
  { id: 'u-9', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: '-', locDetail: 'Unassigned', creator: 'Chandan Hj', product: 'Rumicare Liquid 500ml', customer: 'IMCD Australia', withinSla: true },
  { id: 'u-10', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'February', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'Rumicare Powder 100g', customer: 'Innochroma', withinSla: false },
  { id: 'u-11', stage: 'D3', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'March', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'Rumicare Gel 250ml', customer: 'NA', withinSla: true },
  { id: 'u-12', stage: 'Closed', sbu: 'AHP Rumicare', year: 'FY 2026', month: 'January', locType: '-', locDetail: 'Unassigned', creator: 'Complaint Capture Site Gu...', product: 'HEPASURE', customer: 'Aabha Marketing', withinSla: true },
];

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
  const [lastRefreshed, setLastRefreshed] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );

  const fetchLiveComplaints = () => {
    complaintApi
      .list({ limit: 100 })
      .then((res) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setDbComplaints(items);
        }
        setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch(() => { });
  };

  useEffect(() => {
    fetchLiveComplaints();
  }, []);

  // Merged complaints pool: Baseline + MongoDB Live records
  const allComplaints = useMemo(() => {
    const list = [...BASELINE_COMPLAINTS];
    if (dbComplaints.length > 0) {
      dbComplaints.forEach((c, idx) => {
        list.push({
          id: c._id || `db-live-${idx}`,
          num: c.complaintNumber || `CMP-${idx}`,
          sbu: c.sbu || 'AHP Rumicare',
          year: 'FY 2026',
          month: 'March',
          stage: c.stage === 'CLOSED' || (c.status || '').toUpperCase() === 'CLOSED' ? 'Closed' : c.stage || 'D1',
          locType: c.d2?.investigation?.manufacturingLocation || 'Inhouse',
          locDetail: c.d2?.investigation?.locationDetail || 'NRPL-Bangalore-1100',
          creator: c.createdBy?.name || user?.name || 'Chandan Hj',
          product: c.reportedProduct?.name || c.productDetails?.productName || c.productName || 'KOLIN PLUS FC',
          customer: c.customer?.name || c.complainant?.name || 'AIDP',
          failure: c.d2?.investigation?.typeOfFailure || 'Induction Seal Leakage',
          withinSla: true,
        });
      });
    }
    return list;
  }, [dbComplaints, user]);

  // Apply Filter Dropdowns (SBU, FinancialYear, Date)
  const filteredComplaints = useMemo(() => {
    return allComplaints.filter((c) => {
      if (sbuFilter !== 'All' && c.sbu !== sbuFilter) return false;
      if (fyFilter !== 'All') {
        const targetYear = fyFilter.replace('equals ', '').trim();
        if (c.year !== targetYear) return false;
      }
      return true;
    });
  }, [allComplaints, sbuFilter, fyFilter, dateFilter]);

  // -------------------------------------------------------------
  // DYNAMIC COMPUTATIONS FOR EACH OF THE 11 KPI CARDS
  // -------------------------------------------------------------

  // Card 1: No of Current Complaints Month wise
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

  // Card 3: Complaint Stage wise Overview (D1, D2, D3, D4, Closed)
  const stageData = useMemo(() => {
    const order = ['D1', 'D2', 'D3', 'D4', 'Closed'];
    const counts = { D1: 0, D2: 0, D3: 0, D4: 0, Closed: 0 };
    filteredComplaints.forEach((c) => {
      const s = c.stage === 'Done' ? 'Closed' : c.stage;
      if (counts[s] !== undefined) counts[s]++;
      else if (s === 'CLOSED' || s === 'Closed') counts.Closed++;
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

  // Card 5: Inhouse Report (Location detail)
  const inhouseData = useMemo(() => {
    const counts = {
      'NRPL-Bangalore-1100': 0,
      'NRPL-Anniyalam-AHP-2000': 0,
      'NRPL-Anniyalam-HHP-2100': 0,
      'NLPL- Pithampur Indore-70...': 0,
    };
    filteredComplaints.forEach((c) => {
      if (c.locType === 'Inhouse' && c.locDetail) {
        counts[c.locDetail] = (counts[c.locDetail] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([loc, count]) => ({ label: loc, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 6: CMO Wise Report (Location detail)
  const cmoData = useMemo(() => {
    const counts = {
      'Shamanur pharma-3033': 0,
      'JCK-3004': 0,
      'Harshavardhan-4200': 0,
      'Indus spray-3003': 0,
      'Venkat pharma-3007': 0,
    };
    filteredComplaints.forEach((c) => {
      if (c.locType === 'CMO' && c.locDetail) {
        counts[c.locDetail] = (counts[c.locDetail] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([loc, count]) => ({ label: loc, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 7: Report by Manufacturing (Funnel: [-], Inhouse, CMO)
  const manufacturingData = useMemo(() => {
    let unassigned = 0;
    let inhouse = 0;
    let cmo = 0;
    filteredComplaints.forEach((c) => {
      if (c.locType === 'Inhouse') inhouse++;
      else if (c.locType === 'CMO') cmo++;
      else unassigned++;
    });
    const total = filteredComplaints.length || 1;
    return {
      total: filteredComplaints.length,
      unassigned: { count: unassigned, pct: ((unassigned / total) * 100).toFixed(2) },
      inhouse: { count: inhouse, pct: ((inhouse / total) * 100).toFixed(2) },
      cmo: { count: cmo, pct: ((cmo / total) * 100).toFixed(2) },
    };
  }, [filteredComplaints]);

  // Card 8: Complaint Raised by
  const raisedByData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      const cr = c.creator || 'Chandan Hj';
      counts[cr] = (counts[cr] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([creator, count]) => ({ label: creator, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 9: Product Wise Complaints
  const productData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      const p = c.product || 'KOLIN PLUS FC';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([product, count]) => ({ label: product, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Card 10: Customer Wise Complaints
  const customerData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach((c) => {
      const cust = c.customer || 'NA';
      counts[cust] = (counts[cust] || 0) + 1;
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

  const maxStageCount = Math.max(...stageData.map((d) => d.count), 28);
  const maxInhouse = Math.max(...inhouseData.map((d) => d.count), 15);
  const maxCmo = Math.max(...cmoData.map((d) => d.count), 4);
  const maxRaisedBy = Math.max(...raisedByData.map((d) => d.count), 30);
  const maxProduct = Math.max(...productData.map((d) => d.count), 6);
  const maxCustomer = Math.max(...customerData.map((d) => d.count), 3);

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
              As of 23-Nov-2026, {lastRefreshed} • Viewing as {user?.name || 'Chandan Hj'}
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
                <option value="AHP Rumicare">AHP Rumicare</option>
                <option value="Animal Health Products">Animal Health Products</option>
                <option value="Companion Animal Care">Companion Animal Care</option>
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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (No of Current Complaints...)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
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
                          style={{ width: `${Math.min((f.count / 8) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Complaints by Type of Fail...)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
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
                <span>Record Count: {filteredComplaints.length}</span>
                <span>Stage</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Complaint Stage wise Over...)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
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
                        style={{ height: `${Math.min((item.count / 20) * 100, 95)}%` }}
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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (SBU's Wise Reports)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 5: Inhouse Report (Horizontal Bar Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Inhouse Report
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Horizontal Bar Chart matching screenshot */}
            <div className="py-3 space-y-2 min-h-[190px]">
              <div className="flex justify-between text-[9px] text-slate-400 pb-1 border-b border-slate-100">
                <span>Location detail</span>
                <span>Record Count (0 - 15)</span>
              </div>
              {inhouseData.map((loc) => {
                const widthPct = Math.max((loc.count / maxInhouse) * 100, 2);
                return (
                  <div key={loc.label} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span className="truncate max-w-[170px]" title={loc.label}>
                        {loc.label}
                      </span>
                      <span className="font-bold text-slate-800">{loc.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-xs h-3.5 overflow-hidden">
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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Inhouse Report)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
          </div>
        </div>

        {/* ========================================================
            CARD 6: CMO Wise Report (Horizontal Bar Chart)
           ======================================================== */}
        <div className="bg-white border border-slate-300 rounded-md shadow-2xs p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                CMO Wise Report
              </h3>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" onClick={fetchLiveComplaints} title="Refresh">
                  <RotateCw className="h-3.5 w-3.5 hover:text-slate-600" />
                </button>
                <Maximize2 className="h-3.5 w-3.5 hover:text-slate-600" />
              </div>
            </div>

            {/* Horizontal Bar Chart matching screenshot */}
            <div className="py-3 space-y-2 min-h-[190px]">
              <div className="flex justify-between text-[9px] text-slate-400 pb-1 border-b border-slate-100">
                <span>Location detail</span>
                <span>Record Count (0 - 4)</span>
              </div>
              {cmoData.map((cmo) => {
                const widthPct = Math.max((cmo.count / maxCmo) * 100, 2);
                return (
                  <div key={cmo.label} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span className="truncate max-w-[170px]" title={cmo.label}>
                        {cmo.label}
                      </span>
                      <span className="font-bold text-slate-800">{cmo.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-xs h-3.5 overflow-hidden">
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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (CMO Wise Report)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
          </div>
        </div>

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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Report by Manufacturing)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Complaint Raised By)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Product Wise Complaints)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
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
                <span>Record Count (0 - 3)</span>
              </div>
              {customerData.slice(0, 10).map((c) => {
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
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Customer Wise Complaints)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
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
            <Link to="/reports" className="text-[#0176d3] hover:underline font-medium">
              View Report (Total Complaints SLA Report)
            </Link>
            <span>As of 23-Nov-2026, {lastRefreshed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
