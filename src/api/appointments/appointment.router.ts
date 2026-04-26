import { Router } from 'express';
import { protect, requireActiveOrganization, requireMember } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { ResponseHandler, ErrorCode } from '../../utils/response.util.js';
import prisma from '../../config/prisma.config.js';
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentStats,
    submitPaymentProof,
    verifyPayment
} from './appointment.controller.js';
import { createAppointmentSchema, updateAppointmentSchema, submitPaymentProofSchema } from './appointment.schemas.js';

const router = Router();

router.get('/stats', protect, requireActiveOrganization(), getAppointmentStats);
router.get('/', protect, requireActiveOrganization(), getAppointments);
router.get('/:id', protect, requireActiveOrganization(), getAppointmentById);
router.post(
    '/',
    protect,
    validateRequest(createAppointmentSchema),
    requireActiveOrganization(),
    createAppointment
);
router.put(
    '/:id',
    protect,
    validateRequest(updateAppointmentSchema),
    requireActiveOrganization(),
    updateAppointment
);
router.delete('/:id', protect, requireActiveOrganization(), deleteAppointment);

router.post(
    '/:id/payment-proof',
    protect,
    validateRequest(submitPaymentProofSchema),
    requireActiveOrganization(),
    submitPaymentProof
);

router.post(
    '/:id/verify-payment',
    protect,
    requireMember(), // Admins/Receptionists
    requireActiveOrganization(),
    verifyPayment
);

router.put(
    '/:id/cancel',
    protect,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id }
        });

        if (!appointment) {
            return ResponseHandler.error(res, 'Appointment not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });

        return ResponseHandler.success(res, {
            success: true,
            message: 'Appointment cancelled successfully',
            appointment: { _id: updated.id, status: updated.status }
        });
    })
);

router.put(
    '/:id/complete',
    protect,
    requireMember(),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { notes } = req.body;
        
        const appointment = await prisma.appointment.findUnique({
            where: { id }
        });

        if (!appointment) {
            return ResponseHandler.error(res, 'Appointment not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                ...(notes && { notes })
            }
        });

        return ResponseHandler.success(res, {
            success: true,
            message: 'Appointment completed successfully',
            appointment: { _id: updated.id, status: updated.status }
        });
    })
);

router.post(
    '/:id/rate',
    protect,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { rating } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return ResponseHandler.error(res, 'Rating must be between 1 and 5', ErrorCode.VALIDATION_ERROR, 400);
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id }
        });

        if (!appointment) {
            return ResponseHandler.error(res, 'Appointment not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: { rating: Number(rating) }
        });

        return ResponseHandler.success(res, {
            success: true,
            message: 'Rating submitted successfully',
            appointment: { _id: updated.id, rating: updated.rating }
        });
    })
);

export default router;