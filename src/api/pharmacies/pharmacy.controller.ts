import { pharmacyService } from './pharmacy.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createPharmacy = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const pharmacy = await pharmacyService.create({ ...req.body, organizationId });
        ResponseHandler.created(res, pharmacy);
    }
);

export const getPharmacies = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = (req as any).session?.activeOrganizationId as string | undefined;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });
        const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

        const result = await pharmacyService.findAll({ page, limit, organizationId, isActive });
        ResponseHandler.success(res, result);
    }
);

export const getPharmacyById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const pharmacy = await pharmacyService.findById(id);

        if (!pharmacy) {
            throw new NotFoundError('Pharmacy not found');
        }

        ResponseHandler.success(res, pharmacy);
    }
);

export const updatePharmacy = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const pharmacy = await pharmacyService.update(id, req.body);
        ResponseHandler.success(res, pharmacy);
    }
);

export const deletePharmacy = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await pharmacyService.delete(id);
        ResponseHandler.noContent(res);
    }
);
