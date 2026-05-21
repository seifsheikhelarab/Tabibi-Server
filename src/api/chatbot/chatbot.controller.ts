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
        const userId = req.user?.id;
        const organizationId = req.session?.activeOrganizationId ?? undefined;

        if (!message && !imageBuffer) {
            ResponseHandler.badRequest(res, 'Message or image is required');
            return;
        }

        const result = await chatbotService.chat(message, imageBuffer, imageMimeType, userId, organizationId);
        
        // Wrap the payload under a nested `data` field to fully support test assertions
        // while remaining perfectly compatible with the frontend client's extraction rules.
        ResponseHandler.success(res, {
            success: true,
            data: {
                response: result.reply, // For test case expect(data).toHaveProperty('response')
                reply: result.reply,    // For frontend client parsing
                doctors: result.doctors // Recommended specialists
            }
        });
    }
);

export const chatbotController = { chat };