import prisma from '../../config/prisma.config.js';
import type {
    CreateIntegrationInput,
    UpdateIntegrationInput,
    IntegrationQueryInput
} from './integration.schemas.js';
import { BadRequestError } from '../../utils/response.util.js';

export class IntegrationService {
    async create(data: CreateIntegrationInput, organizationId: string) {
        const { type, ...rest } = data;
        
        if (type === 'PHARMACY') {
            return prisma.pharmacy.create({
                data: { ...rest, organizationId }
            });
        } else if (type === 'LAB') {
            return prisma.lab.create({
                data: { ...rest, organizationId }
            });
        } else {
            throw new BadRequestError(`Integration type ${type} not supported`);
        }
    }

    async findAll(query: IntegrationQueryInput) {
        const { page, limit, search, organizationId, type } = query;
        const skip = (page - 1) * limit;

        const where = {
            organizationId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { city: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } }
                ]
            })
        };

        let result;
        if (type === 'PHARMACY') {
            const [items, total] = await Promise.all([
                prisma.pharmacy.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { name: 'asc' }
                }),
                prisma.pharmacy.count({ where })
            ]);
            result = { items, total };
        } else if (type === 'LAB') {
            const [items, total] = await Promise.all([
                prisma.lab.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { name: 'asc' }
                }),
                prisma.lab.count({ where })
            ]);
            result = { items, total };
        } else {
            throw new BadRequestError(`Integration type ${type || 'unknown'} not supported`);
        }

        return {
            data: result.items,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        };
    }

    async findById(id: string, type: 'PHARMACY' | 'LAB') {
        if (type === 'PHARMACY') {
            return prisma.pharmacy.findUnique({ where: { id } });
        } else {
            return prisma.lab.findUnique({ where: { id } });
        }
    }

    async update(id: string, type: 'PHARMACY' | 'LAB', data: UpdateIntegrationInput) {
        if (type === 'PHARMACY') {
            return prisma.pharmacy.update({ where: { id }, data });
        } else {
            return prisma.lab.update({ where: { id }, data });
        }
    }

    async delete(id: string, type: 'PHARMACY' | 'LAB') {
        if (type === 'PHARMACY') {
            return prisma.pharmacy.delete({ where: { id } });
        } else {
            return prisma.lab.delete({ where: { id } });
        }
    }
}

export const integrationService = new IntegrationService();