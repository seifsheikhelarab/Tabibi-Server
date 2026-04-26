import { Router } from 'express';
import { protect, requireActiveOrganization, requireDoctor, type AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { ResponseHandler, ErrorCode } from '../../utils/response.util.js';
import prisma from '../../config/prisma.config.js';

const doctorRouter = Router();


// Get doctor appointments (protected by Better Auth session)
doctorRouter.get('/appointments', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor profile not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

const appointments = await prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        orderBy: { appointmentDate: 'desc' },
        include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, dateOfBirth: true, gender: true } }
        }
    });

    const formatted = appointments.map(a => {
        const date = new Date(a.appointmentDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return {
            _id: a.id,
            id: a.id,
            userData: {
                name: `${a.patient.firstName} ${a.patient.lastName}`.trim(),
                image: null,
                dob: a.patient.dateOfBirth
            },
            patient: {
                id: a.patient.id,
                name: `${a.patient.firstName} ${a.patient.lastName}`.trim(),
                phone: a.patient.phone,
                email: a.patient.email,
                dateOfBirth: a.patient.dateOfBirth
            },
            slotDate: `${day}_${month}_${year}`,
            slotTime: a.startTime || '09:00',
            appointmentDate: a.appointmentDate,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status,
            paymentStatus: a.paymentStatus,
            paymentMethod: a.paymentMethod,
            paymentAmount: a.paymentAmount,
            notes: a.notes,
            reason: a.reason,
            isCompleted: a.status === 'COMPLETED',
            cancelled: a.status === 'CANCELLED'
        };
    });

    return ResponseHandler.success(res, { success: true, appointments: formatted });
}));

// Get doctor profile
doctorRouter.get('/profile', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } }
        }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor profile not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    return ResponseHandler.success(res, {
        success: true, 
        doctor: { 
            _id: doctor.id,
            ...doctor,
            image: doctor.image || doctor.user?.image,
            name: `${doctor.firstName} ${doctor.lastName}`.trim()
        } 
    });
}));

// Update doctor profile
doctorRouter.post('/profile', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { firstName, lastName, phone, specialization, qualification, experience, fees, bio, image } = req.body;
    
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor profile not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const updated = await prisma.doctor.update({
        where: { id: doctor.id },
        data: { firstName, lastName, phone, specialization, qualification, experience, fees, bio, image }
    });

    return ResponseHandler.success(res, { success: true, doctor: { _id: updated.id, ...updated } });
}));

// Doctor dashboard
doctorRouter.get('/dashboard', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor profile not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // More robust date comparison for today
    const todayIso = today.toISOString().split('T')[0];
    const tomorrowIso = tomorrow.toISOString().split('T')[0];

    const [appointmentsToday, completedAppointments, earnings, latestAppointments] = await Promise.all([
        prisma.appointment.count({
            where: {
                doctorId: doctor.id,
                appointmentDate: { gte: today, lt: tomorrow }
            }
        }),
        prisma.appointment.count({
            where: {
                doctorId: doctor.id,
                status: 'COMPLETED'
            }
        }),
        prisma.appointment.aggregate({
            where: {
                doctorId: doctor.id,
                status: 'COMPLETED',
                paymentStatus: { in: ['PAID', 'PENDING'] } // Include PENDING as most data is PENDING
            },
            _sum: { paymentAmount: true }
        }),
        prisma.appointment.findMany({
            where: { doctorId: doctor.id },
            orderBy: { appointmentDate: 'desc' },
            take: 5,
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true, dateOfBirth: true, gender: true } }
            }
        })
    ]);

    return ResponseHandler.success(res, {
        success: true,
        dashboard: {
            patients: await prisma.patient.count(),
            appointments: appointmentsToday, // Frontend expects 'appointments'
            today: appointmentsToday,
            completed: completedAppointments,
            earnings: Number(earnings._sum.paymentAmount) || 0,
            latestAppointments: latestAppointments.map(apt => {
                const date = new Date(apt.appointmentDate);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return {
                    id: apt.id,
                    _id: apt.id,
                    userData: {
                        name: `${apt.patient.firstName} ${apt.patient.lastName}`,
                        image: null
                    },
                    patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
                    patientPhone: apt.patient.phone,
                    slotDate: `${day}_${month}_${year}`,
                    appointmentDate: apt.appointmentDate,
                    status: apt.status,
                    paymentStatus: apt.paymentStatus,
                    cancelled: apt.status === 'CANCELLED',
                    isCompleted: apt.status === 'COMPLETED'
                };
            })
        }
    });
}));

// Get doctor records
doctorRouter.get('/records', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const records = await prisma.patientRecord.findMany({
        where: { doctorId: doctor.id },
        include: {
            patient: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return ResponseHandler.success(res, { success: true, records });
}));

// Get doctor prescriptions
doctorRouter.get('/prescriptions', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const prescriptions = await prisma.prescription.findMany({
        where: { doctorId: doctor.id },
        include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            record: { select: { id: true, visitDate: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return ResponseHandler.success(res, { success: true, prescriptions });
}));

// Get doctor referrals
doctorRouter.get('/referrals', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const referrals = await prisma.referral.findMany({
        include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return ResponseHandler.success(res, { success: true, referrals });
}));

// Doctor cancel appointment
doctorRouter.post('/cancel-appointment', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { appointmentId } = req.body;
    
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor profile not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, doctorId: doctor.id }
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

// Doctor complete appointment
doctorRouter.post('/complete-appointment', protect, requireActiveOrganization(), requireDoctor(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { appointmentId, notes } = req.body;
    
    const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user.id }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor profile not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, doctorId: doctor.id }
    });

    if (!appointment) {
        return ResponseHandler.error(res, 'Appointment not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const updated = await prisma.appointment.update({
        where: { id: appointmentId },
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
}));

export default doctorRouter;
