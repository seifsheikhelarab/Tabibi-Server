import prisma from '../../config/prisma.config.js';
import type { CreateRecordInput, UpdateRecordInput, RecordQueryInput } from './record.schemas.js';
import logger from '../../utils/logger.util.js';

export class RecordService {
    async create(data: CreateRecordInput & { organizationId: string }) {
        logger.info({
            message: 'Creating patient record',
            organizationId: data.organizationId,
            patientId: data.patientId
        });
        const record = await prisma.patientRecord.create({
            data: {
                ...data,
                visitDate: new Date(data.visitDate)
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } }
            }
        });
        logger.info({ message: 'Patient record created', recordId: record.id });
        return record;
    }

    async findAll(query: RecordQueryInput) {
        const { page, limit, patientId, doctorId, fromDate, toDate, organizationId } = query;
        const skip = (page - 1) * limit;

        const where = {
            organizationId,
            ...(patientId && { patientId }),
            ...(doctorId && { doctorId }),
            ...(fromDate || toDate ? {
                visitDate: {
                    ...(fromDate && { gte: new Date(fromDate) }),
                    ...(toDate && { lte: new Date(toDate) })
                }
            } : {})
        };

        const [records, total] = await Promise.all([
            prisma.patientRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { visitDate: 'desc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                    doctor: { select: { id: true, firstName: true, lastName: true } }
                }
            }),
            prisma.patientRecord.count({ where })
        ]);

        logger.debug({
            message: 'Patient records fetched',
            count: records.length,
            total,
            organizationId
        });

        return {
            data: records,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async findById(id: string) {
        return prisma.patientRecord.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: true,
                prescriptions: true,
                referrals: true
            }
        });
    }

    async update(id: string, data: UpdateRecordInput) {
        logger.info({ message: 'Updating patient record', recordId: id });
        const record = await prisma.patientRecord.update({
            where: { id },
            data: {
                ...data,
                visitDate: data.visitDate ? new Date(data.visitDate) : undefined
            }
        });
        logger.info({ message: 'Patient record updated', recordId: id });
        return record;
    }

    async delete(id: string) {
        logger.warn({ message: 'Deleting patient record', recordId: id });
        await prisma.patientRecord.delete({ where: { id } });
        logger.warn({ message: 'Patient record deleted', recordId: id });
    }
}

export const recordService = new RecordService();