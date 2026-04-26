import { Router } from 'express';
import { protect, requireActiveOrganization, requireReceptionist, type AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { ResponseHandler, ErrorCode } from '../../utils/response.util.js';
import prisma from '../../config/prisma.config.js';

const receptionRouter = Router();

// Get reception appointments queue
receptionRouter.get('/appointments', protect, requireActiveOrganization(), requireReceptionist(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.session.activeOrganizationId as string;

    const appointments = await prisma.appointment.findMany({
        where: { 
            organizationId,
            status: 'PENDING'
        },
        include: {
            doctor: { select: { id: true, firstName: true, lastName: true, specialization: true, image: true } },
            patient: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } }
        },
        orderBy: { appointmentDate: 'asc' }
    });

    const formatted = appointments.map(apt => {
        const date = new Date(apt.appointmentDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return {
            _id: apt.id,
            id: apt.id,
            slotDate: `${day}_${month}_${year}`,
            slotTime: apt.startTime,
            appointmentDate: apt.appointmentDate,
            startTime: apt.startTime,
            endTime: apt.endTime,
            status: apt.status,
            reason: apt.reason,
            docData: {
                id: apt.doctor.id,
                name: `${apt.doctor.firstName} ${apt.doctor.lastName}`.trim(),
                specialization: apt.doctor.specialization,
                image: apt.doctor.image
            },
            userData: {
                id: apt.patient.id,
                name: `${apt.patient.firstName} ${apt.patient.lastName}`.trim(),
                phone: apt.patient.phone,
                email: apt.patient.email
            },
            createdAt: apt.createdAt
        };
    });

    return ResponseHandler.success(res, { success: true, appointments: formatted });
}));

// Confirm appointment
receptionRouter.post('/appointments/confirm', protect, requireActiveOrganization(), requireReceptionist(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { appointmentId } = req.body;
    const organizationId = req.session.activeOrganizationId as string;

    const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, organizationId }
    });

    if (!appointment) {
        return ResponseHandler.error(res, 'Appointment not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' }
    });

    return ResponseHandler.success(res, {
        success: true,
        message: 'Appointment confirmed successfully',
        appointment: { _id: updated.id, status: updated.status }
    });
}));

// Cancel appointment (reception)
receptionRouter.post('/appointments/cancel', protect, requireActiveOrganization(), requireReceptionist(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { appointmentId } = req.body;
    const organizationId = req.session.activeOrganizationId as string;

    const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, organizationId }
    });

    if (!appointment) {
        return ResponseHandler.error(res, 'Appointment not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' }
    });

    return ResponseHandler.success(res, {
        success: true,
        message: 'Appointment cancelled successfully',
        appointment: { _id: updated.id, status: updated.status }
    });
}));

export default receptionRouter;