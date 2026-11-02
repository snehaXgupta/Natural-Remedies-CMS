import env from '../config/env.js';

/**
 * Standard Email Templates Matching the Complaint Registration & Management Process Overview SOP
 * 
 * Consistent styling across all templates:
 * - Clean, professional corporate design with Salesforce Lightning styling (#0176d3 buttons)
 * - Sign-off: "Customer Relationship Management Team"
 * - Footnote: "Note: This is an auto-generated email. Please do not reply to this email."
 * - All complaint fields are strictly HTML-escaped.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function complaintLink(complaintId) {
  return `${env.APP_BASE_URL.replace(/\/$/, '')}/complaints/${complaintId}`;
}

export function capaLink(complaintId) {
  return `${env.APP_BASE_URL.replace(/\/$/, '')}/complaints/${complaintId}?tab=D3`;
}

const CRM_SIGN_OFF_HTML = `<p style="margin:20px 0 4px;font-size:13px;color:#222222;">Best Regards,</p>
<p style="margin:0;font-size:13px;font-weight:700;color:#1e293b;">Customer Relationship Management Team</p>`;

const AUTO_FOOTNOTE = 'Note: This is an auto-generated email. Please do not reply to this email.';

/** Clean, left-aligned HTML email container */
function layout({ title, bodyHtml, footnote = AUTO_FOOTNOTE }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#334155;">
  <div style="max-width:650px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:28px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    ${bodyHtml}
    ${CRM_SIGN_OFF_HTML}
    ${footnote ? `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px 0;" /><p style="font-size:11px;font-style:italic;color:#64748b;margin:0;">${footnote}</p>` : ''}
  </div>
</body></html>`;
}

function button(href, label) {
  return `<div style="margin:18px 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#0176d3;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;padding:9px 20px;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.1);">${escapeHtml(label)}</a>
  </div>`;
}

/** Two-column details table, matching Salesforce standard email style */
function detailsBlock(rows) {
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:14px 0 18px;border:1px solid #dcdfe4;font-size:13px;">
${rows
  .map(
    ([k, v]) => `<tr><td style="padding:7px 12px;width:38%;background:#f8fafc;font-weight:700;color:#334155;border:1px solid #dcdfe4;vertical-align:middle;">${escapeHtml(k)}</td><td style="padding:7px 12px;background:#ffffff;color:#1e293b;border:1px solid #dcdfe4;vertical-align:middle;">${v ? escapeHtml(v) : '<span style="color:#94a3b8;">—</span>'}</td></tr>`,
  )
  .join('\n')}
</table>`;
  const text = rows.map(([k, v]) => `- ${k}: ${v || '—'}`).join('\n');
  return { html, text };
}

function productName(c) {
  return c.d2?.verifiedProduct?.productName || c.reportedProduct?.name || '—';
}

function batchNumber(c) {
  return c.d2?.verifiedProduct?.batchNumber || c.reportedProduct?.batchNumber || '—';
}

function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year}, ${pad(hours)}:${minutes} ${ampm}`;
}

/* --------------------------------------------------------------------------
   STAGE 1: REGISTRATION & D1 STAGE
-------------------------------------------------------------------------- */

/**
 * 1. Upon successful registration -> Sent to Complaint Handler (SOP Page 2 & 4)
 * Subject: New Complaint Created: [number]
 */
export function newComplaintHandler(complaint, handler = {}) {
  const number = complaint.complaintNumber;
  const subject = `New Complaint Created: ${number}`;
  const link = complaintLink(complaint._id);
  const handlerName = handler.name || complaint.coordinator?.name || 'Complaint Handler';

  const rows = [
    ['Complaint Number', number],
    ['Complaint Date', formatDateTime(complaint.complaintDate || complaint.createdAt)],
    ['Requested By', complaint.requester?.name || '—'],
    ['Requestor Email', complaint.requester?.email || '—'],
    ['Requestor Mobile', complaint.requester?.mobile || '—'],
    ['Origin', complaint.origin || 'Call'],
    ['Short Description', complaint.shortDescription || '—'],
    ['SBU', complaint.sbu || '—'],
    ['Country', complaint.country || '—'],
    ['Distributor/Retailer', complaint.customer?.name || '—'],
    ['Product Name', productName(complaint)],
    ['Batch Number', batchNumber(complaint)],
  ];

  const details = detailsBlock(rows);

  const text = [
    'New Complaint Notification',
    '',
    `Dear ${handlerName},`,
    '',
    'A new complaint has been assigned to you. Please find the details below:',
    '',
    details.text,
    '',
    `View Complaint Record: ${link}`,
    '',
    'Please take necessary action on this complaint.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#1e3a8a;margin:0 0 16px;">New Complaint Notification</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(handlerName)},</p>
<p style="margin:0 0 16px;">A new complaint has been assigned to you. Please find the details below:</p>
${details.html}
${button(link, 'View Complaint Record')}
<p style="margin:16px 0 0;">Please take necessary action on this complaint.</p>`,
  });

  return { subject, text, html };
}

/**
 * 2. D1 to D2 Stage Transition -> Sent to Complaint Requester (SOP Page 5, Step 6.b)
 * Subject: Complaint Acknowledgement for D1 Stage- [number]
 */
