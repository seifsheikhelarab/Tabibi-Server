import { Router } from 'express';
import { protect, requireActiveOrganization, requireAdmin, requireOwner, type AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { ResponseHandler } from '../../utils/response.util.js';
import prisma from '../../config/prisma.config.js';
import {
    createCrmTask,
    getCrmTasks,
    getCrmTaskById,
    updateCrmTask,
    deleteCrmTask
} from './crm.controller.js';
import { createCrmTaskSchema, updateCrmTaskSchema } from './crm.schemas.js';

const router = Router();

router.get('/summary', protect, requireActiveOrganization(), requireAdmin(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.session.activeOrganizationId as string;

    const [total, open, done, inProgress, highPriorityPending] = await Promise.all([
        prisma.crmTask.count({ where: { organizationId } }),
        prisma.crmTask.count({ where: { organizationId, status: 'OPEN' } }),
        prisma.crmTask.count({ where: { organizationId, status: 'DONE' } }),
        prisma.crmTask.count({ where: { organizationId, status: 'IN_PROGRESS' } }),
        prisma.crmTask.count({ 
            where: { 
                organizationId, 
                priority: 'HIGH', 
                status: { not: 'DONE' } 
            } 
        })
    ]);

    return ResponseHandler.success(res, {
        success: true,
        summary: {
            total,
            open,
            done,
            inProgress,
            highPriorityPending
        }
    });
}));

router.get('/', protect, requireActiveOrganization(), requireAdmin(), getCrmTasks);
router.get('/:id', protect, requireActiveOrganization(), requireAdmin(), getCrmTaskById);
router.post(
    '/',
    protect,
    validateRequest(createCrmTaskSchema),
    requireActiveOrganization(),
    requireAdmin(),
    createCrmTask
);
router.put(
    '/:id',
    protect,
    validateRequest(updateCrmTaskSchema),
    requireActiveOrganization(),
    requireAdmin(),
    updateCrmTask
);
router.delete('/:id', protect, requireActiveOrganization(), requireOwner(), deleteCrmTask);

export default router;