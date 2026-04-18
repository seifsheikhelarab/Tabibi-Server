import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
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

router.get('/', protect, requireActiveOrganization(), getReferrals);
router.get('/:id', protect, requireActiveOrganization(), getReferralById);
router.post(
    '/',
    protect,
    validateRequest(createReferralSchema),
    requireActiveOrganization(),
    createReferral
);
router.put(
    '/:id',
    protect,
    validateRequest(updateReferralSchema),
    requireActiveOrganization(),
    updateReferral
);
router.delete('/:id', protect, requireActiveOrganization(), deleteReferral);

export default router;