export function d1Acknowledgement(complaint, { recipientName } = {}) {
  const number = complaint.complaintNumber;
  const subject = `Complaint Acknowledgement for D1 Stage- ${number}`;
  const name = recipientName || complaint.requester?.name || 'Customer';

  const text = [
    `Dear ${name},`,
    '',
    'Thank you for bringing this matter to our attention.',
    '',
    `We have received your complaint ${number} and our team is reviewing it.`,
    '',
    'We will update you on the progress shortly.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<p style="margin:0 0 14px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 14px;">Thank you for bringing this matter to our attention.</p>
<p style="margin:0 0 14px;">We have received your complaint <strong>${escapeHtml(number)}</strong> and our team is reviewing it.</p>
<p style="margin:0 0 14px;">We will update you on the progress shortly.</p>`,
  });

  return { subject, text, html };
}

/**
 * 3. D1 to D2 Stage Transition -> Sent to Complaint Handler (SOP Page 5, Step 6.a)
 * Subject: Complaint [number] D1 stage Completion Update
 */
export function d1CompletionHandler(complaint, { handlerName } = {}) {
  const number = complaint.complaintNumber;
  const subject = `Complaint ${number} D1 stage Completion Update`;
  const link = complaintLink(complaint._id);
  const name = handlerName || complaint.coordinator?.name || 'Complaint Handler';

  const text = [
    `Dear ${name},`,
    '',
    `We are pleased to inform you that complaint ${number} has completed D1 Stage and moved to D2 stage.`,
    '',
    'Please proceed with the D2 stage process. If you have any concerns, please feel free to reach out.',
    '',
    `View Complaint Record: ${link}`,
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<p style="margin:0 0 14px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 14px;">We are pleased to inform you that complaint <strong>${escapeHtml(number)}</strong> has completed D1 Stage and moved to D2 stage.</p>
<p style="margin:0 0 14px;">Please proceed with the D2 stage process. If you have any concerns, please feel free to reach out.</p>
${button(link, 'View Complaint Record')}`,
  });

  return { subject, text, html };
}

/* --------------------------------------------------------------------------
   STAGE 2: D2 GRASP THE SITUATION & FRP ASSIGNMENT
-------------------------------------------------------------------------- */

/**
 * 4. FRP Assigned with Send Mail to FRP selected (SOP Page 6, Step 8.b)
 * Subject: First Responsible Person for the complaint [number]
 */
export function d2FrpAssigned(complaint, frp = {}) {
  const number = complaint.complaintNumber;
  const subject = `First Responsible Person for the complaint ${number}`;
  const link = complaintLink(complaint._id);
  const name = frp.name || 'First Responsible Person';

  const details = detailsBlock([
    ['Complaint Number', number],
    ['Current Stage', 'D2 - Investigation & Analysis'],
    ['Type of Failure', complaint.d2?.investigation?.typeOfFailure || '—'],
    ['Manufacturing Location', complaint.d2?.investigation?.manufacturingLocation || '—'],
    ['Product Name', productName(complaint)],
    ['Batch Number', batchNumber(complaint)],
    ['Short Description', complaint.shortDescription || '—'],
  ]);

  const text = [
    `Dear ${name},`,
    '',
    'You have been assigned as the First Responsible Person (FRP) for the following complaint. Please review the details and take necessary action.',
    '',
    'Complaint Details:',
    details.text,
    '',
    `View Complaint Record: ${link}`,
    '',
    'Note: The complaint owner has flagged this for your immediate attention. Please prioritize this investigation and complete the D2 stage analysis.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<p style="margin:0 0 14px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 14px;">You have been assigned as the <strong>First Responsible Person (FRP)</strong> for the following complaint. Please review the details and take necessary action.</p>
<p style="margin:0 0 6px;font-weight:700;color:#1e293b;">Complaint Details:</p>
${details.html}
${button(link, 'View Complaint Record')}
<p style="margin:14px 0 0;font-size:12px;color:#475569;"><strong>Note:</strong> The complaint owner has flagged this for your immediate attention. Please prioritize this investigation and complete the D2 stage analysis.</p>`,
  });

  return { subject, text, html };
}

/**
 * 5. D2 SLA Extension Request -> Sent to FRP Manager (SOP Page 7, Step 12)
 * Subject: D2 SLA Extension Request for Complaint [number]
 */
export function d2SlaExtensionRequest(complaint, { managerName, frpName, hours, reason } = {}) {
  const number = complaint.complaintNumber;
  const subject = `D2 SLA Extension Request for Complaint ${number}`;
  const link = complaintLink(complaint._id);

  const details = detailsBlock([
    ['Complaint Number', number],
    ['Current Stage', 'D2'],
    ['Extension Hours Requested', `${hours || 24} hours`],
    ['Reason for Extension', reason || 'Testing & analysis ongoing'],
    ['First Responsible Person Assigned', frpName || complaint.frp?.name || 'Assigned FRP'],
  ]);

  const text = [
    'D2 SLA Extension Request',
    '',
    `Dear ${managerName || 'Manager'},`,
    '',
    `A request has been submitted to extend the D2 stage SLA for the following complaint:`,
    '',
    details.text,
    '',
    `View Complaint Record: ${link}`,
    '',
    'Please review and approve/reject this extension request.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:15px;font-weight:700;color:#1e3a8a;margin:0 0 14px;">D2 SLA Extension Request</h2>
<p style="margin:0 0 14px;">Dear ${escapeHtml(managerName || 'Manager')},</p>
<p style="margin:0 0 14px;">A request has been submitted to extend the D2 stage SLA for the following complaint:</p>
${details.html}
${button(link, 'View Complaint Record')}
<p style="margin:14px 0 0;">Please review and approve/reject this extension request.</p>`,
  });

  return { subject, text, html };
}

