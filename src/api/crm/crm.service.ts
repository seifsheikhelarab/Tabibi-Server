import prisma from '../../config/prisma.config.js';
import type { CreateCrmTaskInput, UpdateCrmTaskInput, CrmTaskQueryInput } from './crm.schemas.js';
import logger from '../../utils/logger.util.js';

export class CrmService {
    async create(data: CreateCrmTaskInput & { organizationId: string }) {
        logger.info({ message: 'Creating CRM task', organizationId: data.organizationId, title: data.title, priority: data.priority });
        const task = await prisma.crmTask.create({ data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined }, include: { assignedToUser: { select: { id: true, name: true, email: true } } } });
        logger.info({ message: 'CRM task created', taskId: task.id });
        return task;
    }

    async findAll(query: CrmTaskQueryInput) {
        const { page, limit, assignedToUserId, status, priority, organizationId } = query;
        const where = { organizationId, ...(assignedToUserId && { assignedToUserId }), ...(status && { status }), ...(priority && { priority }) };
        const [tasks, total] = await Promise.all([prisma.crmTask.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }], include: { assignedToUser: { select: { id: true, name: true, email: true } } } }), prisma.crmTask.count({ where })]);
        logger.debug({ message: 'CRM tasks fetched', count: tasks.length, total, organizationId });
        return { data: tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(id: string) { return prisma.crmTask.findUnique({ where: { id }, include: { assignedToUser: { select: { id: true, name: true, email: true } } } }); }

    async update(id: string, data: UpdateCrmTaskInput) {
        logger.info({ message: 'Updating CRM task', taskId: id });
        const task = await prisma.crmTask.update({ where: { id }, data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined } });
        logger.info({ message: 'CRM task updated', taskId: id });
        return task;
    }

    async delete(id: string) {
        logger.warn({ message: 'Deleting CRM task', taskId: id });
        await prisma.crmTask.delete({ where: { id } });
        logger.warn({ message: 'CRM task deleted', taskId: id });
    }
}

export const crmService = new CrmService();
