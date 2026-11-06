import { jsPDF } from 'jspdf';
import { NATURAL_REMEDIES_LOGO } from './logoBase64.js';

export const formatSopDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// 6 Categories matching Salesforce QEQMS documentation
const FISHBONE_CATS = [
  { key: 'Manpower', label: 'MANPOWER', color: [255, 152, 0], half: 'top', col: 0, pillW: 24 },
  { key: 'Method', label: 'METHOD', color: [233, 30, 99], half: 'top', col: 1, pillW: 22 },
  { key: 'Machine', label: 'MACHINE', color: [156, 39, 176], half: 'top', col: 2, pillW: 22 },
  { key: 'Material', label: 'MATERIAL', color: [103, 58, 183], half: 'bottom', col: 0, pillW: 24 },
  { key: 'Mother Nature', alias: 'Environment', label: 'Milieu / Environmental', color: [0, 188, 212], half: 'bottom', col: 1, pillW: 32 },
  { key: 'Measurement', label: 'MEASUREMENT', color: [76, 175, 80], half: 'bottom', col: 2, pillW: 26 },
];

/**
 * Draws the official Natural Remedies SOP Header Box matching SOP Format NR/QAD/SOP/001-F01/04
 */
function drawSopHeader(doc, margin, y, pageWidth, effDate) {
  const headerHeight = 36;
  const splitColX = margin + 102; // Left box = 102mm, Right box = 80mm
  const valColX = splitColX + 58;  // Label = 58mm, Colon/Value = 22mm

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, pageWidth, headerHeight);

  // Vertical dividers
  doc.line(splitColX, y, splitColX, y + 30);
  doc.line(valColX, y, valColX, y + 30);

  // Horizontal dividers in right box
  doc.line(splitColX, y + 6, margin + pageWidth, y + 6);
  doc.line(splitColX, y + 12, margin + pageWidth, y + 12);
  doc.line(margin, y + 18, margin + pageWidth, y + 18);
  doc.line(margin, y + 24, margin + pageWidth, y + 24);
  doc.line(margin, y + 30, margin + pageWidth, y + 30);

  // Logo in left box (upper 18mm)
  try {
    if (NATURAL_REMEDIES_LOGO) {
      const logoW = 26;
      const logoH = 14;
      const logoX = margin + (102 - logoW) / 2;
      const logoY = y + (18 - logoH) / 2;
      doc.addImage(NATURAL_REMEDIES_LOGO, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    }
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(34, 139, 34);
    doc.text('natural REMEDIES', margin + 51, y + 11, { align: 'center' });
  }

  // Row 4: QAD (centered in left box)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('QAD', margin + 51, y + 22.2, { align: 'center' });

  // Row 5: STANDARD OPERATING PROCEDURE (centered in left box)
  doc.text('STANDARD OPERATING PROCEDURE', margin + 51, y + 28.2, { align: 'center' });

  // Row 6: Title Banner (centered full width)
  doc.setFontSize(8.5);
  doc.text('TITLE:COMPLAINT MANAGMENT REPORT', margin + pageWidth / 2, y + 34.5, { align: 'center' });

  // Metadata right rows
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FORMAT NO', splitColX + 2.5, y + 4.2);
  doc.text(':', valColX + 2.5, y + 4.2);

  doc.text('EFFECTIVE DATE', splitColX + 2.5, y + 10.2);
  doc.text(':', valColX + 2.5, y + 10.2);

  doc.text('EXPIRY DATE', splitColX + 2.5, y + 16.2);
  doc.text(':', valColX + 2.5, y + 16.2);

  doc.text('SUPERSEDES', splitColX + 2.5, y + 22.2);
  doc.text(':', valColX + 2.5, y + 22.2);

  doc.text('STATUS', splitColX + 2.5, y + 28.2);
  doc.text(':', valColX + 2.5, y + 28.2);

  return y + headerHeight;
}

/**
 * Draws the 2-cell signoff footer on every page matching the SOP report
 */
