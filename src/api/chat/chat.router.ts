import { Router } from 'express';
import multer from 'multer';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';
import { chatController } from './chat.controller.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const router = Router();

// All chat routes require authentication
router.use(protect);
router.use(requireActiveOrganization());

// Get or create a chat between user and doctor
router.post('/get-chat', chatController.getOrCreateChat);

// Get messages for a specific chat
router.get('/messages/:chatId', chatController.getMessages);

// Send a message (with optional image)
router.post('/send', upload.single('image'), chatController.sendMessage);

// Get all chats for the authenticated user (patient)
router.get('/user-chats', chatController.getUserChats);

// Get all chats for a doctor
router.get('/doctor-chats', chatController.getDoctorChats);

// Delete a chat
router.post('/delete', chatController.deleteChat);

export default router;
