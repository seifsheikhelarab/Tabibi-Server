import prisma from '../../config/prisma.config.js';
import type { CreateReferralInput, UpdateReferralInput, ReferralQueryInput } from './referral.schemas.js';
import logger from '../../utils/logger.util.js';

export class ReferralService {
    async create(data: CreateReferralInput & { organizationId: string }) {
        logger.info({
            message: 'Creating referral',
            organizationId: data.organizationId,
            patientId: data.patientId,
            type: data.type
        });
        const referral = await prisma.referral.create({
            data,
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                pharmacy: true,
                lab: true
            }
        });
        logger.info({ message: 'Referral created', referralId: referral.id });
        return referral;
    }

    async findAll(query: ReferralQueryInput) {
        const { page, limit, patientId, doctorId, type, status, organizationId } = query;
        const skip = (page - 1) * limit;

        const where = {
            organizationId,
            ...(patientId && { patientId }),
            ...(doctorId && { doctorId }),
            ...(type && { type }),
            ...(status && { status })
        };

        const [referrals, total] = await Promise.all([
            prisma.referral.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                    pharmacy: { select: { id: true, name: true } },
                    lab: { select: { id: true, name: true } }
                }
            }),
            prisma.referral.count({ where })
        ]);

        logger.debug({
            message: 'Referrals fetched',
            count: referrals.length,
            total,
            organizationId
        });

        return {
            data: referrals,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async findById(id: string) {
        return prisma.referral.findUnique({
            where: { id },
            include: {
                patient: true,
                pharmacy: true,
                lab: true
            }
        });
    }

    async update(id: string, data: UpdateReferralInput) {
        logger.info({ message: 'Updating referral', referralId: id });
        const referral = await prisma.referral.update({ where: { id }, data });
        logger.info({ message: 'Referral updated', referralId: id });
        return referral;
    }

    async delete(id: string) {
        logger.warn({ message: 'Deleting referral', referralId: id });
        await prisma.referral.delete({ where: { id } });
        logger.warn({ message: 'Referral deleted', referralId: id });
    }
}

export const referralService = new ReferralService();