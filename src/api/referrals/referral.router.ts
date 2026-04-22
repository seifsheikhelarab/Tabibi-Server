import { Router } from 'express';
import { protect, requireActiveOrganization, requireAdmin, requireDoctor, type AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createReferral,
    getReferrals,
    getReferralById,
    updateReferral,
    deleteReferral
} from './referral.controller.js';
import { createReferralSchema, updateReferralSchema } from './referral.schemas.js';

const router = Router();

router.get('/', protect, requireActiveOrganization(), requireAdmin(), getReferrals);
router.get('/:id', protect, requireActiveOrganization(), requireAdmin(), getReferralById);
router.post(
    '/',
    protect,
    validateRequest(createReferralSchema),
    requireActiveOrganization(),
    requireDoctor(),
    createReferral
);
router.put(
    '/:id',
    protect,
    validateRequest(updateReferralSchema),
    requireActiveOrganization(),
    requireAdmin(),
    updateReferral
);
router.delete('/:id', protect, requireActiveOrganization(), requireAdmin(), deleteReferral);

export default router;