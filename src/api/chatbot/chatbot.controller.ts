import { type Response } from 'express';
import { chatbotService } from './chatbot.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const chat = asyncHandler<AuthenticatedRequest>(
    async (req, res) => {
        const { message } = req.body;
        const imageBuffer = req.file?.buffer;
        const imageMimeType = req.file?.mimetype;

        if (!message && !imageBuffer) {
            ResponseHandler.badRequest(res, 'Message or image is required');
            return;
        }

        const result = await chatbotService.chat(message, imageBuffer, imageMimeType);
        ResponseHandler.success(res, result);
    }
);

export const chatbotController = { chat };