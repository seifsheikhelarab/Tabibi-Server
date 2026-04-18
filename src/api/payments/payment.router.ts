import { Router } from 'express';
import express from 'express';
import {
    createPaymentIntent,
    verifyPayment,
    handleStripeWebhook,
    handleRazorpayWebhook
} from './payment.controller.js';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createPaymentIntentSchema } from './payment.schemas.js';

const router = Router();

router.post('/create-intent', protect, requireActiveOrganization(), validateRequest(createPaymentIntentSchema), createPaymentIntent);
router.post('/verify', protect, requireActiveOrganization(), verifyPayment);
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.post('/webhook/razorpay', handleRazorpayWebhook);

export default router;