/**
 * 6. D2 Completion -> Sent to Complaint Handler & FRP (SOP Page 8, Step 13)
 * Subject: Complaint [number] D2 stage Completion Update
 */
export function d2Completed(complaint, { recipientName, frpName } = {}) {
  const number = complaint.complaintNumber;
  const subject = `Complaint ${number} D2 stage Completion Update`;
  const link = complaintLink(complaint._id);
  const name = recipientName || complaint.coordinator?.name || 'Complaint Handler';

  const details = detailsBlock([
    ['Complaint Number', number],
    ['Type of Failure', complaint.d2?.investigation?.typeOfFailure || '—'],
    ['Manufacturing Location', complaint.d2?.investigation?.manufacturingLocation || '—'],
    ['FRP Assigned', frpName || complaint.frp?.name || 'Assigned FRP'],
  ]);

  const text = [
    `Dear ${name},`,
    '',
    `We would like to inform you that the D2 Stage (Process Mapping & Assignment) for complaint ${number} has been completed.`,
    '',
    'Complaint Details:',
    details.text,
    '',
    `View Complaint Record: ${link}`,
    '',
    'The assigned investigation team has initiated a comprehensive analysis of the complaint. You will be notified of any significant developments throughout the process.',
    '',
    'We appreciate your attention to this matter.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<p style="margin:0 0 14px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 14px;">We would like to inform you that the <strong>D2 Stage (Process Mapping &amp; Assignment)</strong> for complaint <strong>${escapeHtml(number)}</strong> has been completed.</p>
<p style="margin:0 0 6px;font-weight:700;color:#1e293b;">Complaint Details:</p>
${details.html}
${button(link, 'View Complaint Record')}
<p style="margin:14px 0 10px;">The assigned investigation team has initiated a comprehensive analysis of the complaint. You will be notified of any significant developments throughout the process.</p>
<p style="margin:0;">We appreciate your attention to this matter.</p>`,
  });

  return { subject, text, html };
}

/* --------------------------------------------------------------------------
   STAGE 3: D3 RCA & CAPA APPROVAL WORKFLOW
-------------------------------------------------------------------------- */

/**
 * 7. FRP submits Root Causes for Approval -> Sent to FRP Manager (SOP Page 11, Step 18.k)
 * Subject: Root Cause Approval Required From FRP Manager - Complaint [number]
 */
export function rootCauseApprovalRequest(complaint, { managerName, frpName, count = 1, rootCauses = [] } = {}) {
  const number = complaint.complaintNumber;
  const subject = `Root Cause Approval Required From FRP Manager - Complaint ${number}`;
  const link = complaintLink(complaint._id);

  let rcTableHtml = '';
  let rcTableText = '';
  if (rootCauses.length > 0) {
    rcTableHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:14px 0;font-size:12px;border:1px solid #dcdfe4;">
      <thead>
        <tr style="background:#f1f5f9;font-weight:700;color:#334155;">
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">CAPA Name</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">RC Category</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">RC Description</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">CAPA Required</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">CAPA Category</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">CAPA Description</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rootCauses
          .map(
            (r, i) => `<tr>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.capaNumber || `CAPA-${i + 1}`)}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.rcCategory || r.category || '—')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.rcDescription || r.description || '—')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${r.capaRequired !== false ? '✓ Yes' : 'No'}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.category || 'CA')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.description || '—')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;color:#b45309;font-weight:600;">Pending</td>
            </tr>`,
          )
          .join('\n')}
      </tbody>
    </table>`;
    rcTableText = rootCauses
      .map(
        (r, i) =>
          `* ${r.capaNumber || `CAPA-${i + 1}`} | ${r.rcCategory || r.category} | ${r.rcDescription || r.description} | Pending`,
      )
      .join('\n');
  }

  const text = [
    'Root Cause Approval Request',
    '',
    `Dear ${managerName || 'FRP Manager'},`,
    '',
    `Your team member ${frpName || 'FRP'} has submitted root causes for complaint ${number} that require your approval.`,
    `Total Root Causes Submitted: ${count}`,
    '',
    rcTableText ? rcTableText + '\n' : '',
    `View Complaint Record: ${link}`,
    '',
    'Please review and approve the identified root causes.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#1e3a8a;margin:0 0 14px;">Root Cause Approval Request</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(managerName || 'FRP Manager')},</p>
<p style="margin:0 0 10px;">Your team member <strong>${escapeHtml(frpName || 'FRP')}</strong> has submitted root causes for complaint <strong>${escapeHtml(number)}</strong> that require your approval.</p>
<p style="margin:0 0 14px;font-weight:600;">Total Root Causes Submitted: ${count}</p>
${rcTableHtml}
${button(link, 'View Complaint Record')}
<p style="margin:14px 0 0;">Please review and approve the identified root causes.</p>`,
  });

  return { subject, text, html };
}

/** Legacy / alias wrapper */
export function d3ApprovalRequest(complaint, options = {}) {
  return rootCauseApprovalRequest(complaint, {
    managerName: options.reviewerName,
    frpName: options.submitterName,
    count: options.rootCauses,
  });
}

/**
 * 8. Root Cause Rejection by FRP Manager or Complaint Handler (SOP Page 12, Step 19 & Page 14, Step 22)
 * Subject: CAPA Rejected - Action Required - [CAPA Number]
 */
export function d3CapaRejected(complaint, capa, rootCause, { recipientName, rejectedBy, stageLabel, reviewerRole = 'FRP Manager', remarks } = {}) {
  const number = complaint.complaintNumber;
  const capaNumber = capa?.capaNumber || 'CAPA-Record';
  const subject = `CAPA Rejected - Action Required - ${capaNumber}`;
  const link = capaLink(complaint._id);
  const roleName = stageLabel || reviewerRole;

  const details = detailsBlock([
    ['CAPA Number', capaNumber],
    ['Complaint Number', number],
    ['Rejected By', rejectedBy || 'Manager'],
    ['Rejected At Stage', `Root Cause Review - ${roleName}`],
    ['Root Cause Category', rootCause?.category || capa?.rcCategory || '—'],
    ['Root Cause Description', rootCause?.description || capa?.rcDescription || '—'],
    ['CAPA Category', capa?.category || 'CA'],
    ['CAPA Description', capa?.description || '—'],
    ['Current Review Status', 'Open'],
    ['Current Approval Status', 'Rejected'],
    ['Rejection Remarks', remarks || 'Insufficient root cause / CAPA definition'],
  ]);

  const text = [
    `⚠️ CAPA REJECTED BY ${roleName.toUpperCase()} - ACTION REQUIRED`,
    '',
    `Dear ${recipientName || 'First Responsible Person'},`,
    '',
    `The CAPA ${capaNumber} has been rejected by ${roleName} ${rejectedBy || ''} during the Root Cause Review stage.`,
    '',
    details.text,
    '',
    `View CAPA Record: ${link}`,
    '',
    `Action Required: Please review the ${roleName}'s rejection comments above, revise the Root Cause and CAPA details accordingly, and resubmit for review.`,
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:15px;font-weight:700;color:#dc2626;margin:0 0 14px;">⚠️ CAPA REJECTED BY ${escapeHtml(roleName.toUpperCase())} - ACTION REQUIRED</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(recipientName || 'First Responsible Person')},</p>
<p style="margin:0 0 14px;">The CAPA <strong>${escapeHtml(capaNumber)}</strong> has been rejected by ${escapeHtml(roleName)} <strong>${escapeHtml(rejectedBy || '')}</strong> during the Root Cause Review stage.</p>
${details.html}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 0;color:#dc2626;font-weight:600;">Action Required: Please review the ${escapeHtml(roleName)}'s rejection comments above, revise the Root Cause and CAPA details accordingly, and resubmit for review.</p>`,
  });

  return { subject, text, html };
}

