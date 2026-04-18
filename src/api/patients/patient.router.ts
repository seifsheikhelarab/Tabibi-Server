import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createPatient,
    getPatients,
    getPatientById,
    updatePatient,
    deletePatient
} from './patient.controller.js';
import { createPatientSchema, updatePatientSchema } from './patient.schemas.js';

const router = Router();

router.get('/', protect, requireActiveOrganization(), getPatients);
router.get('/:id', protect, requireActiveOrganization(), getPatientById);
router.post('/', protect, validateRequest(createPatientSchema), requireActiveOrganization(), createPatient);
router.put('/:id', protect, validateRequest(updatePatientSchema), requireActiveOrganization(), updatePatient);
router.delete('/:id', protect, requireActiveOrganization(), deletePatient);

export default router;