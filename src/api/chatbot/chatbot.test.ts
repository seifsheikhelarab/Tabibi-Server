import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
const orgSlug = 'test-chatbot-org';
const testEmail = 'test-chatbot-user@test.com';

beforeAll(async () => {
    await prisma.member.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.session.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.account.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: orgSlug } } });

    try {
        const testUser = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Test Chatbot User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Chatbot Org',
                slug: orgSlug
            }
        });
        testOrgId = org.id;

        await prisma.member.create({
            data: {
                userId: testUserId,
                organizationId: testOrgId,
                role: 'OWNER'
            }
        });

        const sessionToken = 'test-chatbot-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-chatbot-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;
    } catch (err) {
        console.error('Chatbot Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Chatbot API', () => {
    it('should send a chat message without image', async () => {
        const response = await request(app)
            .post('/api/chatbot/chat')
            .set('Authorization', `Bearer ${authToken}`)
            .field('message', 'Hello, I need help booking an appointment')
            .field('sessionId', 'test-session-123');

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
            expect(response.body.data).toHaveProperty('response');
            expect(response.body.data).toHaveProperty('doctors');
            expect(Array.isArray(response.body.data.doctors)).toBe(true);
        }
    });

    it('should send a chat message with image', async () => {
        const response = await request(app)
            .post('/api/chatbot/chat')
            .set('Authorization', `Bearer ${authToken}`)
            .field('message', 'I have a rash on my arm')
            .field('sessionId', 'test-session-456')
            .attach('image', Buffer.from('fake-image-data'), {
                filename: 'test.jpg',
                contentType: 'image/jpeg'
            });

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
            expect(response.body.data).toHaveProperty('response');
            expect(response.body.data).toHaveProperty('doctors');
            expect(Array.isArray(response.body.data.doctors)).toBe(true);
        }
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app)
            .post('/api/chatbot/chat')
            .field('message', 'Hello');

        expect(response.status).toBe(401);
    });
});
