import prisma from '../../config/prisma.config.js';
import type {
    CreateAppointmentInput,
    UpdateAppointmentInput,
    AppointmentQueryInput,
    SubmitPaymentProofInput
} from './appointment.schemas.js';
import { AppointmentStatus } from '../../generated/prisma/index.js';
import logger from '../../utils/logger.util.js';

export class AppointmentService {
    async create(data: CreateAppointmentInput & { organizationId: string; createdByUserId: string }) {
        logger.info({
            message: 'Creating appointment',
            organizationId: data.organizationId,
            patientId: data.patientId,
            doctorId: data.doctorId,
            appointmentDate: data.appointmentDate
        });
        
        try {
            const { organizationId, ...rest } = data;
            const appointment = await prisma.appointment.create({
                data: {
                    patient: { connect: { id: rest.patientId } },
                    doctor: { connect: { id: rest.doctorId } },
                    organization: { connect: { id: organizationId } },
                    createdByUserId: rest.createdByUserId,
                    appointmentDate: new Date(rest.appointmentDate),
                    startTime: rest.startTime,
                    endTime: rest.endTime,
                    type: rest.type as any,
                    reason: rest.reason,
                    notes: rest.notes,
                    status: 'PENDING' as any
                },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                    doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } }
                }
            });

            await this.addHistory(appointment.id, AppointmentStatus.PENDING as AppointmentStatus, data.createdByUserId, 'Appointment created');
            
            logger.info({ message: 'Appointment created', appointmentId: appointment.id });
            return appointment;
        } catch (error) {
            logger.error({ message: 'Failed to create appointment', error, data });
            throw error;
        }
    }

    async findAll(query: AppointmentQueryInput) {
        const { page, limit, patientId, doctorId, status, fromDate, toDate, organizationId, userId } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            ...(organizationId && { organizationId }),
            ...(patientId && { patientId }),
            ...(doctorId && { doctorId }),
            ...(status && { status }),
            ...(userId && {
                OR: [
                    { patient: { userId: userId } },
                    { createdByUserId: userId }
                ]
            }),
            ...(fromDate || toDate ? {
                appointmentDate: {
                    ...(fromDate && { gte: new Date(fromDate) }),
                    ...(toDate && { lte: new Date(toDate) })
                }
            } : {})
        };

        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { appointmentDate: 'desc' },
                include: {
                    patient: { 
                        select: { 
                            id: true, 
                            firstName: true, 
                            lastName: true, 
                            phone: true,
                            email: true,
                            dateOfBirth: true
                        } 
                    },
                    doctor: { 
                        select: { 
                            id: true, 
                            firstName: true, 
                            lastName: true, 
                            specialization: true,
                            image: true,
                            user: { select: { image: true } }
                        } 
                    }
                }
            }),
            prisma.appointment.count({ where })
        ]);

        const formatted = appointments.map(apt => {
            const date = new Date(apt.appointmentDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return {
                _id: apt.id,
                id: apt.id,
                appointmentDate: apt.appointmentDate,
                slotDate: `${day}_${month}_${year}`,
                slotTime: apt.startTime,
                endTime: apt.endTime,
                cancelled: apt.status === 'CANCELLED',
                isCompleted: apt.status === 'COMPLETED',
                payment: apt.paymentStatus === 'PAID',
                paymentStatus: apt.paymentStatus,
                paymentProof: apt.paymentProof,
                paymentMethod: apt.paymentMethod || (apt.paymentStatus === 'PAID' ? 'Online' : undefined),
                amount: apt.paymentAmount ? Number(apt.paymentAmount) : 0,
                reason: apt.reason,
                notes: apt.notes,
                rating: apt.rating,
                doctor: {
                    id: apt.doctor?.id,
                    firstName: apt.doctor?.firstName,
                    lastName: apt.doctor?.lastName,
                    specialization: apt.doctor?.specialization,
                    image: apt.doctor?.image || apt.doctor?.user?.image
                },
                doctorId: apt.doctor?.id,
                docData: {
                    id: apt.doctor?.id || '',
                    name: `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.trim(),
                    speciality: apt.doctor?.specialization || '',
                    image: apt.doctor?.image || apt.doctor?.user?.image || ''
                },
                patient: {
                    id: apt.patient?.id,
                    firstName: apt.patient?.firstName,
                    lastName: apt.patient?.lastName,
                    phone: apt.patient?.phone,
                    email: apt.patient?.email,
                    dateOfBirth: apt.patient?.dateOfBirth
                },
                userData: {
                    id: apt.patient?.id || '',
                    name: `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.trim() || 'Patient',
                    phone: apt.patient?.phone || '',
                    email: apt.patient?.email || '',
                    dob: apt.patient?.dateOfBirth || null,
                    image: ''
                },
                createdAt: apt.createdAt
            };
        });

        logger.debug({
            message: 'Appointments fetched',
            count: appointments.length,
            total,
            organizationId
        });

        return {
            data: formatted,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async findById(id: string) {
        return prisma.appointment.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: true,
                history: { orderBy: { createdAt: 'desc' } }
            }
        });
    }

    async update(id: string, data: UpdateAppointmentInput, userId: string) {
        const current = await prisma.appointment.findUnique({ where: { id } });
        if (!current) return null;

        logger.info({
            message: 'Updating appointment',
            appointmentId: id,
            changes: Object.keys(data)
        });

        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                ...data,
                appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : undefined
            }
        });

        if (data.status && data.status !== current.status) {
            await this.addHistory(id, data.status as AppointmentStatus, userId, data.notes || `Status changed to ${data.status}`);
            logger.info({
                message: 'Appointment status changed',
                appointmentId: id,
                oldStatus: current.status,
                newStatus: data.status
            });
        }

        return appointment;
    }

    async delete(id: string) {
        logger.warn({ message: 'Deleting appointment', appointmentId: id });
        
        await prisma.appointment.delete({ where: { id } });
        
        logger.warn({ message: 'Appointment deleted', appointmentId: id });
    }

    async addHistory(appointmentId: string, status: AppointmentStatus, userId: string, notes?: string) {
        return prisma.appointmentHistory.create({
            data: { appointmentId, status, changedByUserId: userId, notes }
        });
    }

    async getStats(organizationId: string, date: Date = new Date()) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

        const [total, completed, cancelled, today] = await Promise.all([
            prisma.appointment.count({ where: { organizationId } }),
            prisma.appointment.count({ where: { organizationId, status: AppointmentStatus.COMPLETED } }),
            prisma.appointment.count({ where: { organizationId, status: AppointmentStatus.CANCELLED } }),
            prisma.appointment.count({
                where: {
                    organizationId,
                    appointmentDate: { gte: startOfDay, lte: endOfDay }
                }
            })
        ]);

        logger.debug({
            message: 'Appointment stats fetched',
            organizationId,
            total,
            completed,
            cancelled,
            today
        });

        return { total, completed, cancelled, today };
    }

    async submitPaymentProof(id: string, data: SubmitPaymentProofInput, userId: string) {
        logger.info({ message: 'Submitting payment proof', appointmentId: id, userId });

        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                paymentProof: data.paymentProof,
                paymentMethod: data.paymentMethod,
                paymentStatus: 'VERIFYING',
                ...(data.paymentAmount && { paymentAmount: data.paymentAmount })
            }
        });

        await this.addHistory(id, appointment.status, userId, `Payment proof submitted via ${data.paymentMethod}`);
        
        return appointment;
    }

    async verifyPayment(id: string, status: 'PAID' | 'FAILED', userId: string, notes?: string) {
        logger.info({ message: 'Verifying payment', appointmentId: id, status, userId });

        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                paymentStatus: status as any,
                // If payment is verified, we might want to automatically confirm the appointment
                ...(status === 'PAID' && { status: 'CONFIRMED' })
            }
        });

        await this.addHistory(id, appointment.status, userId, notes || `Payment ${status.toLowerCase()}`);

        return appointment;
    }
}

export const appointmentService = new AppointmentService();