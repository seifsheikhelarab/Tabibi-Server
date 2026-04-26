import { type Response } from 'express';
import { patientService } from './patient.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';
import logger from '../../utils/logger.util.js';

export const createPatient = asyncHandler(
    async (req: any, res) => {
        logger.debug({ message: 'createPatient called', body: req.body });
        
        const userId = req.user?.id || req.body.userId;

        if (!userId) {
            logger.warn('createPatient failed: User ID missing');
            ResponseHandler.badRequest(res, 'User ID is required');
            return;
        }

        const patient = await patientService.create({ ...req.body, userId });
        ResponseHandler.created(res, patient);
    }
);

export const getPatients = asyncHandler(
    async (req: any, res) => {
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const userId = req.query.userId as string | undefined;
        const doctorId = req.query.doctorId as string | undefined;

        let result;
        if (userId) {
            result = await patientService.findByUserId(userId);
        } else {
            result = await patientService.findAll({ page, limit, doctorId });
        }
        ResponseHandler.success(res, result);
    }
);

export const getPatientById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const patient = await patientService.findById(id);

        if (!patient) {
            throw new NotFoundError('Patient not found');
        }

        ResponseHandler.success(res, patient);
    }
);

export const updatePatient = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const patient = await patientService.update(id, req.body);

        if (!patient) {
            throw new NotFoundError('Patient not found');
        }

        ResponseHandler.success(res, patient);
    }
);

export const deletePatient = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await patientService.delete(id);
        ResponseHandler.noContent(res);
    }
);
