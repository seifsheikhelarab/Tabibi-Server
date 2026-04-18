import { Router } from 'express';
import { protect, requireActiveOrganization, type AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
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

router.get('/summary', protect, requireActiveOrganization(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.session.activeOrganizationId;

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

router.get('/', protect, requireActiveOrganization(), getCrmTasks);
router.get('/:id', protect, requireActiveOrganization(), getCrmTaskById);
router.post(
    '/',
    protect,
    validateRequest(createCrmTaskSchema),
    requireActiveOrganization(),
    createCrmTask
);
router.put(
    '/:id',
    protect,
    validateRequest(updateCrmTaskSchema),
    requireActiveOrganization(),
    updateCrmTask
);
router.delete('/:id', protect, requireActiveOrganization(), deleteCrmTask);

export default router;