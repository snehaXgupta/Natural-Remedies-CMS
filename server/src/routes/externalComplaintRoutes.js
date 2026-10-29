import { Router } from 'express';
import { webhookLimiter } from '../middleware/rateLimits.js';
import { captureComplaintWebhook } from '../controllers/externalComplaintController.js';

const router = Router();

// 1. Exact Salesforce Apex REST webhook URL path (allows pointing the WhatsApp bot to our domain with zero path modifications)
router.post(
  '/externalsource1/services/apexrest/api/complaintCapture/Complaint_Management__c',
  webhookLimiter,
  captureComplaintWebhook,
);

// 2. Simplified paths
router.post(
  '/api/complaintCapture/Complaint_Management__c',
  webhookLimiter,
  captureComplaintWebhook,
);

router.post(
  '/api/webhooks/nrpl-whatsapp',
  webhookLimiter,
  captureComplaintWebhook,
);

router.post(
  '/api/webhooks/whatsapp-complaint',
  webhookLimiter,
  captureComplaintWebhook,
);

export default router;

