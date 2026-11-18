import path from 'node:path';
import logger from '../config/logger.js';
import { createComplaint } from '../services/complaintService.js';
import { storeSystemAttachments } from '../services/attachmentService.js';
import { Complaint } from '../models/index.js';

const VALID_SBUS = [
  'AHP - Rumicare',
  'AHP – Rumicare',
  'AHP-Rumicare',
  'AHP-Avicare',
  'AHP-Omnicare',
  'HHP',
  'PET',
  'PET-Online',
  'SBP',
];

/**
 * Detect MIME type and extension from buffer magic bytes to ensure
 * attachments pass system validation.
 */
function detectMimeAndExt(buffer, headerMime = '') {
  // 1. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimetype: 'image/jpeg', ext: '.jpg' };
  }
  // 2. PNG: 89 50 4E 47
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mimetype: 'image/png', ext: '.png' };
  }
  // 3. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimetype: 'image/webp', ext: '.webp' };
  }
  // 4. PDF: %PDF (25 50 44 46)
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mimetype: 'application/pdf', ext: '.pdf' };
  }
  // Content-Type header fallbacks
  const cleanHeader = (headerMime || '').split(';')[0].trim().toLowerCase();
  if (cleanHeader === 'image/jpeg' || cleanHeader === 'image/jpg') {
    return { mimetype: 'image/jpeg', ext: '.jpg' };
  }
  if (cleanHeader === 'image/png') {
    return { mimetype: 'image/png', ext: '.png' };
  }
  if (cleanHeader === 'image/webp') {
    return { mimetype: 'image/webp', ext: '.webp' };
  }
  if (cleanHeader === 'application/pdf') {
    return { mimetype: 'application/pdf', ext: '.pdf' };
  }
  // Default fallback to JPEG
  return { mimetype: 'image/jpeg', ext: '.jpg' };
}

/**
 * Downloads or decodes incoming WhatsApp media and stores it as a permanent
 * attachment on the complaint via storeSystemAttachments.
 */
async function processIncomingMedia(complaint, data) {
  const candidates = [
    data.whatsappmedia,
    data.whatsappMedia,
    data.media,
    data.mediaUrl,
    data.mediaUrls,
    data.attachment,
    data.attachments,
    data.file,
    data.files,
    data.image,
    data.imageUrl,
  ];

  const rawList = [];
  for (const item of candidates) {
    if (!item) continue;
    if (Array.isArray(item)) {
      rawList.push(...item);
    } else if (typeof item === 'string') {
      if (item.includes(',') && !item.startsWith('data:')) {
        rawList.push(...item.split(',').map((s) => s.trim()).filter(Boolean));
      } else {
        rawList.push(item.trim());
      }
    } else if (typeof item === 'object') {
      rawList.push(item);
    }
  }

  if (rawList.length === 0) return { stored: 0, rejected: [] };

  const files = [];
  let index = 1;

  for (const item of rawList) {
    try {
      let buffer = null;
      let headerMime = null;
      let originalName = `whatsapp_attachment_${index}`;

      if (typeof item === 'string') {
        if (item.startsWith('http://') || item.startsWith('https://')) {
          // Download directly from public or presigned URL
          const res = await fetch(item, {
            signal: AbortSignal.timeout(20_000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
            },
          });
          if (res.ok) {
            headerMime = res.headers.get('content-type');
            buffer = Buffer.from(await res.arrayBuffer());
            try {
              const urlPath = new URL(item).pathname;
              const base = path.basename(urlPath);
              if (base && base.includes('.')) originalName = base;
            } catch {}
          } else {
            logger.warn({ status: res.status, url: item }, 'Could not download WhatsApp media URL');
          }
        } else if (item.startsWith('data:')) {
          // Data URI base64
          const matches = item.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/s);
          if (matches) {
            headerMime = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            const comma = item.indexOf(',');
            if (comma !== -1) {
              buffer = Buffer.from(item.slice(comma + 1), 'base64');
            }
          }
        } else if (item.length > 50 && /^[A-Za-z0-9+/=\r\n]+$/.test(item.slice(0, 100))) {
          // Raw base64 string
          buffer = Buffer.from(item, 'base64');
        }
      } else if (typeof item === 'object' && item !== null) {
        const url = item.url || item.link || item.mediaUrl;
        const b64 = item.base64 || item.data || item.content;
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
          if (res.ok) {
            headerMime = res.headers.get('content-type');
            buffer = Buffer.from(await res.arrayBuffer());
          }
        } else if (b64) {
          const cleanB64 = typeof b64 === 'string' ? b64.replace(/^data:[^;]+;base64,/, '') : '';
          buffer = Buffer.from(cleanB64, 'base64');
          headerMime = item.mime || item.mimetype || item.contentType;
        }
        if (item.name || item.filename || item.originalName) {
          originalName = item.name || item.filename || item.originalName;
        }
      }

      if (!buffer || buffer.length === 0) continue;

      const detected = detectMimeAndExt(buffer, headerMime);
      if (!path.extname(originalName)) {
        originalName = `${originalName}${detected.ext}`;
      } else {
        const ext = path.extname(originalName).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.xlsx'].includes(ext)) {
          originalName = `${originalName}${detected.ext}`;
        }
      }

      files.push({
        originalname: originalName,
        mimetype: detected.mimetype,
        buffer,
        size: buffer.length,
      });
      index++;
    } catch (itemErr) {
      logger.warn({ err: itemErr }, 'Failed to parse individual WhatsApp media item');
    }
  }

  if (files.length > 0) {
    return await storeSystemAttachments(complaint, files, 'whatsapp');
  }
  return { stored: 0, rejected: [] };
}

