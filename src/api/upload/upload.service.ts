import { getCloudinary } from '../../config/integrations.config.js';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
    publicId: string;
    url: string;
    secureUrl: string;
    format: string;
    width?: number;
    height?: number;
}

export class UploadService {
    async uploadImage(
        file: Buffer,
        filename: string,
        folder: string = 'tabibi'
    ): Promise<UploadResult> {
        const cloudinary = getCloudinary();
        
        const publicId = `${folder}/${uuidv4()}-${filename.replace(/\.[^/.]+$/, '')}`;

        return new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        public_id: publicId,
                        folder,
                        resource_type: 'image',
                        transformation: [
                            { quality: 'auto', fetch_format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (result) {
                            resolve({
                                publicId: result.public_id,
                                url: result.url,
                                secureUrl: result.secure_url,
                                format: result.format,
                                width: result.width,
                                height: result.height
                            });
                        }
                    }
                )
                .end(file);
        });
    }

    async uploadFile(
        file: Buffer,
        filename: string,
        folder: string = 'tabibi',
        resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
    ): Promise<UploadResult> {
        const cloudinary = getCloudinary();
        
        const publicId = `${folder}/${uuidv4()}-${filename.replace(/\.[^/.]+$/, '')}`;

        return new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        public_id: publicId,
                        folder,
                        resource_type: resourceType
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (result) {
                            resolve({
                                publicId: result.public_id,
                                url: result.url,
                                secureUrl: result.secure_url,
                                format: result.format,
                                width: result.width,
                                height: result.height
                            });
                        }
                    }
                )
                .end(file);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        const cloudinary = getCloudinary();
        await cloudinary.uploader.destroy(publicId);
    }

    async getSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
        const cloudinary = getCloudinary();
        return cloudinary.url(publicId, {
            secure: true,
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + expiresIn
        });
    }
}

export const uploadService = new UploadService();