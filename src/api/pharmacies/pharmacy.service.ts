import prisma from '../../config/prisma.config.js';
import type { CreatePharmacyInput, UpdatePharmacyInput, PharmacyQueryInput } from './pharmacy.schemas.js';
import logger from '../../utils/logger.util.js';

export class PharmacyService {
    async create(data: CreatePharmacyInput & { organizationId: string }) {
        logger.info({
            message: 'Creating pharmacy',
            organizationId: data.organizationId,
            name: data.name
        });
        const pharmacy = await prisma.pharmacy.create({
            data
        });
        return pharmacy;
    }

    async findAll(query: PharmacyQueryInput) {
        const { page, limit, organizationId, isActive } = query;
        const skip = (page - 1) * limit;

        const where = {
            organizationId,
            ...(isActive !== undefined && { isActive })
        };

        const [pharmacies, total] = await Promise.all([
            prisma.pharmacy.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' }
            }),
            prisma.pharmacy.count({ where })
        ]);

        return {
            data: pharmacies,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async findById(id: string) {
        return prisma.pharmacy.findUnique({
            where: { id }
        });
    }

    async update(id: string, data: UpdatePharmacyInput) {
        return prisma.pharmacy.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        await prisma.pharmacy.delete({ where: { id } });
    }
}

export const pharmacyService = new PharmacyService();
