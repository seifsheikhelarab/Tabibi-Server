import { Router } from 'express';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createRecord,
    getRecords,
    getRecordById,
    updateRecord,
    deleteRecord
} from './record.controller.js';
import { createRecordSchema, updateRecordSchema } from './record.schemas.js';

const router = Router();

router.get('/', protect, requireActiveOrganization(), getRecords);
router.get('/:id', protect, requireActiveOrganization(), getRecordById);
router.post(
    '/',
    protect,
    validateRequest(createRecordSchema),
    requireActiveOrganization(),
    createRecord
);
router.put(
    '/:id',
    protect,
    validateRequest(updateRecordSchema),
    requireActiveOrganization(),
    updateRecord
);
router.delete('/:id', protect, requireActiveOrganization(), deleteRecord);

export default router;