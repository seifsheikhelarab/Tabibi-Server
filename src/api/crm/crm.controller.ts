import { type Response } from 'express';
import { crmService } from './crm.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createCrmTask = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const task = await crmService.create({ ...req.body, organizationId });
        ResponseHandler.created(res, task);
    }
);

export const getCrmTasks = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const result = await crmService.findAll({ page, limit, organizationId });
        ResponseHandler.success(res, result);
    }
);

export const getCrmTaskById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const task = await crmService.findById(id);

        if (!task) {
            throw new NotFoundError('Task not found');
        }

        ResponseHandler.success(res, task);
    }
);

export const updateCrmTask = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const task = await crmService.update(id, req.body);

        if (!task) {
            throw new NotFoundError('Task not found');
        }

        ResponseHandler.success(res, task);
    }
);

export const deleteCrmTask = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await crmService.delete(id);
        ResponseHandler.noContent(res);
    }
);