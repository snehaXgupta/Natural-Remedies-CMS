import mongoose from 'mongoose';

export const DEFAULT_SETTINGS = {
  sla: {
    d1TargetHours: 24,
    d2TargetHours: 72,
    d3TargetHours: 360, // 15 days
    d4TargetHours: 1440, // 60 days
    maxExtensionHours: 72,
    warningThresholdPercent: 80,
    businessHoursOnly: true,
    autoEscalateOverdue: true,
  },
  riskMatrix: {
    formula: 'SEVERITY_OCCURRENCE_DETECTION',
    lowRiskMax: 20,
    mediumRiskMax: 60,
    severityLevels: [
      { score: 1, label: 'Minor', description: 'Cosmetic or packaging blemish with no impact on quality.' },
      { score: 2, label: 'Moderate', description: 'Minor defect noticed by customer; usability intact.' },
      { score: 3, label: 'Significant', description: 'Product performance or appearance degraded; direct customer dissatisfaction.' },
      { score: 4, label: 'Critical', description: 'Severe defect; potential batch non-compliance with quality standards.' },
      { score: 5, label: 'Catastrophic', description: 'Safety hazard, regulatory violation, or potential recall trigger.' },
    ],
    occurrenceLevels: [
      { score: 1, label: 'Rare (<0.1%)', description: 'Single isolated incident across all batches.' },
      { score: 2, label: 'Unlikely (0.1–0.5%)', description: 'Infrequent occurrence in isolated lots.' },
      { score: 3, label: 'Moderate (0.5–2%)', description: 'Periodic occurrence across consecutive batches.' },
      { score: 4, label: 'Frequent (2–5%)', description: 'High recurrence rate demanding operational attention.' },
      { score: 5, label: 'Persistent (>5%)', description: 'Systemic production defect observed continually.' },
    ],
    detectionLevels: [
      { score: 1, label: 'Immediate / In-line', description: 'Detected automatically on the packaging/production line.' },
      { score: 2, label: 'Routine QA Inspection', description: 'Consistently caught during standard batch release testing.' },
      { score: 3, label: 'Moderate Detection', description: 'Detectable prior to warehouse dispatch with dedicated audit.' },
      { score: 4, label: 'Low Detection', description: 'Difficult to detect at facility; typically spotted only in transit.' },
      { score: 5, label: 'Undetectable', description: 'Cannot be detected prior to customer/distributor receipt.' },
    ],
  },
  emailTemplates: {
    d1Subject: 'Complaint Acknowledgement for D1 Stage- {{complaintNumber}}',
    d1Greeting: 'Dear {{recipientName}},',
    d1Message: 'Thank you for bringing this matter to our attention. We have received your complaint {{complaintNumber}} and our team is reviewing it. We will update you on the progress shortly.',
    d1Signoff: 'Customer Relationship Management Team\nNatural Remedies Quality Assurance',
    footnote: 'Note: This is an auto-generated email. Please do not reply to this email.',
  },
};

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model('SystemSetting', systemSettingSchema);
