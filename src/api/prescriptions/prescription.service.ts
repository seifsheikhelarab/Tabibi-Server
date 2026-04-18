import prisma from '../../config/prisma.config.js';
import type {
    CreatePrescriptionInput,
    UpdatePrescriptionInput,
    PrescriptionQueryInput
} from './prescription.schemas.js';
import logger from '../../utils/logger.util.js';

export class PrescriptionService {
    async create(data: CreatePrescriptionInput & { organizationId: string }) {
        logger.info({ message: 'Creating prescription', organizationId: data.organizationId, patientId: data.patientId });
        const prescription = await prisma.prescription.create({
            data: {
                ...data,
                followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } }
            }
        });
        logger.info({ message: 'Prescription created', prescriptionId: prescription.id });
        return prescription;
    }

    async findAll(query: PrescriptionQueryInput) {
        const { page, limit, patientId, doctorId, status, organizationId } = query;
        const skip = (page - 1) * limit;

        const where = {
            organizationId,
            ...(patientId && { patientId }),
            ...(doctorId && { doctorId }),
            ...(status && { status })
        };

        const [prescriptions, total] = await Promise.all([
            prisma.prescription.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                    doctor: { select: { id: true, firstName: true, lastName: true } }
                }
            }),
            prisma.prescription.count({ where })
        ]);

        logger.debug({ message: 'Prescriptions fetched', count: prescriptions.length, total, organizationId });
        return {
            data: prescriptions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async findById(id: string) {
        return prisma.prescription.findUnique({
            where: { id },
            include: { patient: true, doctor: true, record: true }
        });
    }

    async update(id: string, data: UpdatePrescriptionInput) {
        logger.info({ message: 'Updating prescription', prescriptionId: id });
        const prescription = await prisma.prescription.update({
            where: { id },
            data: { ...data, followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined }
        });
        logger.info({ message: 'Prescription updated', prescriptionId: id });
        return prescription;
    }

    async delete(id: string) {
        logger.warn({ message: 'Deleting prescription', prescriptionId: id });
        await prisma.prescription.delete({ where: { id } });
        logger.warn({ message: 'Prescription deleted', prescriptionId: id });
    }
}

export const prescriptionService = new PrescriptionService();
