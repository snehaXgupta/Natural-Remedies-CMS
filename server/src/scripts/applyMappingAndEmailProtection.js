import fs from 'fs';

const normalize = (t) => t.replace(/\r\n/g, '\n');
const toCRLF = (t) => t.replace(/\n/g, '\r\n');

// 1. Update server/src/services/complaintService.js
let compService = fs.readFileSync('server/src/services/complaintService.js', 'utf8');

const compTarget = `    // Resolve Complaint Handler / Universal Coordinator (Sneha or admin)
    const adminUser = await User.findOne({ email: 'admin@naturalremedies.com', isActive: true }).session(session).lean();
    let handler = null;
    if (input.coordinator) {
      handler = await User.findById(input.coordinator).session(session).lean();
    }
    if (!handler) {
      handler = adminUser;
    }
    if (!handler) {
      handler = await User.findOne({ roles: 'quality_coordinator', isActive: true }).session(session).lean();
    }`;

const compReplacement = `    // Resolve Complaint Handler via Database Mapping (Pooja)
    const adminUser = await User.findOne({ email: 'admin@naturalremedies.com', isActive: true }).session(session).lean();
    let handler = null;
    if (input.coordinator) {
      handler = await User.findById(input.coordinator).session(session).lean();
    }
    if (!handler) {
      // Prioritize database-mapped Complaint Handler: Pooja
      handler = await User.findOne({ name: /Pooja/i, isActive: true }).session(session).lean();
    }
    if (!handler) {
      handler = await User.findOne({ roles: 'quality_coordinator', isActive: true }).session(session).lean();
    }
    if (!handler) {
      handler = adminUser;
    }`;

if (normalize(compService).includes(normalize(compTarget))) {
  compService = compService.replace(
    compService.includes('\r\n') ? toCRLF(compTarget) : compTarget,
    compService.includes('\r\n') ? toCRLF(compReplacement) : compReplacement
  );
  fs.writeFileSync('server/src/services/complaintService.js', compService, 'utf8');
  console.log('Updated complaintService.js: Database mapping for Complaint Handler -> Pooja');
} else {
  console.error('compTarget not found in complaintService.js');
}

// 2. Update server/src/services/notificationService.js
let notifService = fs.readFileSync('server/src/services/notificationService.js', 'utf8');

const enqueueTarget = `export async function enqueue({ type, channel = 'email', complaint, recipient, recipientUser, cc, bcc, attachments, dedupeKey, message, session }) {
  if (!recipient) throw new Error('Notification recipient is required');
  const existing = await Notification.findOne({ dedupeKey }).session(session ?? null);
  if (existing) return { notification: existing, created: false };`;

const enqueueReplacement = `export async function enqueue({ type, channel = 'email', complaint, recipient, recipientUser, cc, bcc, attachments, dedupeKey, message, session }) {
  if (!recipient) throw new Error('Notification recipient is required');

  // Prevent repeated failures: validate recipient email format and reject fake/dummy domains upfront
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const DUMMY_DOMAINS = ['example.com', 'example.test', 'test.com', 'dummy.com', 'localhost'];

  if (channel === 'email') {
    const email = String(recipient || '').trim().toLowerCase();
    const domain = email.split('@')[1] || '';
    if (!EMAIL_REGEX.test(email) || DUMMY_DOMAINS.includes(domain)) {
      logger.warn({ recipient, type }, 'Notification blocked: invalid or unroutable email recipient');
      return { notification: null, created: false };
    }
  }

  const existing = await Notification.findOne({ dedupeKey }).session(session ?? null);
  if (existing) return { notification: existing, created: false };`;

const sendOneTarget = `  } catch (err) {
    const reason = String(err?.message || err).slice(0, 2000);
    const final = n.attempts >= env.NOTIFY_MAX_ATTEMPTS;
    await Notification.updateOne(
      { _id: n._id },
      {
        $set: {
          status: final ? 'FAILED' : 'QUEUED',
          lastError: reason,
          lockedUntil: null,
          nextAttemptAt: final ? n.nextAttemptAt : new Date(Date.now() + backoff(n.attempts)),
        },
      },
    );`;

