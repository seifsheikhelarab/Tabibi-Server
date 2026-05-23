import prisma from '../../config/prisma.config.js';
import { getCloudinary } from '../../config/integrations.config.js';
import { v2 as cloudinary } from 'cloudinary';
import { NotFoundError, BadRequestError } from '../../errors/index.js';
import { SenderType } from '../../generated/prisma/index.js';
import logger from '../../utils/logger.util.js';
import type { Server as SocketIOServer } from 'socket.io';

export class ChatService {
    /**
     * Get or create a chat between a user (patient) and a doctor.
     */
    async getOrCreateChat(userFromId: string, doctorId: string) {
        // Verify doctor exists
        const doctor = await prisma.doctor.findUnique({
            where: { id: doctorId }
        });
        if (!doctor) {
            throw new NotFoundError('Doctor not found');
        }

        // Find existing chat or create a new one
        let chat = await prisma.chat.findUnique({
            where: {
                userFromId_doctorId: { userFromId, doctorId }
            },
            include: {
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialization: true,
                        image: true
                    }
                },
                userFrom: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            }
        });

        if (!chat) {
            chat = await prisma.chat.create({
                data: { userFromId, doctorId },
                include: {
                    doctor: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            specialization: true,
                            image: true
                        }
                    },
                    userFrom: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    }
                }
            });
        }

        return chat;
    }

    /**
     * Get messages for a specific chat.
     */
    async getMessages(chatId: string) {
        const messages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' }
        });
        return messages;
    }

    /**
     * Send a message in a chat.
     */
    async sendMessage(
        chatId: string,
        senderId: string,
        senderType: 'USER' | 'DOCTOR',
        content: string,
        imageFile?: Express.Multer.File
    ) {
        // Verify chat exists
        const chat = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!chat) {
            throw new NotFoundError('Chat not found');
        }

        let imageUrl = '';
        if (imageFile) {
            try {
                const cloudinaryClient = getCloudinary();
                const result = await new Promise<any>((resolve, reject) => {
                    const uploadStream = cloudinaryClient.uploader.upload_stream(
                        { resource_type: 'image' },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(imageFile.buffer);
                });
                imageUrl = result.secure_url;
            } catch (error) {
                logger.error(`Cloudinary upload error: ${error}`);
                throw new BadRequestError('Failed to upload image');
            }
        }

        const senderEnum = senderType === 'USER' ? SenderType.USER : SenderType.DOCTOR;

        const newMessage = await prisma.message.create({
            data: {
                chatId,
                senderId,
                senderType: senderEnum,
                content: content || (imageUrl ? 'Sent an image' : ''),
                image: imageUrl
            }
        });

        // Update last message in chat
        await prisma.chat.update({
            where: { id: chatId },
            data: { lastMessage: content || 'Sent an image' }
        });

        return newMessage;
    }

    /**
     * Get all chats for a user (patient).
     */
    async getUserChats(userFromId: string) {
        const chats = await prisma.chat.findMany({
            where: { userFromId },
            include: {
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialization: true,
                        image: true,
                        fees: true
                    }
                },
                userFrom: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return chats;
    }

    /**
     * Get all chats for a doctor.
     */
    async getDoctorChats(doctorId: string) {
        const chats = await prisma.chat.findMany({
            where: { doctorId },
            include: {
                userFrom: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialization: true,
                        image: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return chats;
    }

    /**
     * Delete a chat and all its messages.
     */
    async deleteChat(chatId: string) {
        const chat = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!chat) {
            throw new NotFoundError('Chat not found');
        }

        // Delete all messages first (cascade should handle this, but explicit is safer)
        await prisma.message.deleteMany({ where: { chatId } });
        await prisma.chat.delete({ where: { id: chatId } });
    }

    /**
     * Notify the recipient of a new message via Socket.IO.
     */
    async notifyRecipient(
        chatId: string,
        senderId: string,
        senderType: 'USER' | 'DOCTOR',
        message: string,
        io: SocketIOServer
    ) {
        try {
            const chat = await prisma.chat.findUnique({
                where: { id: chatId },
                select: { userFromId: true, doctorId: true }
            });

            if (!chat) return;

            const recipientId = senderType === 'USER' ? chat.doctorId : chat.userFromId;
            const recipientType = senderType === 'USER' ? 'doctor' : 'user';

            io.to(`${recipientType}_${recipientId}`).emit('new_message_notification', {
                chatId,
                senderId,
                message
            });
        } catch (err) {
            logger.error(`Failed to send notification: ${err}`);
        }
    }
}

export const chatService = new ChatService();
