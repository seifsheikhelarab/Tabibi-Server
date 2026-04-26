import { Router } from 'express';
import { protect, requireActiveOrganization, requireAdmin, type AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { ResponseHandler, ErrorCode } from '../../utils/response.util.js';
import prisma from '../../config/prisma.config.js';
import { auth } from '../../config/auth.config.js';

function getAuthHeaders(req: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        headers['authorization'] = authHeader;
    }
    
    const aToken = req.headers.atoken as string;
    if (aToken && !headers['authorization']) {
        headers['authorization'] = `Bearer ${aToken}`;
    }
    
    const cookieHeader = req.headers.cookie as string;
    if (cookieHeader) {
        const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
        if (match) {
            headers['cookie'] = `better-auth.session_token=${match[1]}`;
        }
    }
    
    return headers;
}

const adminRouter = Router();


// Get all doctors
adminRouter.get('/all-doctors', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.session.activeOrganizationId;

    if (!organizationId) {
        return ResponseHandler.error(res, 'No organization found', ErrorCode.INVALID_INPUT, 403);
    }

    const doctors = await prisma.doctor.findMany({
        where: { organizationId },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const formatted = doctors.map(d => ({
        _id: d.id,
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        specialization: d.specialization,
        qualification: d.qualification,
        experience: d.experience,
        fees: d.fees,
        isAvailable: d.isAvailable,
        image: d.image || d.user?.image,
        createdAt: d.createdAt
    }));

    return ResponseHandler.success(res, { success: true, doctors: formatted });
}));

// Get dashboard
adminRouter.get('/dashboard', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.session.activeOrganizationId as string;

    const [doctorCount, patientCount, appointmentCount] = await Promise.all([
        prisma.doctor.count({ where: { organizationId } }),
        prisma.patient.count(),
        prisma.appointment.count({ where: { organizationId } })
    ]);
    
    console.log('Counts:', { doctorCount, patientCount, appointmentCount });

    const latestAppointments = await prisma.appointment.findMany({
        where: { organizationId },
        include: {
            doctor: {
                select: {
                    firstName: true,
                    lastName: true,
                    image: true,
                    specialization: true
                }
            },
            patient: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { appointmentDate: 'desc' },
        take: 10
    });

    const formattedAppointments = latestAppointments.map(apt => {
        const doctor = apt.doctor;
        const patient = apt.patient;
        return {
            _id: apt.id,
            id: apt.id,
            slotDate: apt.appointmentDate instanceof Date ? (apt.appointmentDate.toISOString().split('T')[0]?.split('-').reverse().join('_') || '') : '',
            slotTime: apt.startTime,
            cancelled: apt.status === 'CANCELLED',
            isCompleted: apt.status === 'COMPLETED',
            docData: {
                name: doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Doctor',
                image: doctor?.image || '',
                speciality: doctor?.specialization || ''
            },
            userData: {
                name: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient' : 'Patient',
                image: ''
            }
        };
    });

    return ResponseHandler.success(res, {
        success: true,
        dashboard: {
            doctors: doctorCount,
            patients: patientCount,
            appointments: appointmentCount,
            earnings: 0,
            latestAppointments: formattedAppointments
        }
    });
}));

