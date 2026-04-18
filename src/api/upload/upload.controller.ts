import { type Response } from 'express';
import { uploadService } from './upload.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { ResponseHandler } from '../../utils/response.util.js';

export const uploadImage = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        if (!req.file) {
            ResponseHandler.badRequest(res, 'No file provided');
            return;
        }

        const folder = req.body.folder || 'tabibi';
        const result = await uploadService.uploadImage(
            req.file.buffer,
            req.file.originalname,
            folder
        );

        ResponseHandler.created(res, result);
    }
);

export const uploadFile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        if (!req.file) {
            ResponseHandler.badRequest(res, 'No file provided');
            return;
        }

        const folder = req.body.folder || 'tabibi';
        const resourceType = req.body.resourceType || 'auto';

        const result = await uploadService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            folder,
            resourceType
        );

        ResponseHandler.created(res, result);
    }
);

export const deleteFile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { publicId } = req.params;
        if (!publicId) {
            ResponseHandler.badRequest(res, 'Public ID is required');
            return;
        }

        await uploadService.deleteImage(publicId as string);
        ResponseHandler.success(res, { message: 'File deleted successfully' });
    }
);

export const uploadController = { uploadImage, uploadFile, deleteFile };