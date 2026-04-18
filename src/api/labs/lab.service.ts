import prisma from '../../config/prisma.config.js';
import type { CreateLabInput, UpdateLabInput, LabQueryInput } from './lab.schemas.js';
import logger from '../../utils/logger.util.js';

export class LabService {
    async create(data: CreateLabInput & { organizationId: string }) {
        logger.info({
            message: 'Creating lab',
            organizationId: data.organizationId,
            name: data.name
        });
        const lab = await prisma.lab.create({
            data
        });
        return lab;
    }

    async findAll(query: LabQueryInput) {
        const { page, limit, organizationId, isActive } = query;
        const skip = (page - 1) * limit;

        const where = {
            organizationId,
            ...(isActive !== undefined && { isActive })
        };

        const [labs, total] = await Promise.all([
            prisma.lab.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' }
            }),
            prisma.lab.count({ where })
        ]);

        return {
            data: labs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async findById(id: string) {
        return prisma.lab.findUnique({
            where: { id }
        });
    }

    async update(id: string, data: UpdateLabInput) {
        return prisma.lab.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        await prisma.lab.delete({ where: { id } });
    }
}

export const labService = new LabService();