/**
 * 9. FRP Manager Approves Root Causes -> Sent to FRP & Complaint Handler (SOP Page 13, Step 20.n & 20.o)
 */
export function rootCausesApprovedNotice(complaint, { recipientName, managerName, isHandler = false, count = 1, rootCauses = [] } = {}) {
  const number = complaint.complaintNumber;
  const link = capaLink(complaint._id);

  let rcTableHtml = '';
  if (rootCauses.length > 0) {
    rcTableHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:14px 0;font-size:12px;border:1px solid #dcdfe4;">
      <thead>
        <tr style="background:#f1f5f9;font-weight:700;color:#334155;">
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">CAPA Name</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">RC Category</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">RC Description</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">CAPA Category</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">CAPA Description</th>
          <th style="padding:6px 8px;border:1px solid #dcdfe4;text-align:left;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rootCauses
          .map(
            (r, i) => `<tr>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.capaNumber || `CAPA-${i + 1}`)}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.rcCategory || r.category || '—')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.rcDescription || r.description || '—')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.category || 'CA')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;">${escapeHtml(r.description || '—')}</td>
              <td style="padding:6px 8px;border:1px solid #dcdfe4;color:#16a34a;font-weight:600;">✓ Approved</td>
            </tr>`,
          )
          .join('\n')}
      </tbody>
    </table>`;
  }

  if (isHandler) {
    // 20.o Email to Complaint Handler
    const subject = `All Root Causes Approved from FRP Manager for - ${number}`;
    const text = [
      '✓ All Root Causes Approved',
      '',
      `Dear ${recipientName || 'Complaint Handler'},`,
      '',
      `All Root Causes (CAFAs) for complaint ${number} have been successfully approved by ${managerName || 'FRP Manager'}.`,
      `Total Root Causes Approved: ${count}`,
      '',
      `View CAPA Record: ${link}`,
      '',
      'Status: All corrective and preventive actions have been approved. You may now proceed with the CAPA Implementation phase.',
      '',
      'Best Regards,',
      'Customer Relationship Management Team',
      '',
      AUTO_FOOTNOTE,
    ].join('\n');

    const html = layout({
      title: subject,
      bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#16a34a;margin:0 0 14px;">✓ All Root Causes Approved</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(recipientName || 'Complaint Handler')},</p>
<p style="margin:0 0 10px;">All Root Causes (CAFAs) for complaint <strong>${escapeHtml(number)}</strong> have been successfully approved by <strong>${escapeHtml(managerName || 'FRP Manager')}</strong>.</p>
<p style="margin:0 0 14px;font-weight:600;">Total Root Causes Approved: ${count}</p>
${rcTableHtml}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 0;font-weight:600;color:#1e293b;">Status: All corrective and preventive actions have been approved. You may now proceed with the CAPA Implementation phase.</p>`,
    });

    return { subject, text, html };
  }

  // 20.n Email to FRP
  const subject = `Your Root Causes Have Been Approved - ${number}`;
  const text = [
    '✓ All Root Causes Approved by FRP Manager',
    '',
    `Dear ${recipientName || 'First Responsible Person'},`,
    '',
    `All Root Causes submitted by you for complaint ${number} have been reviewed and approved by ${managerName || 'FRP Manager'}.`,
    `Total Root Causes Approved: ${count}`,
    '',
    `View CAPA Record: ${link}`,
    '',
    'No further action is required from your end at this stage.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#16a34a;margin:0 0 14px;">✓ All Root Causes Approved by FRP Manager</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(recipientName || 'First Responsible Person')},</p>
<p style="margin:0 0 10px;">All Root Causes submitted by you for complaint <strong>${escapeHtml(number)}</strong> have been reviewed and approved by <strong>${escapeHtml(managerName || 'FRP Manager')}</strong>.</p>
<p style="margin:0 0 14px;font-weight:600;">Total Root Causes Approved: ${count}</p>
${rcTableHtml}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 0;color:#64748b;">No further action is required from your end at this stage.</p>`,
  });

  return { subject, text, html };
}

