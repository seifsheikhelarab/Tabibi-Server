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

router.use(protect);
router.use(requireActiveOrganization());

router.get('/', getPharmacies);
router.get('/:id', getPharmacyById);
router.post('/', validateRequest(createPharmacySchema), createPharmacy);
router.put('/:id', validateRequest(updatePharmacySchema), updatePharmacy);
router.delete('/:id', deletePharmacy);

export default router;
