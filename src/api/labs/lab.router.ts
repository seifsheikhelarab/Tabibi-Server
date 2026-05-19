import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createLab,
    getLabs,
    getLabById,
    updateLab,
    deleteLab
} from './lab.controller.js';
import { createLabSchema, updateLabSchema } from './lab.schemas.js';

const router = Router();

router.get('/', getLabs);
router.get('/:id', getLabById);
router.post('/', protect, validateRequest(createLabSchema), requireActiveOrganization(), createLab);
router.put('/:id', protect, validateRequest(updateLabSchema), requireActiveOrganization(), updateLab);
router.delete('/:id', protect, requireActiveOrganization(), deleteLab);

export default router;