/**
 * 10. Handler Approves -> Assigned to Responsible Person (RP) (SOP Page 14 & 15, Step 23 / 25.b)
 * Subject: CAPA Implementation Assignment - [CAPA Number]
 */
export function capaImplementationAssignment(complaint, capa, { rpName } = {}) {
  const number = complaint.complaintNumber;
  const capaNumber = capa?.capaNumber || 'CAPA-Record';
  const subject = `CAPA Implementation Assignment - ${capaNumber}`;
  const link = capaLink(complaint._id);
  const name = rpName || capa?.responsiblePerson?.name || 'Responsible Person';

  const details = detailsBlock([
    ['CAPA Number', capaNumber],
    ['Complaint Number', number],
    ['Root Cause Category', capa?.rcCategory || '—'],
    ['Root Cause Description', capa?.rcDescription || capa?.description || '—'],
    ['CAPA Category', capa?.category || 'CA'],
    ['CAPA Description', capa?.description || '—'],
  ]);

  const text = [
    'CAPA Implementation Assignment',
    '',
    `Dear ${name},`,
    '',
    `You have been assigned as Responsible Person to implement the following CAPA for complaint ${number}:`,
    '',
    details.text,
    '',
    `View CAPA Record: ${link}`,
    '',
    'Action Required: Please implement the CAPA and update the implementation details in the system once completed.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#1e3a8a;margin:0 0 14px;">CAPA Implementation Assignment</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 14px;">You have been assigned as Responsible Person to implement the following CAPA for complaint <strong>${escapeHtml(number)}</strong>:</p>
${details.html}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 0;color:#b91c1c;font-weight:600;">Action Required: Please implement the CAPA and update the implementation details in the system once completed.</p>`,
  });

  return { subject, text, html };
}

/**
 * 11. Multi-tier Review Requests: FRP, Handler, QA (SOP Page 16, 17, 18)
 * Subject: CAPA Review Required ([Role]) - [CAPA Number]
 */
