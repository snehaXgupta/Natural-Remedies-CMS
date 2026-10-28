import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Complaint from '../src/models/Complaint.js';
import RootCauseAnalysis from '../src/models/RootCauseAnalysis.js';
import RootCause from '../src/models/RootCause.js';
import FishboneCause from '../src/models/FishboneCause.js';
import CapaRecord from '../src/models/CapaRecord.js';
import ComplaintAssignment from '../src/models/ComplaintAssignment.js';
import ComplaintStatusHistory from '../src/models/ComplaintStatusHistory.js';
import User from '../src/models/User.js';

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sfa_cms';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Find the last complaint or AHP-26-10-006
  let complaint = await Complaint.findOne({ complaintNumber: 'AHP-26-10-006' });
  if (!complaint) {
    complaint = await Complaint.findOne().sort({ createdAt: -1 });
  }

  if (!complaint) {
    console.error('No complaint found!');
    process.exit(1);
  }

  console.log(`Found complaint: ${complaint.complaintNumber} (ID: ${complaint._id}), current stage: ${complaint.stage}, status: ${complaint.status}`);

  // Find or create admin/approver user
  let approver = await User.findOne({ email: 'admin@naturalremedies.com' });
  if (!approver) {
    approver = await User.findOne();
  }

  // 1. Ensure Reviewer assignment exists
  await ComplaintAssignment.findOneAndUpdate(
    { complaint: complaint._id, role: 'REVIEWER' },
    {
      complaint: complaint._id,
      user: approver._id,
      role: 'REVIEWER',
      assignedBy: approver._id,
      assignedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // 2. Setup RootCauseAnalysis with methods ['WHY_WHY', 'FISHBONE'] and status APPROVED
  let rca = await RootCauseAnalysis.findOne({ complaint: complaint._id });
  if (!rca) {
    rca = new RootCauseAnalysis({
      complaint: complaint._id,
      methods: ['WHY_WHY', 'FISHBONE'],
      problemStatement: complaint.description || 'Customer reported potency variation in batch AHP-26-10-006.',
      whyWhy: [
        { level: 1, why: 'Why did the potency deviate?', because: 'Active ingredient extraction temperature exceeded setpoint by 4°C during cycle 3.' },
        { level: 2, why: 'Why was temperature above setpoint?', because: 'RTD sensor calibrator drift caused PID controller to misread vessel temperature.' },
        { level: 3, why: 'Why did calibrator drift go unnoticed?', because: 'Scheduled quarterly sensor recalibration was overdue by 12 days.' },
        { level: 4, why: 'Why was calibration overdue?', because: 'Automated calibration work order notification failed due to equipment code mismatch.' },
        { level: 5, why: 'Why was code mismatched?', because: 'Maintenance management system asset master had duplicate entry after line overhaul.' },
      ],
      status: 'APPROVED',
      submissionCount: 1,
      lastSubmittedAt: new Date(),
      lastSubmittedBy: approver._id,
      reviewedAt: new Date(),
      reviewedBy: approver._id,
      updatedBy: approver._id,
    });
    await rca.save();
  } else {
    rca.methods = ['WHY_WHY', 'FISHBONE'];
    rca.status = 'APPROVED';
    rca.reviewedAt = new Date();
    rca.reviewedBy = approver._id;
    if (!rca.whyWhy || rca.whyWhy.length === 0) {
      rca.whyWhy = [
        { level: 1, why: 'Why did the potency deviate?', because: 'Extraction temperature exceeded setpoint by 4°C.' },
        { level: 2, why: 'Why did temperature exceed setpoint?', because: 'RTD sensor calibrator drift.' },
        { level: 3, why: 'Why was drift unnoticed?', because: 'Quarterly sensor recalibration was overdue.' },
        { level: 4, why: 'Why was calibration overdue?', because: 'Maintenance notification failed due to equipment code mismatch.' },
        { level: 5, why: 'Why code mismatch?', because: 'Asset master duplicate entry.' },
      ];
    }
    await rca.save();
  }
  console.log(`RCA setup & approved: ${rca._id}`);

  // 3. Fishbone Causes
  const existingFb = await FishboneCause.findOne({ complaint: complaint._id });
  let machineCause = existingFb;
  if (!existingFb) {
    machineCause = await FishboneCause.create({
      complaint: complaint._id,
      analysis: rca._id,
      category: 'Machine',
      text: 'RTD temperature sensor calibrator drift in Reactor Vessel 2',
      order: 1,
      createdBy: approver._id,
    });
    await FishboneCause.create({
      complaint: complaint._id,
      analysis: rca._id,
      category: 'Method',
      text: 'Calibration verification SOP lacked secondary thermocouple cross-check',
      order: 2,
      createdBy: approver._id,
    });
    await FishboneCause.create({
      complaint: complaint._id,
      analysis: rca._id,
      category: 'Measurement',
      text: 'Calibration tolerance window ±1.5°C was too wide for sensitive herbal extract',
      order: 3,
      createdBy: approver._id,
    });
  }

  // 4. RootCause
  let rootCause = await RootCause.findOne({ complaint: complaint._id });
  if (!rootCause) {
    rootCause = await RootCause.create({
      complaint: complaint._id,
      analysis: rca._id,
      category: 'Machine',
      description: 'RTD sensor drift in Reactor Vessel 2 led to overheating of herbal extract during Phase 3 extraction.',
      sourceCause: machineCause ? machineCause._id : undefined,
      createdBy: approver._id,
    });
  }
  console.log(`RootCause ready: ${rootCause._id}`);

  // 5. CapaRecord
  let capa = await CapaRecord.findOne({ complaint: complaint._id });
  if (!capa) {
    const capaNumber = `CAPA-${complaint.complaintNumber || 'AHP-26-10-006'}-01`;
    capa = await CapaRecord.create({
      capaNumber,
      complaint: complaint._id,
      rootCause: rootCause._id,
      capaRequired: true,
      category: 'CA',
      description: 'Recalibrate and replace faulty RTD sensor; implement dual-sensor verification in extraction vessels.',
      rcCategory: 'Machine',
      rcDescription: rootCause.description,
      correctiveAction: 'Replaced and recalibrated RTD Sensor #RV2-RTD-04; validated temperature profile across 3 test batches.',
      preventiveAction: 'Updated calibration SOP-QA-304 to require secondary thermocouple cross-check and automated CMMS calibration sync.',
      responsiblePerson: approver._id,
      targetDate: new Date(Date.now() + 14 * 86400000),
      frpManagerApproval: { status: 'APPROVED', comments: 'Root cause and corrective actions verified and approved.', approver: approver._id, date: new Date() },
      handlerApproval: { status: 'APPROVED', comments: 'Investigation complete, approved for implementation.', approver: approver._id, date: new Date() },
      actionImplemented: 'New dual-probe RTD sensor installed and calibrated. SOP-QA-304 revised and training conducted.',
      forwardForReview: true,
      frpImplementationApproval: { status: 'APPROVED', comments: 'Implementation verified.', approver: approver._id, date: new Date() },
      handlerImplementationApproval: { status: 'APPROVED', comments: 'All actions completed satisfactorily.', approver: approver._id, date: new Date() },
      qaImplementationApproval: { status: 'APPROVED', comments: 'Quality assurance sign-off complete.', approver: approver._id, date: new Date() },
      actionStatus: 'COMPLETED',
      reviewStatus: 'REVIEWED',
      approvalStatus: 'APPROVED',
      createdBy: approver._id,
    });
  } else {
    capa.frpManagerApproval = { status: 'APPROVED', comments: 'Approved', approver: approver._id, date: new Date() };
    capa.handlerApproval = { status: 'APPROVED', comments: 'Approved', approver: approver._id, date: new Date() };
    capa.actionStatus = 'COMPLETED';
    capa.approvalStatus = 'APPROVED';
    await capa.save();
  }
  console.log(`CAPA ready: ${capa.capaNumber}`);

  // 6. Update Complaint status to D3_APPROVED and stage to D3
  const oldStatus = complaint.status;
  complaint.stage = 'D3';
  complaint.status = 'D3_APPROVED';
  complaint.targetCompletionDate = new Date(Date.now() + 7 * 86400000);
  await complaint.save();

  // 7. Add Status History
  await ComplaintStatusHistory.create({
    complaint: complaint._id,
    fromStatus: oldStatus,
    toStatus: 'D3_APPROVED',
    actor: approver._id,
    at: new Date(),
    remarks: 'Root cause analysis and CAPA approved by reviewer/approver.',
  });

  console.log(`SUCCESS! Complaint ${complaint.complaintNumber} marked as D3_APPROVED in stage D3.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
