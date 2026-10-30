import { jsPDF } from '../../../client/node_modules/jspdf/dist/jspdf.es.min.js';
import { NATURAL_REMEDIES_LOGO } from '../../../client/src/lib/logoBase64.js';
import { CapaRecord } from '../models/index.js';

export const formatSopDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Server-side PDF Generator for the official Natural Remedies SOP Complaint Management Report
 * (Format: NR/QAD/SOP/001-F01/04).
 *
 * Attaches to Complaint Handler emails when moving to D4 (Point 32) and upon Final Closure (Point 39).
 */
export async function generateComplaintPdfBuffer(complaint) {
  try {
    const c = complaint || {};
    const capas = c._id
      ? await CapaRecord.find({ complaint: c._id, deletedAt: null }).lean().catch(() => [])
      : [];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;
    const pageWidth = 182; // 210 - 2 * 14

    const black = [0, 0, 0];
    const borderGrey = [40, 40, 40];

    doc.setDrawColor(...borderGrey);
    doc.setLineWidth(0.25);

    let y = 14;

    /* ==========================================================================
       1. SOP HEADER BOX (Matches NR/QAD/SOP/001-F01/04 Exactly)
       ========================================================================== */
    const headerHeight = 44;
    const splitColX = margin + 82;
    const valColX = splitColX + 38;

    // Outer border
    doc.rect(margin, y, pageWidth, headerHeight);

    // Dividers
    doc.line(splitColX, y, splitColX, y + 37);
    doc.line(valColX, y, valColX, y + 37);
    doc.line(splitColX, y + 8, margin + pageWidth, y + 8);
    doc.line(splitColX, y + 16, margin + pageWidth, y + 16);
    doc.line(margin, y + 24, margin + pageWidth, y + 24);
    doc.line(margin, y + 30.5, margin + pageWidth, y + 30.5);
    doc.line(margin, y + 37, margin + pageWidth, y + 37);

    // Logo
    try {
      if (NATURAL_REMEDIES_LOGO) {
        const logoW = 23;
        const logoH = 20;
        const logoX = margin + (82 - logoW) / 2;
        const logoY = y + (24 - logoH) / 2;
        doc.addImage(NATURAL_REMEDIES_LOGO, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
      }
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(34, 139, 34);
      doc.text('natural REMEDIES', margin + 14, y + 14);
    }

    const effDate = formatSopDate(c.complaintDate || c.createdAt || new Date());

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...black);

    doc.text('FORMAT NO', splitColX + 3, y + 5.5);
    doc.text(`: NR/QAD/SOP/001-F01/04`, valColX + 3, y + 5.5);

    doc.text('EFFECTIVE DATE', splitColX + 3, y + 13.5);
    doc.text(`: ${effDate}`, valColX + 3, y + 13.5);

    doc.text('EXPIRY DATE', splitColX + 3, y + 21.5);
    doc.text(':', valColX + 3, y + 21.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('QAD', margin + 41, y + 28.5, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('SUPERSEDES', splitColX + 3, y + 28.5);
    doc.text(': 00', valColX + 3, y + 28.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('STANDARD OPERATING PROCEDURE', margin + 41, y + 35, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('STATUS', splitColX + 3, y + 35);
    doc.text(': Published and Active', valColX + 3, y + 35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('TITLE:COMPLAINT MANAGMENT REPORT', margin + pageWidth / 2, y + 41.5, { align: 'center' });

    y += headerHeight + 3.5;

    /* ==========================================================================
       2. COMPLAINT INFORMATION TABLE
       ========================================================================== */
    const infoRowH = 6.8;
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
    ].filter(Boolean).join(' - ');

    const prodName = c.d2?.verifiedProduct?.productName || c.reportedProduct?.name || c.productName || 'N/A';
    const batchNo = c.d2?.verifiedProduct?.batchNumber || c.reportedProduct?.batchNumber || c.batchNumber || 'N/A';
    const isRepetitive = c.d2?.investigation?.repeatComplaint ? 'true' : 'false';
    const complaintNo = c.complaintNumber || 'CMP-RECORD';

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
       3. DESCRIPTION OF NON-CONFORMITY / COMPLAINT
       ========================================================================== */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...black);
    doc.text('Description of Non-Conformity / Complaint / Problem :( Attach pictures wherever applicable)', margin, y + 2.5);
    y += 4.5;

    const descH = 22;
    doc.rect(margin, y, pageWidth, descH);

    const descSubH = 5.5;
    doc.line(margin, y + descSubH, margin + pageWidth, y + descSubH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DESCRIPTION OF COMPLAINT', margin + 3, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const complaintDescription = [
      c.shortDescription,
      c.description,
      c.additionalRemarks ? `Remarks: ${c.additionalRemarks}` : null
    ].filter(Boolean).join('\n') || 'Complaint registered for verification and preliminary assessment.';

    const splitDesc = doc.splitTextToSize(complaintDescription, pageWidth - 6);
    doc.text(splitDesc.slice(0, 3), margin + 3, y + descSubH + 4.5);

    y += descH + 3.5;

    /* ==========================================================================
       4. ROOT CAUSE ANALYSIS & CAPA SECTION
       ========================================================================== */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Root Cause Analysis:', margin, y + 2);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Probable / Potential Root Cause(s):', margin, y + 1.5);
    y += 3.5;

    const rcaCols = [
      { label: 'S.No', w: 12 },
      { label: 'Category', w: 26 },
      { label: 'Probable Root Cause / Observation', w: 58 },
      { label: 'Corrective & Preventive Action Plan', w: 50 },
      { label: 'Target Date', w: 20 },
      { label: 'Status', w: 16 }
    ];

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

    const rcaRows = capas.length > 0
      ? capas.map((item, idx) => ({
          sno: String(idx + 1),
          category: item.category || 'CAPA',
          cause: item.description || item.rcDescription || c.shortDescription || 'Identified root cause',
          action: item.actionImplemented || item.correctiveAction || item.preventiveAction || 'Action implemented',
          date: formatSopDate(item.targetDate || c.complaintDate),
          status: item.isClosed ? 'Closed' : (item.actionStatus || 'Active')
        }))
      : [
          {
            sno: '1',
            category: 'Manufacturing / QAD',
            cause: c.shortDescription || 'Under preliminary investigation',
            action: 'Batch records verification and review completed',
            date: effDate,
            status: 'Active'
          }
        ];

    const rcaRowH = 7.5;
    rcaRows.slice(0, 4).forEach((row) => {
      doc.rect(margin, y, pageWidth, rcaRowH);
      let xPos = margin;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(row.sno, xPos + 2, y + 4.8);
      xPos += rcaCols[0].w;
      doc.line(xPos, y, xPos, y + rcaRowH);

      doc.text(doc.splitTextToSize(row.category, rcaCols[1].w - 3)[0] || '', xPos + 2, y + 4.8);
      xPos += rcaCols[1].w;
      doc.line(xPos, y, xPos, y + rcaRowH);

      doc.text(doc.splitTextToSize(row.cause, rcaCols[2].w - 4)[0] || '', xPos + 2, y + 4.8);
      xPos += rcaCols[2].w;
      doc.line(xPos, y, xPos, y + rcaRowH);

      doc.text(doc.splitTextToSize(row.action, rcaCols[3].w - 4)[0] || '', xPos + 2, y + 4.8);
      xPos += rcaCols[3].w;
      doc.line(xPos, y, xPos, y + rcaRowH);

      doc.text(row.date, xPos + 2, y + 4.8);
      xPos += rcaCols[4].w;
      doc.line(xPos, y, xPos, y + rcaRowH);

      doc.text(row.status, xPos + 2, y + 4.8);

      y += rcaRowH;
    });

    y += 4;

    /* ==========================================================================
       5. SIGNATURE & REVIEW SECTION
       ========================================================================== */
    const signH = 22;
    const signColW = pageWidth / 3;

    doc.rect(margin, y, pageWidth, signH);
    doc.line(margin + signColW, y, margin + signColW, y + signH);
    doc.line(margin + signColW * 2, y, margin + signColW * 2, y + signH);
    doc.line(margin, y + 5.5, margin + pageWidth, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('INVESTIGATED BY', margin + signColW / 2, y + 4, { align: 'center' });
    doc.text('REVIEWED BY', margin + signColW * 1.5, y + 4, { align: 'center' });
    doc.text('APPROVED BY', margin + signColW * 2.5, y + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`FRP: ${c.frp?.name || 'Quality Team'}`, margin + 3, y + 10);
    doc.text(`Date: ${effDate}`, margin + 3, y + 15);

    doc.text(`Handler: ${c.coordinator?.name || 'Sneha Gupta'}`, margin + signColW + 3, y + 10);
    doc.text(`Date: ${effDate}`, margin + signColW + 3, y + 15);

    doc.text('QA Department Head', margin + signColW * 2 + 3, y + 10);
    doc.text(`Status: ${c.status || 'Active'}`, margin + signColW * 2 + 3, y + 15);

    return Buffer.from(doc.output('arraybuffer'));
  } catch (err) {
    console.error('Error generating complaint PDF buffer:', err);
    return null;
  }
}

