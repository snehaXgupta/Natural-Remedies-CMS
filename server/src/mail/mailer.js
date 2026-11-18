import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import env from '../config/env.js';

/**
 * Every mail driver implements send({ to, subject, text, html }) and returns
 * { messageId }. It throws on failure; the notification service decides
 * whether to retry.
 */

/** Development: write each message as a standard .eml file. */
function fileDriver(dir) {
  const stream = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  return {
    name: 'file',
    async send(msg) {
      const info = await stream.sendMail({ from: env.MAIL_FROM, ...msg });
      await fs.mkdir(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTo = String(msg.to).replace(/[^a-z0-9@._-]/gi, '_');
      await fs.writeFile(path.join(dir, `${stamp}_${safeTo}.eml`), info.message);
      return { messageId: info.messageId };
    },
  };
}

/** Production: the company's SMTP relay with automatic port 587 / 465 fallback. */
function smtpDriver() {
  const isExplicit465 = Number(env.SMTP_PORT) === 465 || env.SMTP_SECURE === 'true' || env.SMTP_SECURE === true;
  // Gmail on cloud platforms (e.g. Render) blocks/times out on port 587 STARTTLS,
  // whereas port 465 SSL is direct, fast, and works reliably.
  const isGmail = (env.SMTP_HOST || '').toLowerCase().includes('gmail');
  const prefer465 = isExplicit465 || isGmail;

  const createTransport = (port, secure) =>
    nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 8_000,
      socketTimeout: 20_000,
    });

  const primaryPort = prefer465 ? 465 : (Number(env.SMTP_PORT) || 587);
  const primarySecure = prefer465 ? true : isExplicit465;
  const fallbackPort = prefer465 ? 587 : 465;
  const fallbackSecure = !primarySecure;

  const primary = createTransport(primaryPort, primarySecure);
  const fallback = createTransport(fallbackPort, fallbackSecure);

  return {
    name: 'smtp',
    async send(msg) {
      try {
        const info = await primary.sendMail({ from: env.MAIL_FROM, ...msg });
        if (info.rejected?.length) throw new Error(`Rejected by mail server: ${info.rejected.join(', ')}`);
        return { messageId: info.messageId };
      } catch (err) {
        // If connection timeout or refused on primary port, automatically fallback to alternative port
        const isConnErr = err.message && (
          err.message.includes('timeout') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes('ESOCKET') ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNREFUSED'
        );
        if (isConnErr) {
          console.warn(`[Mailer] Primary SMTP transport (port ${primaryPort}) failed (${err.message}), trying fallback port ${fallbackPort}...`);
          const fallbackInfo = await fallback.sendMail({ from: env.MAIL_FROM, ...msg });
          if (fallbackInfo.rejected?.length) throw new Error(`Rejected by fallback mail server: ${fallbackInfo.rejected.join(', ')}`);
          return { messageId: fallbackInfo.messageId };
        }
        throw err;
      }
    },
  };
}

let driver;

export function mailer() {
  if (!driver) driver = env.MAIL_DRIVER === 'smtp' ? smtpDriver() : fileDriver(env.MAIL_OUTBOX_DIR);
  return driver;
}

/** Tests and scripts can swap the driver. */
export function setMailer(next) {
  driver = next;
}

/**
 * In-memory driver for tests. `failNext(n, message)` makes the next n sends
 * throw, to exercise the retry logic.
 */
export function memoryMailer() {
  const sent = [];
  let failures = 0;
  let failMessage = 'Simulated SMTP failure';
  return {
    name: 'memory',
    sent,
    failNext(n = 1, message = failMessage) {
      failures = n;
      failMessage = message;
    },
    async send(msg) {
      if (failures > 0) {
        failures -= 1;
        throw new Error(failMessage);
      }
      const messageId = `<test-${sent.length + 1}@sfa-cms.test>`;
      sent.push({ ...msg, messageId });
      return { messageId };
    },
  };
}
