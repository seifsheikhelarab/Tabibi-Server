import { Router } from 'express';
import multer from 'multer';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { uploadController } from './upload.controller.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const router = Router();

router.post(
    '/image',
    protect,
    requireActiveOrganization(),
    upload.single('image'),
    uploadController.uploadImage
);

router.post(
    '/file',
    protect,
    requireActiveOrganization(),
    upload.single('file'),
    uploadController.uploadFile
);

router.delete(
    '/:publicId',
    protect,
    requireActiveOrganization(),
    uploadController.deleteFile
);

export default router;