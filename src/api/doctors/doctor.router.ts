import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createDoctor,
    getDoctors,
    getDoctorById,
    updateDoctor,
    deleteDoctor,
    setDoctorAvailability,
    getDoctorAvailability
} from './doctor.controller.js';
import {
    createDoctorSchema,
    updateDoctorSchema,
    availabilitySchema
} from './doctor.schemas.js';

const router = Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.post('/', protect, validateRequest(createDoctorSchema), requireActiveOrganization(), createDoctor);
router.put('/:id', protect, validateRequest(updateDoctorSchema), requireActiveOrganization(), updateDoctor);
router.delete('/:id', protect, requireActiveOrganization(), deleteDoctor);
router.get('/:id/availability', getDoctorAvailability);
router.post('/:id/availability', protect, validateRequest(availabilitySchema), requireActiveOrganization(), setDoctorAvailability);

export default router;