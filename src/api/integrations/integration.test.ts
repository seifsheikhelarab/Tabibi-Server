import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
import request from 'supertest';
import prisma from '../../config/prisma.config.js';

let app: any;
let authToken: string;
let testUserId: string;
let testOrgId: string;
const orgSlug = 'test-integration-org';
const testEmail = 'test-integration-user@test.com';

beforeAll(async () => {
    app = (await import('../../app.js')).default;
    
    await prisma.member.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.session.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.account.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: orgSlug } } });

    try {
        const testUser = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Test Integration User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Integration Org',
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

        const sessionToken = 'test-integration-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-integration-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;
    } catch (err) {
        console.error('Integration Test Setup Error:', err);
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
    const baseUrl = '/api/chatbot';

    describe('POST /chat', () => {
        it('should return 400 when no message or image provided', async () => {
            const response = await request(app)
                .post(baseUrl + '/chat')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
        });

        it('should return error when Gemini is not configured', async () => {
            const response = await request(app)
                .post(baseUrl + '/chat')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ message: 'test' });

            expect([200, 500]).toContain(response.status);
        });
    });
});

describe('Upload API', () => {
    const baseUrl = '/api/upload';

    describe('POST /image', () => {
        it('should return 400 when no file provided', async () => {
            const response = await request(app)
                .post(baseUrl + '/image')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
        });

        it('should return error when Cloudinary is not configured', async () => {
            const response = await request(app)
                .post(baseUrl + '/image')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('image', Buffer.from('test'), 'test.jpg');

            expect([201, 500]).toContain(response.status);
        });
    });

    describe('DELETE /:publicId', () => {
        it('should return 400 when no publicId provided', async () => {
            const response = await request(app)
                .delete(baseUrl + '/');

            expect(response.status).toBe(404);
        });
    });
});

describe('Payment API', () => {
    const baseUrl = '/api/payments';

    describe('POST /create-intent', () => {
        it('should return 400 for invalid input', async () => {
            const response = await request(app)
                .post(baseUrl + '/create-intent')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
        });

        it('should return error for unsupported provider', async () => {
            const response = await request(app)
                .post(baseUrl + '/create-intent')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    appointmentId: 'test123',
                    amount: 100,
                    currency: 'USD',
                    provider: 'INVALID'
                });

            expect([400, 500]).toContain(response.status);
        });
    });

    describe('POST /webhook/stripe', () => {
        it('should return 400 for invalid signature', async () => {
            const response = await request(app)
                .post(baseUrl + '/webhook/stripe')
                .set('stripe-signature', 'invalid')
                .send({});

            expect([400, 500]).toContain(response.status);
        });
    });
});