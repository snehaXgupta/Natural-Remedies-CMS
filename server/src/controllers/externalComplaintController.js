import logger from '../config/logger.js';
import { createComplaint } from '../services/complaintService.js';

const VALID_SBUS = [
  'AHP-Avicare',
  'AHP-Omnicare',
  'AHP-Rumicare',
  'HHP',
  'PET',
  'PET-Online',
  'SBP',
];

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
    const email = (data.rasiedByEmail || data.raisedByEmail || '').trim();
    const number = (data.rasiedByNumber || data.raisedByNumber || '').trim();
    const rawName = (data.rasiedByName || data.raisedByName || '').trim();
    const name = rawName || (email ? email.split('@')[0] : 'WhatsApp Customer');

    const sbu = (data.SBU || data.sbu || '').trim();
    const country = (data.country || 'India').trim();
    const headQuarter = (data.complaintHeadQuarter || data.headQuarter || (country === 'India' ? 'India' : country)).trim();
    const origin = (data.origin || 'WhatsApp').trim();
    const shortDesc = (data.shortDescription || '').trim();
    const retailer = (data.distributedRetailerName || data.distributorRetailerName || data.customerName || '').trim();
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
          errorMessage: 'Missing required field: distributedRetailerName.',
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
        type: 'Customer',
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
      'Complaint created via WhatsApp webhook (Salesforce replacement)',
    );

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