/**
 * Capture complaint webhook designed to replace the Salesforce Apex REST endpoint:
 * POST /externalsource1/services/apexrest/api/complaintCapture/Complaint_Management__c
 *
 * Invoked directly from the WhatsApp integration layer (e.g. Fingertip Plus / Meta bot)
 * without requiring authentication headers.
 */
export async function captureComplaintWebhook(req, res) {
  try {
    const data = Array.isArray(req.body) ? req.body[0] : req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json([
        {
          status: 'Failed',
          salesforceId: null,
          objectName: 'Complaint_Management__c',
          jsonDataDebug: null,
          hasError: true,
          ExternalId: null,
          errorMessage: 'Invalid request payload: expected a JSON object.',
        },
      ]);
    }

    // Support both vendor spelling "rasied..." and standard "raised..."
    const email = (data.raisedByEmail || data.rasiedByEmail || '').trim();
    const number = (data.raisedByNumber || data.rasiedByNumber || '').trim();
    const rawName = (data.raisedByName || data.rasiedByName || '').trim();
    const name = rawName || (email ? email.split('@')[0] : 'WhatsApp Customer');

    const customerType = (data.customerType || '').trim();
    const reporterType = ['Customer', 'Retailer', 'Distributor'].includes(customerType) ? customerType : 'Customer';

    const sbu = (data.SBU || data.sbu || '').trim();
    const country = (data.country || 'India').trim();
    const headQuarter = (data.complaintHeadQuarter || data.headQuarter || (country === 'India' ? 'India' : country)).trim();
    const origin = (data.origin || 'WhatsApp').trim();
    const shortDesc = (data.shortDescription || '').trim();
    const retailer = (data.customerName || data.distributedRetailerName || data.distributorRetailerName || '').trim();
    const productName = (data.productName || '').trim();
    const batchNumber = (data.batchNumber || '').trim();

    // 1. SBU Validation (matches Salesforce Apex error message exactly)
    if (!sbu || !VALID_SBUS.includes(sbu)) {
      return res.status(400).json([
        {
          status: 'Failed',
          salesforceId: null,
          objectName: 'Complaint_Management__c',
          jsonDataDebug: null,
          hasError: true,
          ExternalId: null,
          errorMessage: `Invalid SBU ${sbu || 'null'} value. Valid values are: {${VALID_SBUS.join(', ')}}`,
        },
      ]);
    }

    // 2. Required fields validation
    if (!shortDesc) {
      return res.status(400).json([
        {
          status: 'Failed',
          salesforceId: null,
          objectName: 'Complaint_Management__c',
          jsonDataDebug: null,
          hasError: true,
          ExternalId: null,
          errorMessage: 'Missing required field: shortDescription.',
        },
      ]);
    }

    if (!retailer) {
      return res.status(400).json([
        {
          status: 'Failed',
          salesforceId: null,
          objectName: 'Complaint_Management__c',
          jsonDataDebug: null,
          hasError: true,
          ExternalId: null,
          errorMessage: 'Missing required field: customerName or distributedRetailerName.',
        },
      ]);
    }

    if (!productName) {
      return res.status(400).json([
        {
          status: 'Failed',
          salesforceId: null,
          objectName: 'Complaint_Management__c',
          jsonDataDebug: null,
          hasError: true,
          ExternalId: null,
          errorMessage: 'Missing required field: productName.',
        },
      ]);
    }

    // Build the complaint payload for createComplaint
    const complaintInput = {
      complaintDate: new Date(),
      origin,
      requester: {
        name: name.slice(0, 100),
        email: email.slice(0, 200) || 'whatsapp@naturalremedies.com',
        mobile: number.slice(0, 20) || 'N/A',
        type: reporterType,
      },
      sbu,
      country,
      headQuarter,
      shortDescription: shortDesc.slice(0, 500),
      customer: {
        name: retailer.slice(0, 200),
      },
      reportedProduct: {
        name: productName.slice(0, 200),
        batchNumber: batchNumber.slice(0, 60),
      },
    };

    const context = {
      ip: req.ip,
      userAgent: req.get('user-agent') || 'WhatsApp-Integration',
      source: 'WhatsApp Webhook',
    };

    const created = await createComplaint(complaintInput, {
      actor: null,
      origin: 'WhatsApp',
      context,
    });

    logger.info(
      { complaintId: created._id, complaintNumber: created.complaintNumber, sbu, origin },
      'Complaint created via WhatsApp webhook (Salesforce replacement)'
    );

    // Download/decode & attach media if present
    try {
      const mediaResult = await processIncomingMedia(created, data);
      if (mediaResult.stored > 0) {
        logger.info(
          { complaintId: created._id, storedCount: mediaResult.stored },
          'Successfully attached WhatsApp media to complaint'
        );
      }
    } catch (mediaErr) {
      logger.error({ err: mediaErr, complaintId: created._id }, 'Error attaching WhatsApp media');
    }

    const debugString = `Rasied By Name >> ${rawName || null}, Rasied By Email >> ${email || null}, Rasied By Number >> ${number || null}, SUBU >> ${sbu}, Origin >> ${origin}, Short Description >> ${shortDesc}, Distributed Retailer Name >> ${retailer}, Product Name >> ${productName}, Batch Number >> ${batchNumber || null}, Complaint Head Quarter >> ${headQuarter}, Country >> ${country}, ObjectName >> Complaint_Management__c`;

    return res.status(200).json([
      {
        status: 'Data Captured Successfully!',
        salesforceId: created._id.toString(),
        complaintNumber: created.complaintNumber,
        objectName: 'Complaint_Management__c',
        jsonDataDebug: debugString,
        hasError: false,
        ExternalId: created.complaintNumber,
        errorMessage: null,
      },
    ]);
  } catch (err) {
    logger.error({ err }, 'Error processing WhatsApp complaint webhook');
    return res.status(500).json([
      {
        status: 'Failed',
        salesforceId: null,
        objectName: 'Complaint_Management__c',
        jsonDataDebug: null,
        hasError: true,
        ExternalId: null,
        errorMessage: err.message || 'Internal server error while capturing complaint.',
      },
    ]);
  }
}