export function capaReviewRequired(complaint, capa, { reviewerName, reviewerRole = 'Handler', implementedBy, handlerName } = {}) {
  const number = complaint.complaintNumber;
  const capaNumber = capa?.capaNumber || 'CAPA-Record';
  const link = capaLink(complaint._id);

  let subject = `CAPA Review Required (${reviewerRole}) - ${capaNumber}`;
  let title = `CAPA Review Required - ${reviewerRole}`;
  let intro = '';
  let note = '';

  if (reviewerRole === 'QA Manager' || reviewerRole === 'QA') {
    subject = `CAPA Final Approval Required (QA Manager) - ${capaNumber}`;
    title = 'CAPA Final Approval Required - QA';
    intro = `The CAPA has been reviewed and approved by the Complaint Handler (${handlerName || 'Complaint Handler'}). Your final approval is required.`;
  } else if (reviewerRole === 'FRP') {
    intro = `The CAPA implementation has been completed by ${implementedBy || 'Responsible Person'} and requires your review as First Responsible Person.`;
    note = 'Note: Upon your approval, this will be forwarded to the Complaint Handler for further review.';
  } else {
    // Handler
    intro = `The CAPA implementation has been completed by ${implementedBy || 'Responsible Person'} and requires your review as Complaint Handler.`;
    note = 'Note: Upon your approval, this will be forwarded to QA Manager for final approval.';
  }

  const rows = [
    ['CAPA Number', capaNumber],
    ['Complaint Number', number],
    ['Root Cause Category', capa?.rcCategory || '—'],
    ['Root Cause Description', capa?.rcDescription || capa?.description || '—'],
    ['CAPA Category', capa?.category || 'CA'],
    ['CAPA Description', capa?.description || '—'],
    ['Implemented By', implementedBy || 'Responsible Person'],
  ];
  if (handlerName && reviewerRole.includes('QA')) {
    rows.push(['Handler Reviewed By', handlerName]);
  }
  rows.push(['Current Review Status', 'Open']);
  if (reviewerRole.includes('QA')) {
    rows.push(['Current Approval Status', 'Approved']);
  }

  const details = detailsBlock(rows);

  const text = [
    title,
    '',
    `Dear ${reviewerName || reviewerRole},`,
    '',
    intro,
    '',
    details.text,
    '',
    `View CAPA Record: ${link}`,
    '',
    `Action Required: Please review the CAPA implementation and update the ${reviewerRole.includes('QA') ? 'Approval Status' : 'Review Status'} field to approve or reject.`,
    ...(note ? ['', note] : []),
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#1e3a8a;margin:0 0 14px;">${escapeHtml(title)}</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(reviewerName || reviewerRole)},</p>
<p style="margin:0 0 14px;">${escapeHtml(intro)}</p>
${details.html}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 6px;color:#1e293b;font-weight:600;">Action Required: Please review the CAPA implementation and update the ${reviewerRole.includes('QA') ? 'Approval Status' : 'Review Status'} field to provide final approval or rejection.</p>
${note ? `<p style="margin:0;font-size:12px;color:#64748b;">${escapeHtml(note)}</p>` : ''}`,
  });

  return { subject, text, html };
}

/**
 * 12. Implementation Rejection: by FRP, Handler, or QA (SOP Page 18, 19)
 * Subject: CAPA Rejected - Action Required - [CAPA Number]
 */
export function capaImplementationRejected(complaint, capa, { recipientName, rejectedBy, tier = 'Handler', remarks } = {}) {
  const number = complaint.complaintNumber;
  const capaNumber = capa?.capaNumber || 'CAPA-Record';
  const subject = `CAPA Rejected - Action Required - ${capaNumber}`;
  const link = capaLink(complaint._id);
  const tierUpper = tier.toUpperCase();

  let header = `⚠️ CAPA IMPLEMENTATION REJECTED BY ${tierUpper} - ACTION REQUIRED`;
  let stageName = `Implementation Review - ${tier}`;
  if (tierUpper.includes('QA')) {
    header = '⚠️ CAPA FINAL APPROVAL REJECTED BY QA- ACTION REQUIRED';
    stageName = 'Final Approval - QA';
  }

  const details = detailsBlock([
    ['CAPA Number', capaNumber],
    ['Complaint Number', number],
    ['Rejected By', rejectedBy || 'Reviewer'],
    ['Rejected At Stage', stageName],
    ['Root Cause Category', capa?.rcCategory || '—'],
    ['Root Cause Description', capa?.rcDescription || '—'],
    ['CAPA Category', capa?.category || 'CA'],
    ['CAPA Description', capa?.description || '—'],
    ['Action Implemented', capa?.actionImplemented || '—'],
    ['Current Review Status', 'Open'],
    ['Current Approval Status', 'Rejected'],
    ['Rejection Remarks', remarks || 'None provided'],
  ]);

  const text = [
    header,
    '',
    `Dear ${recipientName || 'Responsible Person'},`,
    '',
    `The CAPA ${capaNumber} has been rejected by ${tier} ${rejectedBy || ''} during the ${stageName} stage.`,
    '',
    details.text,
    '',
    `View CAPA Record: ${link}`,
    '',
    `Action Required: Please review the ${tier}'s rejection comments above, revise the implementation details accordingly, and resubmit for review.`,
    ...(tierUpper.includes('QA')
      ? ['', 'Note: Since this was rejected at the Final Approval stage, the CAPA will need to go through the full review process again.']
      : []),
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:15px;font-weight:700;color:#dc2626;margin:0 0 14px;">${escapeHtml(header)}</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(recipientName || 'Responsible Person')},</p>
<p style="margin:0 0 14px;">The CAPA <strong>${escapeHtml(capaNumber)}</strong> has been rejected by ${escapeHtml(tier)} <strong>${escapeHtml(rejectedBy || '')}</strong> during the <strong>${escapeHtml(stageName)}</strong> stage.</p>
${details.html}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 6px;color:#dc2626;font-weight:600;">Action Required: Please review the ${escapeHtml(tier)}'s rejection comments above, address all concerns raised, and resubmit the implementation details.</p>
${tierUpper.includes('QA') ? '<p style="margin:0;font-size:12px;color:#64748b;">Note: Since this was rejected at the Final Approval stage, the CAPA will need to go through the full review process again.</p>' : ''}`,
  });

  return { subject, text, html };
}

/* --------------------------------------------------------------------------
   STAGE 4: D4 EFFECTIVENESS & CLOSURE
-------------------------------------------------------------------------- */

/**
 * 13. Complaint moves to D4 -> Sent to Handler (with PDF note) & FRP (SOP Page 20, Step 32.q & 32.r)
 */
export function movedToD4Stage(complaint, { recipientName, frpName, isFrp = false } = {}) {
  const number = complaint.complaintNumber;
  const link = complaintLink(complaint._id);

  const details = detailsBlock([
    ['Complaint Number', number],
    ['Product Name', productName(complaint)],
    ['Batch Number', batchNumber(complaint)],
    ['Type of Failure', complaint.d2?.investigation?.typeOfFailure || '—'],
    ['FRP', frpName || complaint.frp?.name || 'Assigned FRP'],
  ]);

  if (isFrp) {
    // 32.r Sent to FRP
    const subject = `CAPA Implementation Completed for Complaint ${number}`;
    const text = [
      '✓ CAPA Implementation Completed',
      '',
      `Dear ${recipientName || frpName || 'FRP'},`,
      '',
      `We are pleased to inform you that the CAPA (Corrective and Preventive Action) implementation for complaint ${number} has been successfully completed.`,
      '',
      'Complaint Details:',
      details.text,
      '',
      `View Complaint Record: ${link}`,
      '',
      'Next Steps: The complaint is now ready to proceed to the Effectiveness review.',
      'Thank you,',
      '',
      'Best Regards,',
      'Customer Relationship Management Team',
      '',
      AUTO_FOOTNOTE,
    ].join('\n');

    const html = layout({
      title: subject,
      bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#16a34a;margin:0 0 14px;">✓ CAPA Implementation Completed</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(recipientName || frpName || 'FRP')},</p>
<p style="margin:0 0 14px;">We are pleased to inform you that the CAPA (Corrective and Preventive Action) implementation for complaint <strong>${escapeHtml(number)}</strong> has been successfully completed.</p>
<p style="margin:0 0 6px;font-weight:700;color:#1e293b;">Complaint Details:</p>
${details.html}
${button(link, 'View Complaint Record')}
<p style="margin:14px 0 6px;"><strong>Next Steps:</strong> The complaint is now ready to proceed to the Effectiveness review.</p>
<p style="margin:0;">Thank you,</p>`,
    });

    return { subject, text, html };
  }

  // 32.q Sent to Complaint Handler (with attached PDF note)
  const subject = `Complaint ${number} - Moved to D4 Stage`;
  const text = [
    '✓ Complaint Moved to D4 Stage',
    '',
    `Dear ${recipientName || complaint.coordinator?.name || 'Complaint Handler'},`,
    '',
    `The complaint ${number} has now moved to the D4 (Effectiveness Review & Closure) stage.`,
    'Note: Please have a look at the complaint report PDF attached for your reference.',
    '',
    'Complaint Details:',
    details.text,
    '',
    `View Complaint Record: ${link}`,
    '',
    'Please review the complaint and take any further actions if required.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#16a34a;margin:0 0 14px;">✓ Complaint Moved to D4 Stage</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(recipientName || complaint.coordinator?.name || 'Complaint Handler')},</p>
<p style="margin:0 0 8px;">The complaint <strong>${escapeHtml(number)}</strong> has now moved to the <strong>D4 (Effectiveness Review &amp; Closure)</strong> stage.</p>
<p style="margin:0 0 14px;font-size:12px;color:#475569;"><em>Note: Please have a look at the complaint report PDF attached for your reference.</em></p>
<p style="margin:0 0 6px;font-weight:700;color:#1e293b;">Complaint Details:</p>
${details.html}
${button(link, 'View Complaint Record')}
<p style="margin:14px 0 0;">Please review the complaint and take any further actions if required.</p>`,
  });

  return { subject, text, html };
}

/**
 * 14. Effectiveness Responsible Person (ERP) Assigned (SOP Page 22, Step 36.t)
 * Subject: Effectiveness Review Assigned to You - [CAPA Number]
 */
export function erpAssignment(complaint, capa, { erpName, scheduleType, scheduleDetail } = {}) {
  const number = complaint.complaintNumber;
  const capaNumber = capa?.capaNumber || 'CAPA-Record';
  const subject = `Effectiveness Review Assigned to You - ${capaNumber}`;
  const link = capaLink(complaint._id);
  const name = erpName || 'Effectiveness Responsible Person';

  const details = detailsBlock([
    ['CAPA Number', capaNumber],
    ['Complaint Number', number],
    ['Root Cause Category', capa?.rcCategory || '—'],
    ['Root Cause Description', capa?.rcDescription || '—'],
    ['CAPA Category', capa?.category || 'CA'],
    ['CAPA Description', capa?.description || '—'],
    ['Action Implemented', capa?.actionImplemented || '—'],
    ['Current Status', 'Open'],
    ['Schedule Type', scheduleType || 'Timeline'],
    [scheduleType === 'Frequency' ? 'Effectiveness Frequency' : 'Effectiveness Timeline', scheduleDetail || '2 weeks'],
  ]);

  const text = [
    'Effectiveness Review Assignment',
    '',
    `Dear ${name},`,
    '',
    `You have been assigned as the Effectiveness Responsible Person for the following CAPA under complaint ${number}:`,
    '',
    details.text,
    '',
    `View CAPA Record: ${link}`,
    '',
    'Action Required: Please review the effectiveness of the CAPA implementation and update the review status accordingly.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#1e3a8a;margin:0 0 14px;">Effectiveness Review Assignment</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 14px;">You have been assigned as the Effectiveness Responsible Person for the following CAPA under complaint <strong>${escapeHtml(number)}</strong>:</p>
${details.html}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 0;color:#1e293b;font-weight:600;">Action Required: Please review the effectiveness of the CAPA implementation and update the review status accordingly.</p>`,
  });

  return { subject, text, html };
}

