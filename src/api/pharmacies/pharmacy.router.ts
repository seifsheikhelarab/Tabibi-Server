import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createPharmacy,
    getPharmacies,
    getPharmacyById,
    updatePharmacy,
    deletePharmacy
} from './pharmacy.controller.js';
import { createPharmacySchema, updatePharmacySchema } from './pharmacy.schemas.js';

const router = Router();

router.get('/', getPharmacies);
router.get('/:id', getPharmacyById);
router.post('/', protect, validateRequest(createPharmacySchema), requireActiveOrganization(), createPharmacy);
router.put('/:id', protect, validateRequest(updatePharmacySchema), requireActiveOrganization(), updatePharmacy);
router.delete('/:id', protect, requireActiveOrganization(), deletePharmacy);

export default router;
