import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import {
  User,
  Complaint,
  ComplaintAssignment,
  ComplaintStatusHistory,
  ComplaintStageRecord,
  RootCauseAnalysis,
  FishboneCause,
  RootCause,
  CapaRecord,
  ComplaintAttachment,
  Notification,
  InAppNotification,
  AuditLog,
  WhatsappMessage,
  WhatsappSession,
  Counter,
} from '../models/index.js';
import fs from 'fs';

async function clean() {
  await connectDatabase();
  console.log('Connected to MongoDB.');

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@naturalremedies.com').toLowerCase();

  // 1. Delete all users except admin@naturalremedies.com
  const userResult = await User.deleteMany({ email: { $ne: adminEmail } });
  console.log(`Deleted ${userResult.deletedCount} non-admin users.`);

  // Reset admin manager reference if any
  await User.updateOne({ email: adminEmail }, { $unset: { manager: 1 } });
  console.log(`Preserved admin user: ${adminEmail}`);

  // 2. Delete all complaint data
  const complaints = await Complaint.deleteMany({});
  const assignments = await ComplaintAssignment.deleteMany({});
  const history = await ComplaintStatusHistory.deleteMany({});
  const stageRecords = await ComplaintStageRecord.deleteMany({});
  const rca = await RootCauseAnalysis.deleteMany({});
  const fishbone = await FishboneCause.deleteMany({});
  const rootCauses = await RootCause.deleteMany({});
  const capas = await CapaRecord.deleteMany({});
  const attachments = await ComplaintAttachment.deleteMany({});

  console.log(`Deleted ${complaints.deletedCount} complaints.`);
  console.log(`Deleted ${assignments.deletedCount} assignments.`);
  console.log(`Deleted ${history.deletedCount} status histories.`);
  console.log(`Deleted ${stageRecords.deletedCount} stage records.`);
  console.log(`Deleted ${rca.deletedCount} RCA records.`);
  console.log(`Deleted ${fishbone.deletedCount} fishbone causes.`);
  console.log(`Deleted ${rootCauses.deletedCount} root causes.`);
  console.log(`Deleted ${capas.deletedCount} CAPA records.`);
  console.log(`Deleted ${attachments.deletedCount} attachment records.`);

  // 3. Delete notifications & outbox
  const notifs = await Notification.deleteMany({});
  const inApp = await InAppNotification.deleteMany({});
  console.log(`Deleted ${notifs.deletedCount} notifications.`);
  console.log(`Deleted ${inApp.deletedCount} in-app notifications.`);

  // 4. Delete audit logs
  const audits = await AuditLog.deleteMany({});
  console.log(`Deleted ${audits.deletedCount} audit logs.`);

  // 5. Delete WhatsApp messages & sessions
  const waMsgs = await WhatsappMessage.deleteMany({});
  const waSessions = await WhatsappSession.deleteMany({});
  console.log(`Deleted ${waMsgs.deletedCount} WhatsApp messages.`);
  console.log(`Deleted ${waSessions.deletedCount} WhatsApp sessions.`);

  // 6. Reset Counters
  const counters = await Counter.deleteMany({});
  console.log(`Reset ${counters.deletedCount} counter sequences.`);

  // 7. Clean local storage directory
  const storageDir = path.resolve(__dirname, '../../storage/complaints');
  if (fs.existsSync(storageDir)) {
    fs.rmSync(storageDir, { recursive: true, force: true });
    fs.mkdirSync(storageDir, { recursive: true });
    console.log(`Cleared local storage directory: ${storageDir}`);
  }

  // 8. Clean mail-outbox directory
  const outboxDir = path.resolve(__dirname, '../../mail-outbox');
  if (fs.existsSync(outboxDir)) {
    const files = fs.readdirSync(outboxDir);
    for (const f of files) {
      if (f.endsWith('.eml')) {
        fs.unlinkSync(path.join(outboxDir, f));
      }
    }
    console.log(`Deleted ${files.length} .eml files from mail-outbox.`);
  }

  await disconnectDatabase();
  console.log('Database cleanup completed successfully.');
}

clean().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
