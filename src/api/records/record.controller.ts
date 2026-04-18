import { type Response } from 'express';
import { recordService } from './record.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createRecord = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const record = await recordService.create({ ...req.body, organizationId });
        ResponseHandler.created(res, record);
    }
);

export const getRecords = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const result = await recordService.findAll({ page, limit, organizationId });
        ResponseHandler.success(res, result);
    }
);

export const getRecordById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const record = await recordService.findById(id);

        if (!record) {
            throw new NotFoundError('Record not found');
        }

        ResponseHandler.success(res, record);
    }
);

export const updateRecord = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const record = await recordService.update(id, req.body);

        if (!record) {
            throw new NotFoundError('Record not found');
        }

        ResponseHandler.success(res, record);
    }
);

export const deleteRecord = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await recordService.delete(id);
        ResponseHandler.noContent(res);
    }
);