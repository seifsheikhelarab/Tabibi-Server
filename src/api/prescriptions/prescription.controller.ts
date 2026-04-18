import { type Response } from 'express';
import { prescriptionService } from './prescription.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createPrescription = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const prescription = await prescriptionService.create({
            ...req.body,
            organizationId
        });
        ResponseHandler.created(res, prescription);
    }
);

export const getPrescriptions = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const result = await prescriptionService.findAll({ page, limit, organizationId });
        ResponseHandler.success(res, result);
    }
);

export const getPrescriptionById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const prescription = await prescriptionService.findById(id);

        if (!prescription) {
            throw new NotFoundError('Prescription not found');
        }

        ResponseHandler.success(res, prescription);
    }
);

export const updatePrescription = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const prescription = await prescriptionService.update(id, req.body);

        if (!prescription) {
            throw new NotFoundError('Prescription not found');
        }

        ResponseHandler.success(res, prescription);
    }
);

export const deletePrescription = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await prescriptionService.delete(id);
        ResponseHandler.noContent(res);
    }
);