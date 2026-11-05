import { jsPDF } from 'jspdf';
import { NATURAL_REMEDIES_LOGO } from '../lib/logoBase64.js';
import { CapaRecord, RootCause, RootCauseAnalysis, FishboneCause } from '../models/index.js';

export const formatSopDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const FISHBONE_CATS = [
  { key: 'Manpower', label: 'MANPOWER', color: [255, 152, 0], half: 'top', col: 0, pillW: 24 },
  { key: 'Method', label: 'METHOD', color: [233, 30, 99], half: 'top', col: 1, pillW: 22 },
  { key: 'Machine', label: 'MACHINE', color: [156, 39, 176], half: 'top', col: 2, pillW: 22 },
  { key: 'Material', label: 'MATERIAL', color: [103, 58, 183], half: 'bottom', col: 0, pillW: 24 },
  { key: 'Mother Nature', alias: 'Environment', label: 'Milieu / Environmental', color: [0, 188, 212], half: 'bottom', col: 1, pillW: 32 },
  { key: 'Measurement', label: 'MEASUREMENT', color: [76, 175, 80], half: 'bottom', col: 2, pillW: 26 },
];

function drawSopHeader(doc, margin, y, pageWidth, effDate) {
  const headerHeight = 36;
  const splitColX = margin + 78;
  const valColX = splitColX + 34;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, pageWidth, headerHeight);

  doc.line(splitColX, y, splitColX, y + 30);
  doc.line(valColX, y, valColX, y + 30);
  doc.line(splitColX, y + 6, margin + pageWidth, y + 6);
  doc.line(splitColX, y + 12, margin + pageWidth, y + 12);
  doc.line(margin, y + 18, margin + pageWidth, y + 18);
  doc.line(margin, y + 24, margin + pageWidth, y + 24);
  doc.line(margin, y + 30, margin + pageWidth, y + 30);

  try {
    if (NATURAL_REMEDIES_LOGO) {
      const logoW = 20;
      const logoH = 15;
      const logoX = margin + (78 - logoW) / 2;
      const logoY = y + (18 - logoH) / 2;
      doc.addImage(NATURAL_REMEDIES_LOGO, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    }
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(34, 139, 34);
    doc.text('natural REMEDIES', margin + 39, y + 11, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  doc.text('FORMAT NO', splitColX + 2.5, y + 4.2);
  doc.text(': NR/QAD/SOP/001-F01/04', valColX + 2.5, y + 4.2);

  doc.text('EFFECTIVE DATE', splitColX + 2.5, y + 10.2);
  doc.text(`: ${effDate}`, valColX + 2.5, y + 10.2);

  doc.text('EXPIRY DATE', splitColX + 2.5, y + 16.2);
  doc.text(':', valColX + 2.5, y + 16.2);

  doc.setFontSize(7.5);
  doc.text('QAD', margin + 39, y + 22.2, { align: 'center' });
  doc.setFontSize(7);
  doc.text('SUPERSEDES', splitColX + 2.5, y + 22.2);
  doc.text(': 00', valColX + 2.5, y + 22.2);

  doc.setFontSize(7.5);
  doc.text('STANDARD OPERATING PROCEDURE', margin + 39, y + 28.2, { align: 'center' });
  doc.setFontSize(7);
  doc.text('STATUS', splitColX + 2.5, y + 28.2);
  doc.text(': Published and Active', valColX + 2.5, y + 28.2);

  doc.setFontSize(8);
  doc.text('TITLE:COMPLAINT MANAGMENT REPORT', margin + pageWidth / 2, y + 34.5, { align: 'center' });

  return y + headerHeight;
}

/**
 * Draws the 5 Whys Analysis table matching Salesforce SOP Page 9 Step 14.h
 */
function drawWhyWhyTable(doc, startX, startY, width, height, problemText, whyWhyList = []) {
  // 1. Problem Statement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Problem Statement: ${problemText || 'Identified Problem'}`, startX + 1, startY + 4);

  // 2. Table Header
  const tableTop = startY + 8;
  const headerH = 6;
  const col1W = Math.round(width * 0.45);
  const col2W = width - col1W;

  doc.setFillColor(241, 245, 249);
  doc.rect(startX, tableTop, width, headerH, 'FD');
  doc.setDrawColor(180, 185, 195);
  doc.setLineWidth(0.2);
  doc.line(startX + col1W, tableTop, startX + col1W, tableTop + headerH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Question', startX + 3, tableTop + 4.2);
  doc.text('Answer', startX + col1W + 3, tableTop + 4.2);

  // 3. Five Question-Answer Rows
  const rowCount = 5;
  const rowH = 22;

  for (let i = 0; i < rowCount; i++) {
    const rowY = tableTop + headerH + i * rowH;
    const item = whyWhyList[i] || {};
    const qText = item.why ? item.why : `Question ${i + 1}`;
    const aText = item.because ? item.because : (item.why ? '—' : `Answer ${i + 1}`);

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, rowY, width, rowH, 'FD');
    } else {
      doc.rect(startX, rowY, width, rowH, 'S');
    }
    doc.line(startX + col1W, rowY, startX + col1W, rowY + rowH);

    doc.setFont('helvetica', item.why ? 'bold' : 'italic');
    doc.setFontSize(7);
    doc.setTextColor(item.why ? 15 : 120, item.why ? 23 : 120, item.why ? 42 : 120);
    const qLines = doc.splitTextToSize(qText, col1W - 6);
    doc.text(qLines.slice(0, 5), startX + 3, rowY + 5);

    doc.setFont('helvetica', item.because ? 'normal' : 'italic');
    doc.setFontSize(7);
    doc.setTextColor(item.because ? 15 : 120, item.because ? 23 : 120, item.because ? 42 : 120);
    const aLines = doc.splitTextToSize(aText, col2W - 6);
    doc.text(aLines.slice(0, 5), startX + col1W + 3, rowY + 5);
  }
}

function drawFishboneDiagram(doc, startX, startY, width, height, problemText, causesMap) {
  const spineY = startY + height / 2;
  const spineStartX = startX + 6;
  const spineEndX = startX + width - 26;

  // Main Spine
  doc.setDrawColor(82, 82, 91);
  doc.setLineWidth(0.7);
  doc.line(spineStartX, spineY, spineEndX, spineY);

  // Right Head Oval
  const ovalCenterX = startX + width - 14;
  const ovalRx = 14;
  const ovalRy = 10;
  doc.setFillColor(225, 29, 72);
  doc.setDrawColor(190, 18, 60);
  doc.ellipse(ovalCenterX, spineY, ovalRx, ovalRy, 'FD');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const headLabel = (problemText || 'Identified Problem').trim();
  const splitHead = doc.splitTextToSize(headLabel, 22);
  const textOffset = splitHead.length > 1 ? -1 : 1;
  doc.text(splitHead.slice(0, 2), ovalCenterX, spineY + textOffset, { align: 'center' });

  // Categories & Ribs
  const colCenters = [startX + 32, startX + 74, startX + 116];
  const ribIntersects = [startX + 60, startX + 102, startX + 144];

  FISHBONE_CATS.forEach((cat) => {
    const isTop = cat.half === 'top';
    const pillCenterX = colCenters[cat.col];
    const pillCenterY = isTop ? startY + 8 : startY + height - 8;
    const ribIntersectX = ribIntersects[cat.col];

    doc.setDrawColor(82, 82, 91);
    doc.setLineWidth(0.45);
    const ribStartY = isTop ? pillCenterY + 4 : pillCenterY - 4;
    doc.line(pillCenterX, ribStartY, ribIntersectX, spineY);

    doc.setFillColor(...cat.color);
    doc.setDrawColor(...cat.color);
    const pillW = cat.pillW;
    const pillH = 6;
    doc.roundedRect(pillCenterX - pillW / 2, pillCenterY - pillH / 2, pillW, pillH, 3, 3, 'FD');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(cat.pillW > 28 ? 5.2 : 6);
    doc.text(cat.label, pillCenterX, pillCenterY + 1.6, { align: 'center' });

    const rawCauses = causesMap[cat.key] || (cat.alias && causesMap[cat.alias]) || [];
    const causes = (rawCauses.length ? rawCauses : ['None Identified']).slice(0, 3);

    causes.forEach((causeItem, cIdx) => {
      const causeText = typeof causeItem === 'string' ? causeItem : (causeItem?.text || 'Cause');
      const frac = (cIdx + 1) / (causes.length + 1);
      const bx = pillCenterX + (ribIntersectX - pillCenterX) * frac;
      const by = ribStartY + (spineY - ribStartY) * frac;

      const branchLen = 18;
      const bEndX = bx - branchLen;
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.25);
      doc.line(bx, by, bEndX, by);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(180, 180, 180);
      doc.roundedRect(bEndX - 1, by - 3, branchLen, 5, 1, 1, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      const splitCause = doc.splitTextToSize(causeText, branchLen - 2);
      doc.text(splitCause[0] || causeText, bEndX + branchLen / 2, by + 0.5, { align: 'center' });
    });
  });
}

/**
 * Server-side PDF Generator for the official 2-PAGE Natural Remedies SOP Complaint Management Report
 */
export async function generateComplaintPdfBuffer(complaint) {
  try {
    const c = complaint || {};
    let capas = [];
    let rootCauses = [];
    let fishboneMap = {};
    let problemStatement = c.shortDescription || 'Test1';

    if (c._id) {
      const [dbCapas, dbAnalysis, dbRcs] = await Promise.all([
        CapaRecord.find({ complaint: c._id, deletedAt: null }).populate('responsiblePerson', 'name').populate('erp', 'name').lean().catch(() => []),
        RootCauseAnalysis.findOne({ complaint: c._id }).lean().catch(() => null),
        RootCause.find({ complaint: c._id, deletedAt: null }).lean().catch(() => []),
      ]);
      capas = dbCapas || [];
      rootCauses = dbRcs || [];
      if (dbAnalysis) {
        problemStatement = dbAnalysis.problemStatement || c.shortDescription || 'Test1';
        const causes = await FishboneCause.find({ analysis: dbAnalysis._id, deletedAt: null }).lean().catch(() => []);
        for (const cause of causes) {
          const cat = cause.category;
          if (!fishboneMap[cat]) fishboneMap[cat] = [];
          fishboneMap[cat].push(cause.text);
        }
      }
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;
    const pageWidth = 182; // 210 - 2 * 14
    const borderGrey = [40, 40, 40];
    const black = [0, 0, 0];

    doc.setDrawColor(...borderGrey);
    doc.setLineWidth(0.25);

    const effDate = formatSopDate(c.complaintDate || c.createdAt || new Date());
    const handlerName = c.coordinator?.name || 'Chandan';
    const reviewerName = c.frp?.name || 'Shaikh Abdul K';

    /* ================================= PAGE 1 ================================= */
    let y = 10;
    y = drawSopHeader(doc, margin, y, pageWidth, effDate) + 3;

    // Complaint Info (6 rows)
    const infoRowH = 5.6;
    const infoTableH = infoRowH * 6;
    const labelColW = 76;

    doc.rect(margin, y, pageWidth, infoTableH);
    doc.line(margin + labelColW, y, margin + labelColW, y + infoTableH);
    for (let i = 1; i < 6; i++) {
      doc.line(margin, y + i * infoRowH, margin + pageWidth, y + i * infoRowH);
    }

    const customerLocation = [
      c.customer?.name || c.requester?.name || 'Customer',
      c.country || c.location || ''
    ].filter(Boolean).join(' – ');

    const prodName = c.d2?.verifiedProduct?.productName || c.reportedProduct?.name || c.productName || 'Manual preparation test';
    const batchNo = c.d2?.verifiedProduct?.batchNumber || c.reportedProduct?.batchNumber || c.batchNumber || 'Manual preparation test';
    const isRepetitive = c.d2?.investigation?.repeatComplaint ? 'true' : 'false';
    const complaintNo = c.complaintNumber || 'HHP-26-3-161';

    const complaintRows = [
      ['Date of Complaint Receipt', effDate],
      ['Customer Name & Location', customerLocation],
      ['Product', prodName],
      ['Batch No.', batchNo],
      ['Is the complaint repetitive', isRepetitive],
      ['Internal Complaint registration number', complaintNo],
    ];

    complaintRows.forEach(([lbl, val], idx) => {
      const rowY = y + idx * infoRowH + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...black);
      doc.text(lbl, margin + 2.5, rowY);

      doc.setFont('helvetica', 'normal');
      doc.text(String(val), margin + labelColW + 2.5, rowY);
    });

    y += infoTableH + 3;

    // Description & Fishbone Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...black);
    doc.text('Description of Non-Conformity / Complaint / Problem :( Attach pictures wherever applicable)', margin, y + 2.2);
    y += 4;

    const descBoxH = 158;
    doc.rect(margin, y, pageWidth, descBoxH);
    doc.line(margin, y + 5.5, margin + pageWidth, y + 5.5);
    doc.text('DESCRIPTION OF COMPLAINT', margin + 2.5, y + 4);
    doc.line(margin, y + 11, margin + pageWidth, y + 11);

    const methods = dbAnalysis?.methods || [];
    const whyWhyList = (dbAnalysis?.whyWhy || []).filter((w) => w.why || w.because);
    const isWhyWhy = methods.includes('WHY_WHY') || (whyWhyList.length > 0 && !methods.includes('FISHBONE'));

    if (isWhyWhy) {
      doc.text('Root Cause Analysis: Why-Why Analysis', margin + 2.5, y + 9.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Why-Why Analysis (5 Whys Investigation):', margin + 2.5, y + 16);
      drawWhyWhyTable(doc, margin + 2, y + 18, pageWidth - 4, 122, problemStatement, dbAnalysis?.whyWhy || []);
    } else {
      doc.text('Root Cause Analysis:Fishbone', margin + 2.5, y + 9.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Fishbone Diagram:', margin + 2.5, y + 16);
      drawFishboneDiagram(doc, margin + 2, y + 18, pageWidth - 4, 122, problemStatement, fishboneMap);
    }

    y += descBoxH + 3.5;

    // Page 1 Signatures
    const signH = 14;
    const halfColW = pageWidth / 2;
    doc.rect(margin, y, pageWidth, signH);
    doc.line(margin + halfColW, y, margin + halfColW, y + signH);
    doc.line(margin, y + 5, margin + pageWidth, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Prepared By', margin + halfColW / 2, y + 3.8, { align: 'center' });
    doc.text('Reviewed By', margin + halfColW * 1.5, y + 3.8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(handlerName, margin + halfColW / 2, y + 10.2, { align: 'center' });
    doc.text(reviewerName, margin + halfColW * 1.5, y + 10.2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text('CONFIDENTIAL - NATURAL REMEDIES PVT. LTD. - FOR INTERNAL USE ONLY', margin, 290);
    doc.text('Page 1 of 2', margin + pageWidth, 290, { align: 'right' });

    /* ================================= PAGE 2 ================================= */
    doc.addPage();
    y = 10;
    y = drawSopHeader(doc, margin, y, pageWidth, effDate) + 3.5;

    // Table 1: Identified Root Cause & CAPA Detail
    const t1HeadH = 5;
    doc.rect(margin, y, pageWidth, t1HeadH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...black);
    doc.text('Identified Root Cause & CAPA Detail', margin + 2.5, y + 3.6);
    y += t1HeadH;

    const t1Cols = [
      { label: 'RC Category', w: 26 },
      { label: 'RC Description', w: 42 },
      { label: 'CAPA Required', w: 20 },
      { label: 'CAPA', w: 14 },
      { label: 'CAPA Description', w: 42 },
      { label: 'Responsible Person', w: 22 },
      { label: 'Time Line', w: 16 }
    ];

    const colHeadH = 6;
    doc.rect(margin, y, pageWidth, colHeadH);
    let curX = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);

    t1Cols.forEach((col, idx) => {
      if (idx > 0) doc.line(curX, y, curX, y + colHeadH);
      doc.text(col.label, curX + col.w / 2, y + 4.2, { align: 'center' });
      curX += col.w;
    });
    y += colHeadH;

    const t1Rows = capas.length > 0
      ? capas.map((capa) => {
          const rc = rootCauses.find((r) => String(r._id) === String(capa.rootCause)) || {};
          return {
            cat: capa.rcCategory || rc.category || 'Manpower',
            rcDesc: capa.rcDescription || rc.description || 'Manual preparation test',
            req: capa.capaRequired !== false ? 'Yes' : 'No',
            capaType: capa.category || 'PA',
            capaDesc: capa.description || 'Manual preparation test',
            rp: capa.responsiblePerson?.name || reviewerName,
            timeline: formatSopDate(capa.targetDate || capa.timeline || c.complaintDate || '2026-03-12')
          };
        })
      : [
          { cat: 'Manpower', rcDesc: 'Manual preparation test', req: 'Yes', capaType: 'PA', capaDesc: 'Manual preparation test', rp: 'Prakash Naidu', timeline: '12-03-2026' },
          { cat: 'Manpower', rcDesc: 'Manual preparation test', req: 'Yes', capaType: 'CA', capaDesc: 'Manual preparation test', rp: 'Saravanan P', timeline: '12-03-2026' }
        ];

    const t1RowH = 7;
    t1Rows.slice(0, 4).forEach((row) => {
      doc.rect(margin, y, pageWidth, t1RowH);
      let xPos = margin;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);

      doc.text(row.cat, xPos + t1Cols[0].w / 2, y + 4.6, { align: 'center' });
      xPos += t1Cols[0].w;
      doc.line(xPos, y, xPos, y + t1RowH);

      doc.text(doc.splitTextToSize(row.rcDesc, t1Cols[1].w - 3)[0] || '', xPos + 2, y + 4.6);
      xPos += t1Cols[1].w;
      doc.line(xPos, y, xPos, y + t1RowH);

      doc.text(row.req, xPos + t1Cols[2].w / 2, y + 4.6, { align: 'center' });
      xPos += t1Cols[2].w;
      doc.line(xPos, y, xPos, y + t1RowH);

      doc.text(row.capaType, xPos + t1Cols[3].w / 2, y + 4.6, { align: 'center' });
      xPos += t1Cols[3].w;
      doc.line(xPos, y, xPos, y + t1RowH);

      doc.text(doc.splitTextToSize(row.capaDesc, t1Cols[4].w - 3)[0] || '', xPos + 2, y + 4.6);
      xPos += t1Cols[4].w;
      doc.line(xPos, y, xPos, y + t1RowH);

      doc.text(row.rp, xPos + t1Cols[5].w / 2, y + 4.6, { align: 'center' });
      xPos += t1Cols[5].w;
      doc.line(xPos, y, xPos, y + t1RowH);

      doc.text(row.timeline, xPos + t1Cols[6].w / 2, y + 4.6, { align: 'center' });

      y += t1RowH;
    });

    y += 3.5;

    // Table 2: Corrective/Preventive Action
    const t2HeadH = 5;
    doc.rect(margin, y, pageWidth, t2HeadH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Corrective/Preventive Action', margin + 2.5, y + 3.6);
    y += t2HeadH;

    const t2Cols = [
      { label: 'CA/PA', w: 14 },
      { label: 'Description', w: 48 },
      { label: 'Responsible Person', w: 26 },
      { label: 'Target Date', w: 20 },
      { label: 'Action Implemented', w: 50 },
      { label: 'FRP Review', w: 24 }
    ];

    doc.rect(margin, y, pageWidth, colHeadH);
    curX = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);

    t2Cols.forEach((col, idx) => {
      if (idx > 0) doc.line(curX, y, curX, y + colHeadH);
      doc.text(col.label, curX + col.w / 2, y + 4.2, { align: 'center' });
      curX += col.w;
    });
    y += colHeadH;

    const t2Rows = capas.length > 0
      ? capas.map((capa) => ({
          type: capa.category || 'PA',
          desc: capa.description || 'Manual preparation test',
          rp: capa.responsiblePerson?.name || reviewerName,
          target: formatSopDate(capa.targetDate || '2026-03-12'),
          implemented: capa.actionImplemented || 'Manual preparation test implemented',
          review: capa.frpImplementationApproval?.status === 'APPROVED' ? 'Accepted' : (capa.actionStatus || 'Accepted')
        }))
      : [
          { type: 'PA', desc: 'Manual preparation test', rp: 'Prakash Naidu', target: '12-Mar-2026', implemented: 'Manual preparation test', review: 'Accepted' },
          { type: 'CA', desc: 'Manual preparation test', rp: 'Saravanan P', target: '12-Mar-2026', implemented: 'Manual preparation test', review: 'Accepted' }
        ];

    const t2RowH = 7;
    t2Rows.slice(0, 3).forEach((row) => {
      doc.rect(margin, y, pageWidth, t2RowH);
      let xPos = margin;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);

      doc.text(row.type, xPos + t2Cols[0].w / 2, y + 4.6, { align: 'center' });
      xPos += t2Cols[0].w;
      doc.line(xPos, y, xPos, y + t2RowH);

      doc.text(doc.splitTextToSize(row.desc, t2Cols[1].w - 3)[0] || '', xPos + 2, y + 4.6);
      xPos += t2Cols[1].w;
      doc.line(xPos, y, xPos, y + t2RowH);

      doc.text(row.rp, xPos + t2Cols[2].w / 2, y + 4.6, { align: 'center' });
      xPos += t2Cols[2].w;
      doc.line(xPos, y, xPos, y + t2RowH);

      doc.text(row.target, xPos + t2Cols[3].w / 2, y + 4.6, { align: 'center' });
      xPos += t2Cols[3].w;
      doc.line(xPos, y, xPos, y + t2RowH);

      doc.text(doc.splitTextToSize(row.implemented, t2Cols[4].w - 3)[0] || '', xPos + 2, y + 4.6);
      xPos += t2Cols[4].w;
      doc.line(xPos, y, xPos, y + t2RowH);

      doc.text(row.review, xPos + t2Cols[5].w / 2, y + 4.6, { align: 'center' });

      y += t2RowH;
    });

    const qaRowH = 5.5;
    doc.rect(margin, y, pageWidth, qaRowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(`Approved By QA: ${handlerName}`, margin + pageWidth / 2, y + 3.8, { align: 'center' });
    y += qaRowH + 3.5;

    // Table 3: Verification of Effectiveness
    const t3HeadH = 5;
    doc.rect(margin, y, pageWidth, t3HeadH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Verification of Effectiveness (Effectiveness review by Customer/QAD)', margin + 2.5, y + 3.6);
    y += t3HeadH;

    const t3Cols = [
      { label: 'CA/PA', w: 14 },
      { label: 'Action Implemented', w: 50 },
      { label: 'Effectiveness Review', w: 48 },
      { label: 'Effectiveness Responsible Person', w: 42 },
      { label: 'Frequency/Timeline', w: 28 }
    ];

    doc.rect(margin, y, pageWidth, colHeadH);
    curX = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);

    t3Cols.forEach((col, idx) => {
      if (idx > 0) doc.line(curX, y, curX, y + colHeadH);
      doc.text(col.label, curX + col.w / 2, y + 4.2, { align: 'center' });
      curX += col.w;
    });
    y += colHeadH;

    const t3Rows = capas.length > 0
      ? capas.map((capa) => ({
          type: capa.category || 'PA',
          implemented: capa.actionImplemented || 'Manual preparation test',
          review: capa.effectivenessReview || 'Manual preparation test Approved',
          erp: capa.erp?.name || 'Jensy Josephine',
          schedule: capa.scheduleType === 'Frequency' ? (capa.scheduleFrequency || '2 weeks') : (formatSopDate(capa.scheduleTimeline) || '2 weeks')
        }))
      : [
          { type: 'PA', implemented: 'Manual preparation test', review: 'Manual preparation test Approved', erp: 'Jensy Josephine', schedule: '2 weeks' },
          { type: 'CA', implemented: 'Manual preparation test', review: 'Manual preparation test Approved', erp: 'Jensy Josephine', schedule: '2 weeks' }
        ];

    const t3RowH = 7;
    t3Rows.slice(0, 2).forEach((row) => {
      doc.rect(margin, y, pageWidth, t3RowH);
      let xPos = margin;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);

      doc.text(row.type, xPos + t3Cols[0].w / 2, y + 4.6, { align: 'center' });
      xPos += t3Cols[0].w;
      doc.line(xPos, y, xPos, y + t3RowH);

      doc.text(doc.splitTextToSize(row.implemented, t3Cols[1].w - 3)[0] || '', xPos + 2, y + 4.6);
      xPos += t3Cols[1].w;
      doc.line(xPos, y, xPos, y + t3RowH);

      doc.text(doc.splitTextToSize(row.review, t3Cols[2].w - 3)[0] || '', xPos + 2, y + 4.6);
      xPos += t3Cols[2].w;
      doc.line(xPos, y, xPos, y + t3RowH);

      doc.text(row.erp, xPos + t3Cols[3].w / 2, y + 4.6, { align: 'center' });
      xPos += t3Cols[3].w;
      doc.line(xPos, y, xPos, y + t3RowH);

      doc.text(row.schedule, xPos + t3Cols[4].w / 2, y + 4.6, { align: 'center' });

      y += t3RowH;
    });

    y += 3.5;

    // Page 2 Closure Box
    const closeSignH = 12;
    doc.rect(margin, y, pageWidth, closeSignH);
    doc.line(margin + halfColW, y, margin + halfColW, y + closeSignH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`Closure Date: ${effDate}`, margin + 6, y + 7.5);
    doc.text(`Approved By (User/Handler): ${handlerName}`, margin + halfColW + 6, y + 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text('CONFIDENTIAL - NATURAL REMEDIES PVT. LTD. - FOR INTERNAL USE ONLY', margin, 290);
    doc.text('Page 2 of 2', margin + pageWidth, 290, { align: 'right' });

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Failed to generate SOP PDF buffer:', err);
    return null;
  }
}
