import { jsPDF } from 'jspdf';
import { NATURAL_REMEDIES_LOGO } from './logoBase64.js';

export const formatSopDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export function generateComplaintReport(complaint, d3Data = null, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageWidth = 182; // 210 - 2 * 14
  const c = complaint || {};

  // Styling helpers
  const black = [0, 0, 0];
  const borderGrey = [40, 40, 40];

  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.25);

  let y = 14;

  /* ==========================================================================
     1. SOP HEADER BOX (Matches NR/QAD/SOP/001-F01/04 Exactly)
     ========================================================================== */
  const headerHeight = 44;
  const splitColX = margin + 82; // Left column width = 82mm, Right column = 100mm
  const valColX = splitColX + 38; // Label width = 38mm, Value width = 62mm

  // Outer border
  doc.rect(margin, y, pageWidth, headerHeight);

  // Vertical dividers
  doc.line(splitColX, y, splitColX, y + 37); // between left logo column & right metadata
  doc.line(valColX, y, valColX, y + 37); // between right metadata labels & values

  // Horizontal divider lines
  doc.line(splitColX, y + 8, margin + pageWidth, y + 8); // under FORMAT NO
  doc.line(splitColX, y + 16, margin + pageWidth, y + 16); // under EFFECTIVE DATE
  doc.line(margin, y + 24, margin + pageWidth, y + 24); // under EXPIRY DATE / Logo row
  doc.line(margin, y + 30.5, margin + pageWidth, y + 30.5); // under QAD / SUPERSEDES row
  doc.line(margin, y + 37, margin + pageWidth, y + 37); // under SOP / STATUS row

  // 1a. Left Cell: Natural Remedies Logo (Centered in 82mm x 24mm box)
  try {
    if (NATURAL_REMEDIES_LOGO) {
      const logoW = 23;
      const logoH = 20;
      const logoX = margin + (82 - logoW) / 2;
      const logoY = y + (24 - logoH) / 2;
      doc.addImage(NATURAL_REMEDIES_LOGO, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    }
  } catch (err) {
    // Fallback text if image fails
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(34, 139, 34);
    doc.text('natural REMEDIES', margin + 14, y + 14);
  }

  // 1b. Right Top Cell: Metadata (Rows 1 to 3)
  const effDate = formatSopDate(c.complaintDate || c.createdAt || new Date());

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...black);

  // Row 1: FORMAT NO
  doc.text('FORMAT NO', splitColX + 3, y + 5.5);
  doc.text(`: NR/QAD/SOP/001-F01/04`, valColX + 3, y + 5.5);

  // Row 2: EFFECTIVE DATE
  doc.text('EFFECTIVE DATE', splitColX + 3, y + 13.5);
  doc.text(`: ${effDate}`, valColX + 3, y + 13.5);

  // Row 3: EXPIRY DATE
  doc.text('EXPIRY DATE', splitColX + 3, y + 21.5);
  doc.text(':', valColX + 3, y + 21.5);

  // 1c. Row 4: QAD & SUPERSEDES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('QAD', margin + 41, y + 28.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('SUPERSEDES', splitColX + 3, y + 28.5);
  doc.text(': 00', valColX + 3, y + 28.5);

  // 1d. Row 5: STANDARD OPERATING PROCEDURE & STATUS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('STANDARD OPERATING PROCEDURE', margin + 41, y + 35, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('STATUS', splitColX + 3, y + 35);
  doc.text(': Published and Active', valColX + 3, y + 35);

  // 1e. Row 6: Title Banner (Full width)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TITLE:COMPLAINT MANAGMENT REPORT', margin + pageWidth / 2, y + 41.5, { align: 'center' });

  y += headerHeight + 3.5;

  /* ==========================================================================
     2. COMPLAINT INFORMATION TABLE (2 columns, 6 rows)
     ========================================================================== */
  const infoRowH = 6.8;
  const infoTableH = infoRowH * 6;
  const labelColW = 76;

  // Outer border & horizontal dividers
  doc.rect(margin, y, pageWidth, infoTableH);
  doc.line(margin + labelColW, y, margin + labelColW, y + infoTableH);

  for (let i = 1; i < 6; i++) {
    doc.line(margin, y + i * infoRowH, margin + pageWidth, y + i * infoRowH);
  }

  // Data rows
  const customerLocation = [
    c.customer?.name || c.requester?.name || 'Customer',
    c.country || c.location || ''
  ].filter(Boolean).join(' - ');

  const prodName = c.d2?.verifiedProduct?.productName || c.reportedProduct?.name || c.productName || 'N/A';
  const batchNo = c.d2?.verifiedProduct?.batchNumber || c.reportedProduct?.batchNumber || c.batchNumber || 'N/A';
  const isRepetitive = c.d2?.investigation?.repeatComplaint ? 'true' : 'false';
  const complaintNo = c.complaintNumber || 'HHP-26-3-147';

  const complaintRows = [
    ['Date of Complaint Receipt', effDate],
    ['Customer Name & Location', customerLocation],
    ['Product', prodName],
    ['Batch No.', batchNo],
    ['Is the complaint repetitive', isRepetitive],
    ['Internal Complaint registration number', complaintNo],
  ];

  complaintRows.forEach(([lbl, val], idx) => {
    const rowY = y + idx * infoRowH + 4.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...black);
    doc.text(lbl, margin + 3, rowY);

    doc.setFont('helvetica', 'normal');
    doc.text(String(val), margin + labelColW + 3, rowY);
  });

  y += infoTableH + 3.5;

  /* ==========================================================================
     3. DESCRIPTION OF NON-CONFORMITY / COMPLAINT (PROBLEM)
     ========================================================================== */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Description of Non-Conformity / Complaint / Problem :( Attach pictures wherever applicable)', margin, y + 2.5);
  y += 4.5;

  const descH = 24;
  doc.rect(margin, y, pageWidth, descH);

  // Sub-header bar
  const descSubH = 5.5;
  doc.line(margin, y + descSubH, margin + pageWidth, y + descSubH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DESCRIPTION OF COMPLAINT', margin + 3, y + 4);

  // Text inside description box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const complaintDescription = [
    c.shortDescription,
    c.description,
    c.additionalRemarks ? `Remarks: ${c.additionalRemarks}` : null
  ].filter(Boolean).join('\n') || 'Complaint registered for verification and preliminary assessment.';

  const splitDesc = doc.splitTextToSize(complaintDescription, pageWidth - 6);
  doc.text(splitDesc.slice(0, 4), margin + 3, y + descSubH + 4.5);

  y += descH + 3.5;

  /* ==========================================================================
     4. ROOT CAUSE ANALYSIS SECTION
     ========================================================================== */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Root Cause Analysis:', margin, y + 2);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Probable / Potential Root Cause(s):', margin, y + 1.5);
  y += 3.5;

  // Root cause table
  const rcaCols = [
    { label: 'S.No', w: 12 },
    { label: 'Category', w: 26 },
    { label: 'Probable Root Cause / Observation', w: 58 },
    { label: 'Corrective & Preventive Action Plan', w: 50 },
    { label: 'Target Date', w: 20 },
    { label: 'Status', w: 16 }
  ];

  // Header row
  const rcaHeadH = 6;
  doc.rect(margin, y, pageWidth, rcaHeadH);
  let curX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  rcaCols.forEach((col, idx) => {
    if (idx > 0) doc.line(curX, y, curX, y + rcaHeadH);
    doc.text(col.label, curX + 2, y + 4.2);
    curX += col.w;
  });

  y += rcaHeadH;

  // RCA / CAPA rows
  const capas = d3Data?.capas || [];
  const rcaRows = capas.length > 0
    ? capas.map((item, idx) => ({
        sno: String(idx + 1),
        category: item.category || 'CAPA',
        cause: item.description || d3Data?.analysis?.problemStatement || 'Identified during root cause analysis',
        action: item.actionImplemented || item.correctiveAction || item.preventiveAction || 'Action implemented to prevent recurrence',
        date: formatSopDate(item.targetDate || c.complaintDate),
        status: item.isClosed ? 'Closed' : (item.actionStatus || 'Active')
      }))
    : [
        {
          sno: '1',
          category: 'Manufacturing / QAD',
          cause: d3Data?.analysis?.problemStatement || c.shortDescription || 'Under preliminary investigation',
          action: 'Standard operating procedure review and batch verification completed',
          date: effDate,
          status: 'Active'
        }
      ];

  const rcaRowH = 7.5;
  rcaRows.slice(0, 3).forEach((row) => {
    doc.rect(margin, y, pageWidth, rcaRowH);
    let xPos = margin;

    // S.No
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(row.sno, xPos + 2, y + 4.8);
    xPos += rcaCols[0].w;
    doc.line(xPos, y, xPos, y + rcaRowH);

    // Category
    doc.text(doc.splitTextToSize(row.category, rcaCols[1].w - 3)[0] || '', xPos + 2, y + 4.8);
    xPos += rcaCols[1].w;
    doc.line(xPos, y, xPos, y + rcaRowH);

    // Cause
    doc.text(doc.splitTextToSize(row.cause, rcaCols[2].w - 4)[0] || '', xPos + 2, y + 4.8);
    xPos += rcaCols[2].w;
    doc.line(xPos, y, xPos, y + rcaRowH);

    // Action
    doc.text(doc.splitTextToSize(row.action, rcaCols[3].w - 4)[0] || '', xPos + 2, y + 4.8);
    xPos += rcaCols[3].w;
    doc.line(xPos, y, xPos, y + rcaRowH);

    // Date
    doc.text(row.date, xPos + 2, y + 4.8);
    xPos += rcaCols[4].w;
    doc.line(xPos, y, xPos, y + rcaRowH);

    // Status
    doc.text(row.status, xPos + 2, y + 4.8);

    y += rcaRowH;
  });

  y += 4;

  /* ==========================================================================
     5. SIGNATURE & REVIEW BOX
     ========================================================================== */
  const signH = 22;
  const signColW = pageWidth / 3;

  doc.rect(margin, y, pageWidth, signH);
  doc.line(margin + signColW, y, margin + signColW, y + signH);
  doc.line(margin + signColW * 2, y, margin + signColW * 2, y + signH);

  // Top header in sign box
  doc.line(margin, y + 5.5, margin + pageWidth, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('First Responsible Person (FRP)', margin + signColW / 2, y + 4, { align: 'center' });
  doc.text('Complaint Handler / QA', margin + signColW * 1.5, y + 4, { align: 'center' });
  doc.text('Quality Assurance Head', margin + signColW * 2.5, y + 4, { align: 'center' });

  // Names / designations
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(c.frp?.name || 'Naveen K S', margin + signColW / 2, y + 11.5, { align: 'center' });
  doc.text(c.qaContact?.name || 'Narayan Rao Vakamudi', margin + signColW * 1.5, y + 11.5, { align: 'center' });
  doc.text('Authorized QA Signatory', margin + signColW * 2.5, y + 11.5, { align: 'center' });

  // Status bottom bar
  doc.line(margin, y + 16, margin + pageWidth, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Status: Completed (${effDate})`, margin + signColW / 2, y + 20, { align: 'center' });
  doc.text(`Status: Verified (${effDate})`, margin + signColW * 1.5, y + 20, { align: 'center' });
  doc.text(`Status: Published & Active`, margin + signColW * 2.5, y + 20, { align: 'center' });

  /* ==========================================================================
     6. FOOTER
     ========================================================================== */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  doc.text('CONFIDENTIAL - FOR INTERNAL QUALITY ASSURANCE USE ONLY - NATURAL REMEDIES PVT. LTD.', margin, 286);
  doc.text('Page 1 of 1', margin + pageWidth, 286, { align: 'right' });

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
