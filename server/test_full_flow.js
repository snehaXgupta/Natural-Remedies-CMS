import mongoose from 'mongoose';
import { createComplaint } from './server/src/services/complaintService.js';
import Notification from './server/src/models/Notification.js';
import User from './server/src/models/User.js';
import Complaint from './server/src/models/Complaint.js';
import CapaRecord from './server/src/models/CapaRecord.js';
import { decideImplementationApproval } from './server/src/services/d4Service.js';
import env from './server/src/config/env.js';

async function runTest() {
  console.log('Connecting to Mongo...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected!');

  const user = await User.findOne({ isActive: true });
  console.log('Using test actor:', user?.name, user?.email);

  // 1. Test complaint creation
  console.log('\n--- 1. Testing Complaint Creation ---');
  const payload = {
    complaintDate: new Date(),
    sbu: 'AHP',
    country: 'India',
    headQuarter: 'Bangalore',
    requester: {
      name: 'Verification Tester',
      email: 'tester@naturalremedies.com',
      mobile: '9876543210'
    },
    customer: {
      name: 'Test Pharmacy'
    },
    reportedProduct: {
      name: 'Kamdhenu Bolus',
      batchNumber: 'BATCH-2026-TEST'
    },
    shortDescription: 'Audit verification test complaint'
  };

  const created = await createComplaint(payload, { actor: user });
  console.log('Complaint created successfully! Number:', created.complaintNumber, 'ID:', created._id);

  // Verify notifications queued for registration
  const notifs = await Notification.find({ complaint: created._id }).lean();
  console.log(`Found ${notifs.length} notifications queued:`);
  for (const n of notifs) {
    console.log(`  - Recipient: ${n.recipient}, Type: ${n.type}, Subject: ${n.subject}`);
  }

  // 2. Test CAPA & D4 notification with PDF report
  console.log('\n--- 2. Testing D4 Transition with PDF attachment ---');
  // Create a mock CAPA record
  const capa = await CapaRecord.create({
    complaint: created._id,
    capaNumber: `${created.complaintNumber}-CAPA-01`,
    actionType: 'Corrective',
    description: 'Test CAPA action',
    actionImplemented: 'Implemented standard verification check',
    forwardForReview: true,
    actionStatus: 'IN_PROGRESS',
    responsiblePerson: user._id
  });

  // Assign FRP to complaint so Case 1 triggers (FRP == RP)
  created.frp = user._id;
  await created.save();

  // Test QA implementation approval which triggers D4 transition
  await decideImplementationApproval(
    capa._id,
    { tier: 'QA', decision: 'APPROVED', comments: 'Verified and approved for D4' },
    { user, permissions: ['capa:approve'] }
  );

  const d4Notifs = await Notification.find({ complaint: created._id, type: 'D4_NOTICE' }).lean();
  console.log(`Found ${d4Notifs.length} D4_NOTICE notifications:`);
  for (const dn of d4Notifs) {
    const hasAtt = dn.attachments && dn.attachments.length > 0;
    console.log(`  - Recipient: ${dn.recipient}, Attachments: ${hasAtt ? dn.attachments[0].filename + ' (' + dn.attachments[0].content.length + ' bytes)' : 'None (clean)'}`);
  }

  // Clean up test complaint and capa
  await CapaRecord.deleteOne({ _id: capa._id });
  await Complaint.deleteOne({ _id: created._id });
  await Notification.deleteMany({ complaint: created._id });
  console.log('\nCleaned up test data.');
  await mongoose.disconnect();
  console.log('Test completed successfully!');
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
