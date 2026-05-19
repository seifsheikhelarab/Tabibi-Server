import { labService } from './lab.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { NotFoundError } from '../../errors/index.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getPagination } from '../../utils/pagination.util.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const createLab = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = req.session!.activeOrganizationId as string;
        const lab = await labService.create({ ...req.body, organizationId });
        ResponseHandler.created(res, lab);
    }
);

export const getLabs = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const organizationId = (req as any).session?.activeOrganizationId as string | undefined;
        const { page, limit } = getPagination({
            page: req.query.page as string,
            limit: req.query.limit as string
        });
        const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

        const result = await labService.findAll({ page, limit, organizationId, isActive });
        ResponseHandler.success(res, result);
    }
);

export const getLabById = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const lab = await labService.findById(id);

        if (!lab) {
            throw new NotFoundError('Lab not found');
        }

        ResponseHandler.success(res, lab);
    }
);

export const updateLab = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        const lab = await labService.update(id, req.body);
        ResponseHandler.success(res, lab);
    }
);

export const deleteLab = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const id = req.params.id as string;
        await labService.delete(id);
        ResponseHandler.noContent(res);
    }
);
