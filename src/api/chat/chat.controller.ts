import { type Response } from 'express';
import { chatService } from './chat.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { ResponseHandler } from '../../utils/response.util.js';
import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.util.js';

/**
 * Get or create a chat between the authenticated user and a doctor.
 */
const getOrCreateChat = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const { doctorId } = req.body;
        const userId = req.user?.id;

        if (!doctorId) {
            ResponseHandler.badRequest(res, 'doctorId is required');
            return;
        }

        const chat = await chatService.getOrCreateChat(userId, doctorId);
        ResponseHandler.success(res, { success: true, chat });
    }
);

/**
 * Get messages for a specific chat.
 */
const getMessages = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const chatId = req.params.chatId as string;
        if (!chatId) {
            ResponseHandler.badRequest(res, 'chatId is required');
            return;
        }

        const messages = await chatService.getMessages(chatId);
        ResponseHandler.success(res, { success: true, messages });
    }
);

/**
 * Send a message in a chat.
 */
const sendMessage = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const { chatId, senderType, content } = req.body;
        const senderId = req.user?.id;

        if (!chatId || !senderType) {
            ResponseHandler.badRequest(res, 'chatId and senderType are required');
            return;
        }

        const imageFile = req.file;

        const newMessage = await chatService.sendMessage(
            chatId,
            senderId,
            senderType,
            content || '',
            imageFile
        );

        // Emit real-time message via Socket.IO
        try {
            const io = getIO();
            io.to(chatId).emit('receive_message', newMessage);

            // Notify recipient via their personal room
            await chatService.notifyRecipient(chatId, senderId, senderType, content || 'Sent an image', io);
        } catch (error) {
            logger.error(`Socket emit error: ${error}`);
        }

        ResponseHandler.success(res, { success: true, message: newMessage });
    }
);

/**
 * Get all chats for the authenticated user (patient).
 */
const getUserChats = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const userId = req.user?.id;

        const chats = await chatService.getUserChats(userId);
        ResponseHandler.success(res, { success: true, chats });
    }
);

/**
 * Get all chats for a doctor.
 */
const getDoctorChats = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const doctorId = req.user?.id;

        const chats = await chatService.getDoctorChats(doctorId);
        ResponseHandler.success(res, { success: true, chats });
    }
);

/**
 * Delete a chat and all its messages.
 */
const deleteChat = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const { chatId } = req.body;

        if (!chatId) {
            ResponseHandler.badRequest(res, 'chatId is required');
            return;
        }

        await chatService.deleteChat(chatId);
        ResponseHandler.success(res, { success: true, message: 'Conversation deleted successfully' });
    }
);

export const chatController = {
    getOrCreateChat,
    getMessages,
    sendMessage,
    getUserChats,
    getDoctorChats,
    deleteChat
};
