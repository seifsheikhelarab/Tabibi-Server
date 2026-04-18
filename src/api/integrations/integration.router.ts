import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createIntegration,
    getIntegrations,
    getIntegrationById,
    updateIntegration,
    deleteIntegration
} from './integration.controller.js';
import { createIntegrationSchema, updateIntegrationSchema } from './integration.schemas.js';

const router = Router();

router.get('/', protect, requireActiveOrganization(), getIntegrations);
router.get('/:type/:id', protect, requireActiveOrganization(), getIntegrationById);
router.post(
    '/',
    protect,
    validateRequest(createIntegrationSchema),
    requireActiveOrganization(),
    createIntegration
);
router.patch(
    '/:type/:id',
    protect,
    validateRequest(updateIntegrationSchema),
    requireActiveOrganization(),
    updateIntegration
);
router.delete('/:type/:id', protect, requireActiveOrganization(), deleteIntegration);

export default router;