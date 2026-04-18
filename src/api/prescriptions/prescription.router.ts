import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createPrescription,
    getPrescriptions,
    getPrescriptionById,
    updatePrescription,
    deletePrescription
} from './prescription.controller.js';
import {
    createPrescriptionSchema,
    updatePrescriptionSchema
} from './prescription.schemas.js';

const router = Router();

router.get('/', protect, requireActiveOrganization(), getPrescriptions);
router.get('/:id', protect, requireActiveOrganization(), getPrescriptionById);
router.post(
    '/',
    protect,
    validateRequest(createPrescriptionSchema),
    requireActiveOrganization(),
    createPrescription
);
router.put(
    '/:id',
    protect,
    validateRequest(updatePrescriptionSchema),
    requireActiveOrganization(),
    updatePrescription
);
router.delete('/:id', protect, requireActiveOrganization(), deletePrescription);

export default router;