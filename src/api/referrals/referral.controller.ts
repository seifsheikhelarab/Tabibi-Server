import { type Response } from 'express';
import { referralService } from './referral.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createReferral = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const referral = await referralService.create({ ...req.body, organizationId });
        ResponseHandler.created(res, referral);
    }
);

export const getReferrals = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const doctorId = req.query.doctorId as string | undefined;

        const result = await referralService.findAll({ page, limit, organizationId, doctorId });
        ResponseHandler.success(res, result);
    }
);

export const getReferralById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const referral = await referralService.findById(id);

        if (!referral) {
            throw new NotFoundError('Referral not found');
        }

        ResponseHandler.success(res, referral);
    }
);

export const updateReferral = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const referral = await referralService.update(id, req.body);

        if (!referral) {
            throw new NotFoundError('Referral not found');
        }

        ResponseHandler.success(res, referral);
    }
);

export const deleteReferral = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await referralService.delete(id);
        ResponseHandler.noContent(res);
    }
);