function drawFooter(doc, margin, y, pageWidth, handlerName, reviewerName) {
  const footerH = 14;
  const halfColW = pageWidth / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, pageWidth, footerH);
  doc.line(margin + halfColW, y, margin + halfColW, y + footerH);
  doc.line(margin, y + 5.5, margin + pageWidth, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Prepared by', margin + halfColW / 2, y + 4.2, { align: 'center' });
  doc.text('Reviewed By', margin + halfColW * 1.5, y + 4.2, { align: 'center' });

  doc.text(handlerName || 'Chandan Hj', margin + halfColW / 2, y + 10.5, { align: 'center' });
  doc.text(reviewerName || 'Thippeswamy Papareddy', margin + halfColW * 1.5, y + 10.5, { align: 'center' });
}

/**
 * Draws the 5 Whys Analysis table matching Page 1 of the Why-Why report format
 */
function drawWhyWhyTable(doc, startX, startY, width, whyWhyList = []) {
  const headerH = 6.5;
  const col1W = 18; // Sr. No.
  const col2W = (width - col1W) / 2; // Question
  const col3W = (width - col1W) / 2; // Answer

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(startX, startY, width, headerH);
  doc.line(startX + col1W, startY, startX + col1W, startY + headerH);
  doc.line(startX + col1W + col2W, startY, startX + col1W + col2W, startY + headerH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Sr. No.', startX + col1W / 2, startY + 4.5, { align: 'center' });
  doc.text('Question', startX + col1W + col2W / 2, startY + 4.5, { align: 'center' });
  doc.text('Answer', startX + col1W + col2W + col3W / 2, startY + 4.5, { align: 'center' });

  const rowCount = 5;
  const rowH = 7.5;

  for (let i = 0; i < rowCount; i++) {
    const rowY = startY + headerH + i * rowH;
    const item = whyWhyList[i] || {};
    // If no why-why was recorded, display 'NA' on first row matching user screenshot
    let qText = item.why || '';
    let aText = item.because || '';
    if (i === 0 && !qText && !aText && (!whyWhyList || whyWhyList.length === 0 || !whyWhyList.some(w => w.why || w.because))) {
      qText = 'NA';
      aText = 'NA';
    }

    doc.rect(startX, rowY, width, rowH);
    doc.line(startX + col1W, rowY, startX + col1W, rowY + rowH);
    doc.line(startX + col1W + col2W, rowY, startX + col1W + col2W, rowY + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(String(i + 1), startX + col1W / 2, rowY + 5, { align: 'center' });

    if (qText) {
      doc.text(qText, startX + col1W + 2.5, rowY + 5);
    }
    if (aText) {
      doc.text(aText, startX + col1W + col2W + 2.5, rowY + 5);
    }
  }
}

/**
 * Draws the visual Ishikawa Fishbone Diagram matching Page 1 of the Fishbone report format
 */
function drawFishboneDiagram(doc, startX, startY, width, height, problemText, causesMap) {
  const spineY = startY + height / 2;
  const spineStartX = startX + 6;
  const spineEndX = startX + width - 36;

  // 1. Main Horizontal Spine
  doc.setDrawColor(82, 82, 91);
  doc.setLineWidth(0.7);
  doc.line(spineStartX, spineY, spineEndX, spineY);

  // 2. Right Head Oval (Identified Root Cause / Problem)
  const ovalCenterX = startX + width - 20;
  const ovalRx = 20;
  const ovalRy = 14;
  doc.setFillColor(225, 29, 72); // Raspberry red
  doc.setDrawColor(190, 18, 60);
  doc.ellipse(ovalCenterX, spineY, ovalRx, ovalRy, 'FD');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const headLabel = (problemText || 'Identified Problem').trim();
  const splitHead = doc.splitTextToSize(headLabel, ovalRx * 2 - 4);
  const textOffsetY = spineY - (splitHead.length - 1) * 1.5;
  doc.text(splitHead.slice(0, 4), ovalCenterX, textOffsetY, { align: 'center' });

  // 3. Categories & Diagonal Ribs
  const colCenters = [startX + 30, startX + 72, startX + 114];
  const ribIntersects = [startX + 58, startX + 100, startX + 142];

  FISHBONE_CATS.forEach((cat) => {
    const isTop = cat.half === 'top';
    const pillCenterX = colCenters[cat.col];
    const pillCenterY = isTop ? startY + 12 : startY + height - 12;
    const ribIntersectX = ribIntersects[cat.col];

    // Diagonal Rib Line
    doc.setDrawColor(82, 82, 91);
    doc.setLineWidth(0.45);
    const ribStartY = isTop ? pillCenterY + 4 : pillCenterY - 4;
    doc.line(pillCenterX, ribStartY, ribIntersectX, spineY);

    // Pill Category Capsule
    doc.setFillColor(...cat.color);
    doc.setDrawColor(...cat.color);
    const pillW = cat.pillW;
    const pillH = 6;
    doc.roundedRect(pillCenterX - pillW / 2, pillCenterY - pillH / 2, pillW, pillH, 3, 3, 'FD');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(cat.pillW > 28 ? 5.2 : 6);
    doc.text(cat.label, pillCenterX, pillCenterY + 1.6, { align: 'center' });

    // Causes attached to rib
    const rawCauses = causesMap[cat.key] || (cat.alias && causesMap[cat.alias]) || [];
    const causes = (rawCauses.length ? rawCauses : ['None Identified']).slice(0, 3);

    causes.forEach((causeItem, cIdx) => {
      const causeText = typeof causeItem === 'string' ? causeItem : (causeItem?.text || 'Cause');
      const frac = (cIdx + 1) / (causes.length + 1);
      const bx = pillCenterX + (ribIntersectX - pillCenterX) * frac;
      const by = ribStartY + (spineY - ribStartY) * frac;

      // Horizontal sub-branch
      const branchLen = 22;
      const bEndX = bx - branchLen;
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.25);
      doc.line(bx, by, bEndX, by);

      // Text box for cause
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(180, 180, 180);
      doc.roundedRect(bEndX - 1, by - 3, branchLen, 5.5, 1, 1, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      const splitCause = doc.splitTextToSize(causeText, branchLen - 2);
      doc.text(splitCause[0] || causeText, bEndX + branchLen / 2, by + 0.6, { align: 'center' });
    });
  });
}

/**
 * Generates the official Natural Remedies Complaint Management Report
 * Takes dynamic complaint & D3/D4 data without hardcoded placeholders.
 */
export function generateComplaintReport(complaint, d3Data = null, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageWidth = 182; // 210 - 2 * 14
  const c = complaint || {};
  const d3 = d3Data?.data || d3Data || {};

  const black = [0, 0, 0];
  doc.setDrawColor(...black);
  doc.setLineWidth(0.25);

  const effDate = formatSopDate(c.complaintDate || c.createdAt);
  const handlerName = c.coordinator?.name || c.createdBy?.name || 'Chandan Hj';
  const reviewerName = d3.review?.reviewer?.name || c.frp?.manager?.name || c.frp?.name || 'Thippeswamy Papareddy';

  /* ==========================================================================
     =========================== PAGE 1 =======================================
     ========================================================================== */
  let y = 10;

  // 1. Header Box
  y = drawSopHeader(doc, margin, y, pageWidth, effDate) + 3;

  // 2. Complaint Information Table (6 rows)
  const infoRowH = 6.2;
  const infoTableH = infoRowH * 6;
  const labelColW = 82;

  doc.setDrawColor(...black);
  doc.rect(margin, y, pageWidth, infoTableH);
  doc.line(margin + labelColW, y, margin + labelColW, y + infoTableH);

  for (let i = 1; i < 6; i++) {
    doc.line(margin, y + i * infoRowH, margin + pageWidth, y + i * infoRowH);
  }

  // Customer Name & Location (e.g. "AIDP – United States of America" or "Vidara – Brazil")
  const customerName = c.customer?.name || '';
  const customerLocation = c.country || c.location || '';
  const customerDisplay = [customerName, customerLocation].filter(Boolean).join(' – ') || '—';

  const prodName = c.d2?.verifiedProduct?.productName || c.reportedProduct?.name || '—';
  const batchNo = c.d2?.verifiedProduct?.batchNumber || c.reportedProduct?.batchNumber || '—';
  const isRepetitive = c.d2?.investigation?.repeatComplaint ? 'true' : 'false';
  const complaintNo = c.complaintNumber || '—';

  const complaintRows = [
    ['Date of Complaint Receipt', effDate],
    ['Customer Name & Location', customerDisplay],
    ['Product', prodName],
    ['Batch No.', batchNo],
    ['Is the complaint repetitive', isRepetitive],
    ['Internal Complaint registration number', complaintNo],
  ];

  complaintRows.forEach(([lbl, val], idx) => {
    const rowY = y + idx * infoRowH + 4.3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...black);
    doc.text(lbl, margin + 2.5, rowY);
    doc.text(String(val), margin + labelColW + 2.5, rowY);
  });

  y += infoTableH + 3;

  // 3. Description Section Header & Outer Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text('Description of Non-Conformity / Complaint / Problem :( Attach pictures wherever applicable)', margin, y + 2.2);
  y += 4.5;

  const descBoxH = 171.5;
  doc.rect(margin, y, pageWidth, descBoxH);

  // Sub-header 1: DESCRIPTION OF COMPLAINT
  doc.line(margin, y + 5.5, margin + pageWidth, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DESCRIPTION OF COMPLAINT', margin + 2.5, y + 4.2);

  const analysis = d3.analysis || {};
  const methods = analysis.methods || [];
  const whyWhyList = analysis.whyWhy || [];
  const fishboneTree = d3.fishbone || {};
  const fishboneCauseCount = Object.values(fishboneTree).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);

  // Determine method: Fishbone if selected or if causes exist; Why-Why otherwise
  const isFishbone = methods.includes('FISHBONE') || (fishboneCauseCount > 0 && !methods.includes('WHY_WHY'));
  const problemStatement = analysis.problemStatement || c.shortDescription || '';

  if (isFishbone) {
    // Fishbone Page 1 layout
    doc.line(margin, y + 11, margin + pageWidth, y + 11);
    doc.text('Root Cause Analysis:Fishbone', margin + 2.5, y + 9.7);

    doc.text('Fishbone Diagram:', margin + 2.5, y + 15.5);
    drawFishboneDiagram(doc, margin + 2, y + 18, pageWidth - 4, descBoxH - 22, problemStatement, fishboneTree);
  } else {
    // Why-Why Page 1 layout
    doc.line(margin, y + 11, margin + pageWidth, y + 11);
    doc.text('Root Cause Analysis:Why-Why', margin + 2.5, y + 9.7);

    doc.text('Why-Why Analysis:', margin + 2.5, y + 15.5);
    drawWhyWhyTable(doc, margin + 3, y + 19, pageWidth - 6, whyWhyList);
  }

  // 4. Page 1 Bottom Signatures
  drawFooter(doc, margin, 268, pageWidth, handlerName, reviewerName);

  /* ==========================================================================
     =========================== PAGE 2 =======================================
     ========================================================================== */
  doc.addPage();
  y = 10;

  // 1. Header Box (Repeated)
  y = drawSopHeader(doc, margin, y, pageWidth, effDate) + 3;

  const allCapas = d3.capas || [];
  const rootCauses = d3.rootCauses || [];

  // Probable Root Cause header
  const probableRootCause = (analysis.problemStatement && analysis.problemStatement !== c.shortDescription)
    ? analysis.problemStatement
    : (rootCauses[0]?.title || '');

  // 2. Table 1: Identified Root Cause & CAPA Detail
  const t1HeadH = 6;
  doc.rect(margin, y, pageWidth, t1HeadH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text(`Probable / Potential Root Cause(s):${probableRootCause ? probableRootCause : ''}`, margin + 2.5, y + 4.2);
  y += t1HeadH;

  const t1Cols = [
    { label: 'RC\nCategory', w: 20 },
    { label: 'RC Description', w: 42 },
    { label: 'CAPA\nRequired', w: 18 },
    { label: 'CA/PA', w: 14 },
    { label: 'CAPA Description', w: 44 },
    { label: 'Responsible\nPerson', w: 24 },
    { label: 'Time Line', w: 20 }
  ];

  const colHeadH = 8;
  doc.rect(margin, y, pageWidth, colHeadH);
  let curX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  t1Cols.forEach((col, idx) => {
    if (idx > 0) doc.line(curX, y, curX, y + colHeadH);
    const lines = col.label.split('\n');
    if (lines.length > 1) {
      doc.text(lines[0], curX + col.w / 2, y + 3.2, { align: 'center' });
      doc.text(lines[1], curX + col.w / 2, y + 6.4, { align: 'center' });
    } else {
      doc.text(col.label, curX + col.w / 2, y + 5.2, { align: 'center' });
    }
    curX += col.w;
  });
  y += colHeadH;

  // Build rows dynamically from complaint data
  const t1Rows = [];
  if (allCapas.length > 0) {
    allCapas.forEach((capa) => {
      const rc = rootCauses.find((r) => String(r._id) === String(capa.rootCause)) || {};
      const req = capa.capaRequired === false ? 'No' : 'Yes';
      t1Rows.push({
        rcCat: capa.rcCategory || rc.category || 'Method',
        rcDesc: capa.rcDescription || rc.description || '',
        req,
        capaType: req === 'Yes' ? (capa.category || 'CA') : '',
        capaDesc: req === 'Yes' ? (capa.description || '') : '',
        rp: req === 'Yes' ? (capa.responsiblePerson?.name || '') : '',
        timeline: req === 'Yes' ? formatSopDate(capa.targetDate) : ''
      });
    });
  } else if (rootCauses.length > 0) {
    rootCauses.forEach((rc) => {
      t1Rows.push({
        rcCat: rc.category || 'Method',
        rcDesc: rc.description || '',
        req: 'No',
        capaType: '',
        capaDesc: '',
        rp: '',
        timeline: ''
      });
    });
  } else {
    t1Rows.push({
      rcCat: c.category || 'Method',
      rcDesc: c.shortDescription || '',
      req: 'No',
      capaType: '',
      capaDesc: '',
      rp: '',
      timeline: ''
    });
  }

  // Render Table 1 Rows with dynamic text height
  t1Rows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    const rcDescLines = doc.splitTextToSize(row.rcDesc || '', t1Cols[1].w - 4);
    const capaDescLines = doc.splitTextToSize(row.capaDesc || '', t1Cols[4].w - 4);
    const rpLines = doc.splitTextToSize(row.rp || '', t1Cols[5].w - 4);
    const maxLines = Math.max(rcDescLines.length, capaDescLines.length, rpLines.length, 1);
    const rowH = Math.max(8, maxLines * 3.4 + 4);

    doc.rect(margin, y, pageWidth, rowH);
    let xPos = margin;

    // RC Category
    doc.text(row.rcCat, xPos + t1Cols[0].w / 2, y + 4.5, { align: 'center' });
    xPos += t1Cols[0].w;
    doc.line(xPos, y, xPos, y + rowH);

    // RC Description
    doc.text(rcDescLines, xPos + 2, y + 4.2);
    xPos += t1Cols[1].w;
    doc.line(xPos, y, xPos, y + rowH);

    // CAPA Required
    doc.text(row.req, xPos + t1Cols[2].w / 2, y + 4.5, { align: 'center' });
    xPos += t1Cols[2].w;
    doc.line(xPos, y, xPos, y + rowH);

    // CA/PA
    doc.text(row.capaType, xPos + t1Cols[3].w / 2, y + 4.5, { align: 'center' });
    xPos += t1Cols[3].w;
    doc.line(xPos, y, xPos, y + rowH);

    // CAPA Description
    doc.text(capaDescLines, xPos + 2, y + 4.2);
    xPos += t1Cols[4].w;
    doc.line(xPos, y, xPos, y + rowH);

    // Responsible Person
    doc.text(rpLines, xPos + t1Cols[5].w / 2, y + 4.5, { align: 'center' });
    xPos += t1Cols[5].w;
    doc.line(xPos, y, xPos, y + rowH);

    // Time Line
    doc.text(row.timeline, xPos + t1Cols[6].w / 2, y + 4.5, { align: 'center' });

    y += rowH;
  });

  y += 3;

  // 3. Table 2: Correction/Corrective Action
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Correction/Corrective Action:', margin, y + 3.2);
  y += 4.5;

  const t2Cols = [
    { label: 'CA/PA', w: 16 },
    { label: 'Description', w: 50 },
    { label: 'Responsible\nPerson', w: 26 },
    { label: 'Time Line', w: 20 },
    { label: 'Action\nImplemented', w: 45 },
    { label: 'FPR Review', w: 25 }
  ];

  doc.rect(margin, y, pageWidth, colHeadH);
  curX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  t2Cols.forEach((col, idx) => {
    if (idx > 0) doc.line(curX, y, curX, y + colHeadH);
    const lines = col.label.split('\n');
    if (lines.length > 1) {
      doc.text(lines[0], curX + col.w / 2, y + 3.2, { align: 'center' });
      doc.text(lines[1], curX + col.w / 2, y + 6.4, { align: 'center' });
    } else {
      doc.text(col.label, curX + col.w / 2, y + 5.2, { align: 'center' });
    }
    curX += col.w;
  });
  y += colHeadH;

  const t2Rows = allCapas
    .filter((cp) => cp.capaRequired !== false || cp.description || cp.actionImplemented)
    .map((capa) => ({
      capaType: capa.category || 'CA',
      desc: capa.description || '',
      rp: capa.responsiblePerson?.name || '',
      timeline: formatSopDate(capa.targetDate),
      implemented: capa.actionImplemented || '',
      review: capa.frpImplementationApproval?.status === 'APPROVED'
        ? 'Accepted'
        : (capa.frpImplementationApproval?.status || (capa.actionImplemented ? 'Accepted' : ''))
    }));

  t2Rows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    const descLines = doc.splitTextToSize(row.desc || '', t2Cols[1].w - 4);
    const implLines = doc.splitTextToSize(row.implemented || '', t2Cols[4].w - 4);
    const rpLines = doc.splitTextToSize(row.rp || '', t2Cols[2].w - 4);
    const maxLines = Math.max(descLines.length, implLines.length, rpLines.length, 1);
    const rowH = Math.max(8, maxLines * 3.4 + 4);

    doc.rect(margin, y, pageWidth, rowH);
    let xPos = margin;

    // CA/PA
    doc.text(row.capaType, xPos + t2Cols[0].w / 2, y + 4.5, { align: 'center' });
    xPos += t2Cols[0].w;
    doc.line(xPos, y, xPos, y + rowH);

    // Description
    doc.text(descLines, xPos + 2, y + 4.2);
    xPos += t2Cols[1].w;
    doc.line(xPos, y, xPos, y + rowH);

    // Responsible Person
    doc.text(rpLines, xPos + t2Cols[2].w / 2, y + 4.5, { align: 'center' });
    xPos += t2Cols[2].w;
    doc.line(xPos, y, xPos, y + rowH);

    // Time Line
    doc.text(row.timeline, xPos + t2Cols[3].w / 2, y + 4.5, { align: 'center' });
    xPos += t2Cols[3].w;
    doc.line(xPos, y, xPos, y + rowH);

    // Action Implemented
    doc.text(implLines, xPos + 2, y + 4.2);
    xPos += t2Cols[4].w;
    doc.line(xPos, y, xPos, y + rowH);

    // FPR Review
    doc.text(row.review, xPos + t2Cols[5].w / 2, y + 4.5, { align: 'center' });

    y += rowH;
  });

  // Table 2 Bottom Reviewer & Approver Sub-row
  const qaRowH = 6.5;
  const halfColW = pageWidth / 2;
  doc.rect(margin, y, pageWidth, qaRowH);
  doc.line(margin + halfColW, y, margin + halfColW, y + qaRowH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Reviewed By:${handlerName}`, margin + 2.5, y + 4.5);
  doc.text(`Approved By:${reviewerName}`, margin + halfColW + 2.5, y + 4.5);

  // Page 2 Footer
  drawFooter(doc, margin, 268, pageWidth, handlerName, reviewerName);

  /* ==========================================================================
     =========================== PAGE 3 =======================================
     ========================================================================== */
  // Only add page 3 if D4 implementation / effectiveness data exists
  const hasD4Data = allCapas.some((cp) => cp.capaRequired !== false && (cp.actionImplemented || cp.effectivenessReview || cp.erp)) ||
    ['D4_IN_PROGRESS', 'CLOSED'].includes(c.status) ||
    c.stage === 'D4';

  if (hasD4Data) {
    doc.addPage();
    y = 10;

    // 1. Header Box (Repeated)
    y = drawSopHeader(doc, margin, y, pageWidth, effDate) + 3;

    // 2. Table 3: Verification of implementation & Effectiveness
    const t3HeadH = 6;
    doc.rect(margin, y, pageWidth, t3HeadH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Verification of implementation & Effectiveness of corrective actions by Corporate QMS', margin + 2.5, y + 4.2);
    y += t3HeadH;

    const t3Cols = [
      { label: 'CA/PA', w: 16 },
      { label: 'Action Implemented', w: 48 },
      { label: 'Effectiveness\nReview', w: 46 },
      { label: 'Effectiveness\nResponsible\nPerson', w: 38 },
      { label: 'Frequency/Timeline', w: 34 }
    ];

    doc.rect(margin, y, pageWidth, colHeadH);
    curX = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);

    t3Cols.forEach((col, idx) => {
      if (idx > 0) doc.line(curX, y, curX, y + colHeadH);
      const lines = col.label.split('\n');
      if (lines.length > 2) {
        doc.text(lines[0], curX + col.w / 2, y + 2.4, { align: 'center' });
        doc.text(lines[1], curX + col.w / 2, y + 5.0, { align: 'center' });
        doc.text(lines[2], curX + col.w / 2, y + 7.4, { align: 'center' });
      } else if (lines.length > 1) {
        doc.text(lines[0], curX + col.w / 2, y + 3.2, { align: 'center' });
        doc.text(lines[1], curX + col.w / 2, y + 6.4, { align: 'center' });
      } else {
        doc.text(col.label, curX + col.w / 2, y + 5.2, { align: 'center' });
      }
      curX += col.w;
    });
    y += colHeadH;

    const t3Rows = allCapas
      .filter((cp) => cp.capaRequired !== false)
      .map((capa) => ({
        capaType: capa.category || 'CA',
        implemented: capa.actionImplemented || '',
        review: capa.effectivenessReview || '',
        erp: capa.erp?.name || capa.responsiblePerson?.name || '',
        schedule: capa.scheduleType === 'Frequency'
          ? (capa.scheduleFrequency || '')
          : (formatSopDate(capa.scheduleTimeline) || '')
      }));

    t3Rows.forEach((row) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);

      const implLines = doc.splitTextToSize(row.implemented || '', t3Cols[1].w - 4);
      const reviewLines = doc.splitTextToSize(row.review || '', t3Cols[2].w - 4);
      const erpLines = doc.splitTextToSize(row.erp || '', t3Cols[3].w - 4);
      const schedLines = doc.splitTextToSize(row.schedule || '', t3Cols[4].w - 4);
      const maxLines = Math.max(implLines.length, reviewLines.length, erpLines.length, schedLines.length, 1);
      const rowH = Math.max(8, maxLines * 3.4 + 4);

      doc.rect(margin, y, pageWidth, rowH);
      let xPos = margin;

      // CA/PA
      doc.text(row.capaType, xPos + t3Cols[0].w / 2, y + 4.5, { align: 'center' });
      xPos += t3Cols[0].w;
      doc.line(xPos, y, xPos, y + rowH);

      // Action Implemented
      doc.text(implLines, xPos + 2, y + 4.2);
      xPos += t3Cols[1].w;
      doc.line(xPos, y, xPos, y + rowH);

      // Effectiveness Review
      doc.text(reviewLines, xPos + 2, y + 4.2);
      xPos += t3Cols[2].w;
      doc.line(xPos, y, xPos, y + rowH);

      // Effectiveness Responsible Person
      doc.text(erpLines, xPos + t3Cols[3].w / 2, y + 4.5, { align: 'center' });
      xPos += t3Cols[3].w;
      doc.line(xPos, y, xPos, y + rowH);

      // Frequency/Timeline
      doc.text(schedLines, xPos + t3Cols[4].w / 2, y + 4.5, { align: 'center' });

      y += rowH;
    });

    // Sub-row: Closure Date & Approved By
    const closeRowH = 6.5;
    const closureDate = formatSopDate(c.closedAt || c.d4?.completedAt || c.updatedAt);
    doc.rect(margin, y, pageWidth, closeRowH);
    doc.line(margin + halfColW, y, margin + halfColW, y + closeRowH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Closure Date:${closureDate}`, margin + 2.5, y + 4.5);
    doc.text(`Approved By:${handlerName}`, margin + halfColW + 2.5, y + 4.5);

    // Page 3 Footer
    drawFooter(doc, margin, 268, pageWidth, handlerName, reviewerName);
  }

  const filename = `customerComplaintReport-${c.complaintNumber || 'QAD'}.pdf`;

  if (options.autoSave) {
    doc.save(filename);
  }

  return {
    doc,
    filename,
    getBlobUrl: () => {
      const blob = doc.output('blob');
      return URL.createObjectURL(blob);
    },
    save: () => doc.save(filename),
  };
}
