import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import logger from '../utils/logger.util.js';

let io: Server | null = null;

export function initSocket(httpServer: HTTPServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:3000',
                'https://tabibi-client.vercel.app',
                'https://tabibi-admin.vercel.app'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        logger.debug(`Socket connected: ${socket.id}`);

        // Register user (patient) into their personal room
        socket.on('register_user', (userId: string) => {
            socket.join(`user_${userId}`);
            logger.debug(`User registered in room: user_${userId}`);
        });

        // Register doctor into their personal room
        socket.on('register_doctor', (docId: string) => {
            socket.join(`doctor_${docId}`);
            logger.debug(`Doctor registered in room: doctor_${docId}`);
        });

        // Join a specific chat room
        socket.on('join_chat', (chatId: string) => {
            socket.join(chatId);
            logger.debug(`Joined chat room: ${chatId}`);
        });

        // Handle sending a message (after it's saved to DB by the controller)
        // Note: The controller emits 'receive_message' and 'new_message_notification'
        // after saving to the database, so this socket handler is for future
        // client-side emit optimizations.
        socket.on('send_message', (data: {
            chatId: string;
            senderId: string;
            senderType: 'USER' | 'DOCTOR';
            _id?: string;
            id?: string;
            content?: string;
            image?: string;
            createdAt?: string;
        }) => {
            const { chatId } = data;
            io?.to(chatId).emit('receive_message', data);
        });

        socket.on('disconnect', () => {
            logger.debug(`Socket disconnected: ${socket.id}`);
        });
    });

    logger.info('[Init] Socket.IO initialized');
    return io;
}

export function getIO(): Server {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
}
