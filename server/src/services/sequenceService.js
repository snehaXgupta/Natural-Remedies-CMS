import { Counter } from '../models/index.js';

/**
 * Atomically increment and return the next value for a named sequence.
 */
export async function nextSequence(name, session) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', session },
  );
  return doc.seq;
}

/**
 * Natural Remedies complaint number format: AHP-YY-M-NNN
 * e.g.  AHP-26-10-001  (prefix AHP, year 2026 → 26, month 10, sequence 001)
 *
 * The sequence resets every calendar month (IST). This exactly matches the
 * format seen in the process PDF (AHP-26-3-169, HHP-26-3-161, etc.).
 *
 * The prefix can be overridden via COMPLAINT_NUMBER_PREFIX env variable to
 * support multiple SBU prefixes (AHP, HHP, …) if needed in the future.
 */
export async function nextComplaintNumber(date = new Date(), session) {
  const ist = new Intl.DateTimeFormat('en-IN', {
    year: '2-digit',
    month: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).formatToParts(date);

  const yy = ist.find((p) => p.type === 'year').value;   // "26"
  const mm = ist.find((p) => p.type === 'month').value;  // "10" (no leading zero)

  const prefix = process.env.COMPLAINT_NUMBER_PREFIX || 'AHP';
  const seq = await nextSequence(`complaint:${prefix}:${yy}:${mm}`, session);
  return `${prefix}-${yy}-${mm}-${String(seq).padStart(3, '0')}`;
}

/** CAPA numbers follow their complaint: AHP-26-10-001-CAPA-01. */
export async function nextCapaNumber(complaintNumber, session) {
  const seq = await nextSequence(`capa:${complaintNumber}`, session);
  return `${complaintNumber}-CAPA-${String(seq).padStart(2, '0')}`;
}
