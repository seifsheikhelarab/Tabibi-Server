import { type Response } from 'express';
import { appointmentService } from './appointment.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createAppointment = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId;
        const userId = req.user!.id;

        const appointment = await appointmentService.create({
            ...req.body,
            createdByUserId: userId,
            organizationId
        });

        ResponseHandler.created(res, appointment);
    }
);

export const getAppointments = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const userId = req.user!.id;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const result = await appointmentService.findAll({
            page,
            limit,
            organizationId,
            userId
        });

        ResponseHandler.success(res, result);
    }
);

export const getMyAppointments = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const userId = req.user!.id;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });

        const result = await appointmentService.findAll({
            page,
            limit,
            userId
        });

        ResponseHandler.success(res, result);
    }
);

export const getAppointmentById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id! as string;
        const appointment = await appointmentService.findById(id);

        if (!appointment) {
            throw new NotFoundError('Appointment not found');
        }

        ResponseHandler.success(res, appointment);
    }
);

export const updateAppointment = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id! as string;
        const userId = req.user!.id;
        const appointment = await appointmentService.update(id, req.body, userId);

        if (!appointment) {
            throw new NotFoundError('Appointment not found');
        }

        ResponseHandler.success(res, appointment);
    }
);

export const deleteAppointment = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id! as string;
        await appointmentService.delete(id);
        ResponseHandler.noContent(res);
    }
);

export const getAppointmentStats = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const stats = await appointmentService.getStats(organizationId);
        ResponseHandler.success(res, stats);
    }
);

export const submitPaymentProof = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id! as string;
        const userId = req.user!.id;
        const appointment = await appointmentService.submitPaymentProof(id, req.body, userId);
        
        ResponseHandler.success(res, appointment);
    }
);

export const verifyPayment = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id! as string;
        const userId = req.user!.id;
        const { status, notes } = req.body;
        
        const appointment = await appointmentService.verifyPayment(id, status, userId, notes);
        
        ResponseHandler.success(res, appointment);
    }
);