// Get all patients (admin view)
adminRouter.get('/all-patients', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.session.activeOrganizationId as string;

    const patients = await prisma.patient.findMany({
        include: {
            user: { select: { id: true, name: true, email: true, image: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const formatted = patients.map(p => ({
        _id: p.id,
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email || p.user?.email,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        address: p.address,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        bloodGroup: p.bloodGroup,
        allergies: p.allergies,
        medicalHistory: p.medicalHistory,
        createdAt: p.createdAt
    }));

    return ResponseHandler.success(res, { success: true, patients: formatted });
}));

// Get all appointments (admin view)
adminRouter.get('/all-appointments', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.session.activeOrganizationId as string;

    const appointments = await prisma.appointment.findMany({
        where: { organizationId },
        include: {
            doctor: { select: { id: true, firstName: true, lastName: true, specialization: true, image: true } },
            patient: { 
                select: { 
                    id: true, 
                    firstName: true, 
                    lastName: true, 
                    phone: true, 
                    email: true,
                    dateOfBirth: true 
                } 
            }
        },
        orderBy: { appointmentDate: 'desc' }
    });

    const formatted = appointments.map(apt => {
        const date = apt.appointmentDate;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return {
            _id: apt.id,
            id: apt.id,
            slotDate: `${day}_${month}_${year}`,
            slotTime: apt.startTime,
            endTime: apt.endTime,
            cancelled: apt.status === 'CANCELLED',
            isCompleted: apt.status === 'COMPLETED',
            payment: apt.paymentStatus === 'PAID',
            paymentMethod: apt.paymentStatus === 'PAID' ? 'Online' : undefined,
            amount: apt.paymentAmount ? Number(apt.paymentAmount) : 0,
            reason: apt.reason,
            notes: apt.notes,
            docData: {
                id: apt.doctor.id,
                name: `${apt.doctor.firstName || ''} ${apt.doctor.lastName || ''}`.trim(),
                speciality: apt.doctor.specialization,
                image: apt.doctor.image || ''
            },
            userData: {
                id: apt.patient.id,
                name: `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim() || 'Patient',
                phone: apt.patient.phone,
                email: apt.patient.email,
                dob: apt.patient.dateOfBirth,
                image: ''
            },
            createdAt: apt.createdAt
        };
    });

    return ResponseHandler.success(res, { success: true, appointments: formatted });
}));

// Change doctor availability
adminRouter.post('/change-availability', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { docId } = req.body;
    const organizationId = req.session.activeOrganizationId as string;

    const doctor = await prisma.doctor.findFirst({
        where: { id: docId, organizationId }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const updated = await prisma.doctor.update({
        where: { id: docId },
        data: { isAvailable: !doctor.isAvailable }
    });

    return ResponseHandler.success(res, {
        success: true,
        message: updated.isAvailable ? 'Doctor is now available' : 'Doctor is now unavailable',
        doctor: { _id: updated.id, isAvailable: updated.isAvailable }
    });
}));

// Delete doctor
adminRouter.post('/delete-doctor', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { docId } = req.body;
    const organizationId = req.session.activeOrganizationId as string;

    const doctor = await prisma.doctor.findFirst({
        where: { id: docId, organizationId }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    await prisma.doctor.delete({ where: { id: docId } });

    return ResponseHandler.success(res, { success: true, message: 'Doctor deleted successfully' });
}));

// Add new doctor
adminRouter.post('/add-doctor', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { firstName, lastName, email, phone, specialization, qualification, experience, fees, bio, image } = req.body;
    const organizationId = req.session.activeOrganizationId as string;

    const existingDoctor = await prisma.doctor.findFirst({
        where: { email, organizationId }
    });

    if (existingDoctor) {
        return ResponseHandler.error(res, 'Doctor with this email already exists', ErrorCode.RESOURCE_ALREADY_EXISTS, 400);
    }

    let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: email || `doctor_${Date.now()}@temp.com`,
                name: `${firstName} ${lastName}`.trim(),
                phone,
                role: 'DOCTOR',
                organizationId
            }
        });
    }

    const doctor = await prisma.doctor.create({
        data: {
            userId: user.id,
            firstName,
            lastName,
            email,
            phone,
            specialization,
            qualification,
            experience,
            fees,
            bio,
            image,
            organizationId,
            isAvailable: true
        }
    });

    return ResponseHandler.success(res, {
        success: true,
        message: 'Doctor added successfully',
        doctor: { _id: doctor.id, ...doctor }
    });
}));

// Update doctor
adminRouter.post('/update-doctor', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { docId, firstName, lastName, email, phone, specialization, qualification, experience, fees, bio, image, isAvailable } = req.body;
    const organizationId = req.session.activeOrganizationId as string;

    const doctor = await prisma.doctor.findFirst({
        where: { id: docId, organizationId }
    });

    if (!doctor) {
        return ResponseHandler.error(res, 'Doctor not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
    }

    const updated = await prisma.doctor.update({
        where: { id: docId },
        data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(specialization && { specialization }),
            ...(qualification && { qualification }),
            ...(experience !== undefined && { experience }),
            ...(fees !== undefined && { fees }),
            ...(bio && { bio }),
            ...(image && { image }),
            ...(isAvailable !== undefined && { isAvailable })
        }
    });

    return ResponseHandler.success(res, {
        success: true,
        message: 'Doctor updated successfully',
        doctor: { _id: updated.id, ...updated }
    });
}));

export default adminRouter;