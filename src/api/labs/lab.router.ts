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
import { createLabSchema, updateLabSchema } from './lab.schemas.ts';

const router = Router();

router.use(protect);
router.use(requireActiveOrganization());

router.get('/', getLabs);
router.get('/:id', getLabById);
router.post('/', validateRequest(createLabSchema), createLab);
router.put('/:id', validateRequest(updateLabSchema), updateLab);
router.delete('/:id', deleteLab);

export default router;