/**
 * Standalone media sync webhook to support vendor middleware syncing media after complaint capture
 * POST /api/media-sync
 */
export async function syncMediaWebhook(req, res) {
  try {
    const data = Array.isArray(req.body) ? req.body[0] : req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, errorMessage: 'Invalid request payload' });
    }

    const complaintRef = data.complaintNumber || data.ExternalId || data.salesforceId || data.complaintId || data.id;
    let complaint = null;

    if (complaintRef) {
      if (/^CMP-\d{4}-\d{4}$/.test(complaintRef)) {
        complaint = await Complaint.findOne({ complaintNumber: complaintRef });
      } else if (/^[0-9a-fA-F]{24}$/.test(complaintRef)) {
        complaint = await Complaint.findById(complaintRef);
      }
    }

    // Fallback: If no ref provided or not found, find the most recent WhatsApp complaint created in the last 15 minutes
    if (!complaint) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      complaint = await Complaint.findOne({ origin: 'WhatsApp', createdAt: { $gte: fifteenMinutesAgo } }).sort({ createdAt: -1 });
    }

    if (!complaint) {
      return res.status(404).json({ success: false, errorMessage: 'Complaint not found to attach media' });
    }

    const result = await processIncomingMedia(complaint, data);
    return res.status(200).json({
      success: true,
      status: 'Media Synced Successfully',
      complaintNumber: complaint.complaintNumber,
      stored: result.stored,
      rejected: result.rejected,
    });
  } catch (err) {
    logger.error({ err }, 'Error in syncMediaWebhook');
    return res.status(500).json({ success: false, errorMessage: err.message });
  }
}