/**
 * 15. CAPA Closed -> Sent to Complaint Handler (SOP Page 22 & 23, Step 38.u)
 * Subject: CAPA Completed for Complaint - [number]
 */
export function capaClosedNotice(complaint, capa, { recipientName, frpName, rpName, effectivenessReview, completionDate } = {}) {
  const number = complaint.complaintNumber;
  const capaNumber = capa?.capaNumber || 'CAPA-Record';
  const subject = `CAPA Completed for Complaint - ${number}`;
  const link = capaLink(complaint._id);
  const name = recipientName || complaint.coordinator?.name || 'Complaint Handler';

  const details = detailsBlock([
    ['Complaint Number', number],
    ['CAPA Number', capaNumber],
    ['First Responsible Person', frpName || complaint.frp?.name || '—'],
    ['Responsible Person', rpName || capa?.responsiblePerson?.name || '—'],
    ['Root Cause Category', capa?.rcCategory || '—'],
    ['Root Cause Description', capa?.rcDescription || '—'],
    ['CAPA Category', capa?.category || 'CA'],
    ['CAPA Description', capa?.description || '—'],
    ['Action Implemented', capa?.actionImplemented || '—'],
    ['Effectiveness Review Status', effectivenessReview || 'Approved'],
    ['Completion Date', completionDate || new Date().toISOString().slice(0, 10)],
  ]);

  const text = [
    '✓ CAPA Process Completed',
    '',
    `Dear ${name},`,
    '',
    `All Corrective and Preventive Actions (CAPAs) for complaint ${number} have been successfully completed and closed. The full CAPA lifecycle including implementation, review, and effectiveness verification has been fulfilled.`,
    '',
    details.text,
    '',
    `View CAPA Record: ${link}`,
    '',
    'Status: This CAPA has been fully closed. No further action is required.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#16a34a;margin:0 0 14px;">✓ CAPA Process Completed</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 14px;">All Corrective and Preventive Actions (CAPAs) for complaint <strong>${escapeHtml(number)}</strong> have been successfully completed and closed. The full CAPA lifecycle including implementation, review, and effectiveness verification has been fulfilled.</p>
${details.html}
${button(link, 'View CAPA Record')}
<p style="margin:14px 0 0;font-weight:600;color:#16a34a;">Status: This CAPA has been fully closed. No further action is required.</p>`,
  });

  return { subject, text, html };
}

/**
 * 16. Complaint Fully Closed -> Sent to Requester & Handler (SOP Page 23, Step 39)
 * Subject: Complaint [number] Closed
 */
export function complaintSuccessfullyClosed(complaint, { recipientName, frpName, isHandler = false } = {}) {
  const number = complaint.complaintNumber;
  const subject = `Complaint ${number} Closed`;
  const link = complaintLink(complaint._id);
  const name = recipientName || (isHandler ? complaint.coordinator?.name : complaint.requester?.name) || 'Customer';

  const details = detailsBlock([
    ['Complaint Number', number],
    ['Product Name', productName(complaint)],
    ['Batch Number', batchNumber(complaint)],
    ['Type of Failure', complaint.d2?.investigation?.typeOfFailure || '—'],
    ['FRP', frpName || complaint.frp?.name || 'Assigned FRP'],
  ]);

  const text = [
    '✓ Complaint Successfully Closed',
    '',
    `Dear ${name},`,
    '',
    `We are pleased to inform you that the complaint ${number} has been successfully completed and closed upon completion of the D4 stage.`,
    ...(isHandler ? ['Note: Please find the complaint report PDF attached with this email for your reference.', ''] : ['']),
    'Final Complaint Summary:',
    details.text,
    '',
    `View Complaint Record: ${link}`,
    '',
    'No further action is required for this complaint.',
    'Thank you for your efforts in resolving this issue.',
    '',
    'Best Regards,',
    'Customer Relationship Management Team',
    '',
    AUTO_FOOTNOTE,
  ].join('\n');

  const html = layout({
    title: subject,
    bodyHtml: `<h2 style="font-size:16px;font-weight:700;color:#16a34a;margin:0 0 14px;">✓ Complaint Successfully Closed</h2>
<p style="margin:0 0 12px;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 10px;">We are pleased to inform you that the complaint <strong>${escapeHtml(number)}</strong> has been successfully completed and closed upon completion of the D4 stage.</p>
${isHandler ? '<p style="margin:0 0 14px;font-size:12px;color:#475569;"><em>Note: Please find the complaint report PDF attached with this email for your reference.</em></p>' : ''}
<p style="margin:0 0 6px;font-weight:700;color:#1e293b;">Final Complaint Summary:</p>
${details.html}
${button(link, 'View Complaint Record')}
<p style="margin:14px 0 6px;">No further action is required for this complaint.</p>
<p style="margin:0;">Thank you for your efforts in resolving this issue.</p>`,
  });

  return { subject, text, html };
}

/* --------------------------------------------------------------------------
   Export Master Mapping
-------------------------------------------------------------------------- */
export const TEMPLATES = Object.freeze({
  NEW_COMPLAINT_HANDLER: newComplaintHandler,
  D1_ACKNOWLEDGEMENT: d1Acknowledgement,
  D1_COMPLETION_HANDLER: d1CompletionHandler,
  D2_FRP_ASSIGNED: d2FrpAssigned,
  D2_SLA_EXTENSION: d2SlaExtensionRequest,
  D2_COMPLETED: d2Completed,
  ROOT_CAUSE_APPROVAL_REQUEST: rootCauseApprovalRequest,
  ROOT_CAUSES_APPROVED: rootCausesApprovedNotice,
  D3_APPROVAL_REQUEST: d3ApprovalRequest,
  D3_REJECTED: d3CapaRejected,
  CAPA_IMPLEMENTATION_ASSIGNMENT: capaImplementationAssignment,
  CAPA_REVIEW_REQUIRED: capaReviewRequired,
  CAPA_IMPLEMENTATION_REJECTED: capaImplementationRejected,
  MOVED_TO_D4: movedToD4Stage,
  ERP_ASSIGNMENT: erpAssignment,
  CAPA_CLOSED: capaClosedNotice,
  COMPLAINT_CLOSED: complaintSuccessfullyClosed,
});
