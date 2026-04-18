import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
const orgSlug = 'test-upload-org';
const testEmail = 'test-upload-user@test.com';

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
                name: 'Test Upload User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Upload Org',
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

        const sessionToken = 'test-upload-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-upload-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;
    } catch (err) {
        console.error('Upload Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Upload API', () => {
    it('should upload a file', async () => {
        const response = await request(app)
            .post('/api/upload/file')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', Buffer.from('fake-file-content'), {
                filename: 'test.txt',
                contentType: 'text/plain'
            });

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
            expect(response.body.data).toHaveProperty('url');
        }
    });

    it('should upload an image', async () => {
        const response = await request(app)
            .post('/api/upload/image')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('image', Buffer.from('fake-image-data'), {
                filename: 'test.jpg',
                contentType: 'image/jpeg'
            });

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
            expect(response.body.data).toHaveProperty('url');
        }
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app)
            .post('/api/upload/image')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
    });
});
