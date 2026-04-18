import { Router } from 'express';
import multer from 'multer';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { chatbotController } from './chatbot.controller.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const router = Router();

router.post(
    '/chat',
    protect,
    requireActiveOrganization(),
    upload.single('image'),
    chatbotController.chat
);

export default router;