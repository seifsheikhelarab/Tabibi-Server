import { type Response } from 'express';
import { doctorService } from './doctor.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';
import logger from '../../utils/logger.util.js';

export const createDoctor = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = (req.session as any)?.activeOrganizationId as string;
        const userId = req.user!.id;

        const doctor = await doctorService.create({
            ...req.body,
            userId,
            organizationId
        });
        ResponseHandler.created(res, doctor);
    }
);

export const getDoctors = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        logger.debug({ message: 'getDoctors called', query: req.query });

        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        logger.debug({ message: 'Pagination parsed', page, limit });

        const specialization = req.query.specialization as string | undefined;
        const isAvailable = req.query.isAvailable === 'true' ? true : req.query.isAvailable === 'false' ? false : undefined;
        const search = req.query.search as string | undefined;
        const city = req.query.city as string | undefined;
        const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
        const maxFees = req.query.maxFees ? Number(req.query.maxFees) : undefined;

        const result = await doctorService.findAll({ 
            page, 
            limit, 
            specialization,
            isAvailable,
            search,
            city,
            minRating,
            maxFees,
            allowPublic: true
        });
        
        logger.debug({ message: 'Service result', resultCount: result.data.length });
        
        ResponseHandler.success(res, result);
    }
);

export const getDoctorById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const doctor = await doctorService.findById(id);

        if (!doctor) {
            throw new NotFoundError('Doctor not found');
        }

        ResponseHandler.success(res, doctor);
    }
);

export const updateDoctor = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const doctor = await doctorService.update(id, req.body);

        if (!doctor) {
            throw new NotFoundError('Doctor not found');
        }

        ResponseHandler.success(res, doctor);
    }
);

export const deleteDoctor = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await doctorService.delete(id);
        ResponseHandler.noContent(res);
    }
);

export const setDoctorAvailability = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const availability = await doctorService.setAvailability(id, req.body);
        ResponseHandler.created(res, availability);
    }
);

export const getDoctorAvailability = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const availabilities = await doctorService.getAvailability(id);
        ResponseHandler.success(res, { data: availabilities });
    }
);