const sendOneReplacement = `  } catch (err) {
    const reason = String(err?.message || err).slice(0, 2000);
    const code = err?.responseCode || err?.code;

    // Non-retryable permanent failures:
    // 1. SMTP 5xx (550 Mailbox not found, 553 Invalid recipient, 501 Syntax error, 554 Transaction failed)
    // 2. Nodemailer EENVELOPE / ENOTFOUND errors
    // 3. String patterns matching invalid mailbox or user unknown
    const isPermanent =
      (typeof code === 'number' && code >= 500 && code < 600) ||
      code === 'EENVELOPE' ||
      /5\\d{2}|invalid|mailbox|recipient|user unknown|not found|syntax|rejected|denied|domain|unreachable/i.test(reason);

    const final = isPermanent || n.attempts >= env.NOTIFY_MAX_ATTEMPTS;
    await Notification.updateOne(
      { _id: n._id },
      {
        $set: {
          status: final ? 'FAILED' : 'QUEUED',
          lastError: isPermanent ? \`Permanent error (no retries): \${reason}\` : reason,
          lockedUntil: final ? new Date(Date.now() + 365 * 24 * 3600 * 1000) : null,
          nextAttemptAt: final ? n.nextAttemptAt : new Date(Date.now() + backoff(n.attempts)),
        },
      },
    );`;

if (normalize(notifService).includes(normalize(enqueueTarget))) {
  notifService = notifService.replace(
    notifService.includes('\r\n') ? toCRLF(enqueueTarget) : enqueueTarget,
    notifService.includes('\r\n') ? toCRLF(enqueueReplacement) : enqueueReplacement
  );
  console.log('Updated notificationService.js: enqueue validation for invalid emails');
} else {
  console.error('enqueueTarget not found in notificationService.js');
}

if (normalize(notifService).includes(normalize(sendOneTarget))) {
  notifService = notifService.replace(
    notifService.includes('\r\n') ? toCRLF(sendOneTarget) : sendOneTarget,
    notifService.includes('\r\n') ? toCRLF(sendOneReplacement) : sendOneReplacement
  );
  console.log('Updated notificationService.js: non-retryable permanent error handling');
} else {
  console.error('sendOneTarget not found in notificationService.js');
}

fs.writeFileSync('server/src/services/notificationService.js', notifService, 'utf8');

// 3. Update client/src/pages/complaints/AcknowledgeModal.jsx
let ackModal = fs.readFileSync('client/src/pages/complaints/AcknowledgeModal.jsx', 'utf8');
const ackTarget = `              {selectedCoordinator?.name || preview?.coordinatorName || complaint.coordinator?.name || 'Sneha (Quality Coordinator)'}
              <span className="ml-1 text-slate-500 font-normal text-xs">
                <{coordEmail || preview?.coordinatorTo || complaint.coordinator?.email || 'sneha@naturalremedies.com'}>
              </span>`;

const ackReplacement = `              {selectedCoordinator?.name || preview?.coordinatorName || complaint.coordinator?.name || 'Pooja (Quality Coordinator)'}
              <span className="ml-1 text-slate-500 font-normal text-xs">
                <{coordEmail || preview?.coordinatorTo || complaint.coordinator?.email || 'pooja@naturalremedies.com'}>
              </span>`;

if (normalize(ackModal).includes(normalize(ackTarget))) {
  ackModal = ackModal.replace(
    ackModal.includes('\r\n') ? toCRLF(ackTarget) : ackTarget,
    ackModal.includes('\r\n') ? toCRLF(ackReplacement) : ackReplacement
  );
  fs.writeFileSync('client/src/pages/complaints/AcknowledgeModal.jsx', ackModal, 'utf8');
  console.log('Updated AcknowledgeModal.jsx: Coordinator display -> Pooja');
} else {
  console.error('ackTarget not found in AcknowledgeModal.jsx');
}

