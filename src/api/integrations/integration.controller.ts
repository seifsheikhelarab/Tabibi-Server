import { type Response } from 'express';
import { integrationService } from './integration.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { ValidationError, NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

const getStringParam = (param: string | string[] | undefined): string => {
    if (Array.isArray(param)) return param[0] || '';
    return param || '';
};

export const createIntegration = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const integration = await integrationService.create(req.body, organizationId);
        ResponseHandler.created(res, integration);
    }
);

export const getIntegrations = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const result = await integrationService.findAll({
            page,
            limit,
            organizationId,
            type: (req.query.type as any) || 'PHARMACY',
            search: req.query.search as string
        });
        ResponseHandler.success(res, result);
    }
);

export const getIntegrationById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = getStringParam(req.params.id);
        const type = getStringParam(req.params.type);

        if (type !== 'PHARMACY' && type !== 'LAB') {
            throw new ValidationError('Invalid integration type');
        }

        const integration = await integrationService.findById(id, type as 'PHARMACY' | 'LAB');
        if (!integration) {
            throw new NotFoundError('Integration not found');
        }

        ResponseHandler.success(res, integration);
    }
);

export const updateIntegration = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = getStringParam(req.params.id);
        const type = getStringParam(req.params.type);

        if (type !== 'PHARMACY' && type !== 'LAB') {
            throw new ValidationError('Invalid integration type');
        }

        const integration = await integrationService.update(id, type as 'PHARMACY' | 'LAB', req.body);
        ResponseHandler.success(res, integration);
    }
);

export const deleteIntegration = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = getStringParam(req.params.id);
        const type = getStringParam(req.params.type);

        if (type !== 'PHARMACY' && type !== 'LAB') {
            throw new ValidationError('Invalid integration type');
        }

        await integrationService.delete(id, type as 'PHARMACY' | 'LAB');
        ResponseHandler.noContent(res);
    }
);