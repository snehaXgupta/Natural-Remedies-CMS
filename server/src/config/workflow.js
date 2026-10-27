
export const STAGES = Object.freeze({
  D1: 'D1',
  D2: 'D2',
  D3: 'D3',
  D4: 'D4',
  CLOSED: 'CLOSED',
});

export const STATUSES = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  D1_ACK_PENDING: 'D1_ACK_PENDING',
  D1_ACKNOWLEDGED: 'D1_ACKNOWLEDGED',
  D2_IN_PROGRESS: 'D2_IN_PROGRESS',
  D2_COMPLETED: 'D2_COMPLETED',
  D3_IN_PROGRESS: 'D3_IN_PROGRESS',
  D3_PENDING_APPROVAL: 'D3_PENDING_APPROVAL',
  D3_REWORK: 'D3_REWORK',
  D3_APPROVED: 'D3_APPROVED',
  D4_IN_PROGRESS: 'D4_IN_PROGRESS',
  CLOSED: 'CLOSED',
});

/** Which stage each status belongs to; used for listing and filtering. */
export const STATUS_STAGE = Object.freeze({
  SUBMITTED: 'D1',
  D1_ACK_PENDING: 'D1',
  D1_ACKNOWLEDGED: 'D1',
  D2_IN_PROGRESS: 'D2',
  D2_COMPLETED: 'D2',
  D3_IN_PROGRESS: 'D3',
  D3_PENDING_APPROVAL: 'D3',
  D3_REWORK: 'D3',
  D3_APPROVED: 'D3',
  D4_IN_PROGRESS: 'D4',
  CLOSED: 'CLOSED',
});

export const STATUS_LABELS = Object.freeze({
  SUBMITTED: 'Submitted',
  D1_ACK_PENDING: 'Acknowledgement pending',
  D1_ACKNOWLEDGED: 'Acknowledged',
  D2_IN_PROGRESS: 'Investigation and assignment',
  D2_COMPLETED: 'D2 completed',
  D3_IN_PROGRESS: 'Analysis in progress',
  D3_PENDING_APPROVAL: 'Pending approval',
  D3_REWORK: 'Rework required',
  D3_APPROVED: 'D3 approved',
  D4_IN_PROGRESS: 'D4 in progress',
  CLOSED: 'Closed',
});

export const ORIGINS = Object.freeze(['WhatsApp', 'Web', 'Email', 'Phone', 'Call']);
export const REPORTER_TYPES = Object.freeze(['Customer', 'Retailer', 'Distributor']);
