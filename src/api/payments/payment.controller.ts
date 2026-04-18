import { type Request, type Response } from 'express';
import { paymentService } from './payment.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createPaymentIntent = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const intent = await paymentService.createIntent(req.body, organizationId);
        ResponseHandler.created(res, intent);
    }
);

export const verifyPayment = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const result = await paymentService.verifyPayment(req.body, organizationId);
        ResponseHandler.success(res, result);
    }
);

export const handleStripeWebhook = asyncHandler(
    async (req: Request, res: Response) => {
        const signature = req.headers['stripe-signature'] as string;
        const result = await paymentService.handleStripeWebhook(req.body, signature);
        ResponseHandler.success(res, result);
    }
);

export const handleRazorpayWebhook = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await paymentService.handleRazorpayWebhook(req.body);
        ResponseHandler.success(res, result);
    }
);