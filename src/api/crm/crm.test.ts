import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
let testCrmTaskId: string;
const orgSlug = 'test-crm-org';
const testEmail = 'test-crm-user@test.com';

beforeAll(async () => {
    await prisma.crmTask.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.member.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.session.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.account.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: orgSlug } } });

    try {
        const testUser = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Test CRM User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test CRM Org',
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

        const sessionToken = 'test-crm-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-crm-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;
    } catch (err) {
        console.error('CRM Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.crmTask.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('CRM Task API', () => {
    it('should create a new CRM task', async () => {
        const taskData = {
            title: 'Follow up with patient',
            description: 'Schedule follow-up appointment for John Doe',
            status: 'OPEN',
            priority: 'HIGH',
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            assignedToUserId: testUserId
        };

        const response = await request(app)
            .post('/api/crm')
            .set('Authorization', `Bearer ${authToken}`)
            .send(taskData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.title).toBe(taskData.title);
        expect(response.body.status).toBe(taskData.status);
        testCrmTaskId = response.body.id;
    });

    it('should list all CRM tasks', async () => {
        const response = await request(app)
            .get('/api/crm')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: '1', limit: '10' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter CRM tasks by status', async () => {
        const response = await request(app)
            .get('/api/crm')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ status: 'OPEN' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter CRM tasks by priority', async () => {
        const response = await request(app)
            .get('/api/crm')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ priority: 'HIGH' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter CRM tasks by assignedToUserId', async () => {
        const response = await request(app)
            .get('/api/crm')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ assignedToUserId: testUserId });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fetch CRM task details', async () => {
        const response = await request(app)
            .get(`/api/crm/${testCrmTaskId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testCrmTaskId);
    });

    it('should update a CRM task', async () => {
        const updateData = {
            title: 'Updated task title',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM'
        };

        const response = await request(app)
            .put(`/api/crm/${testCrmTaskId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe(updateData.title);
        expect(response.body.status).toBe(updateData.status);
    });

    it('should complete a CRM task', async () => {
        const updateData = {
            status: 'DONE'
        };

        const response = await request(app)
            .put(`/api/crm/${testCrmTaskId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('DONE');
    });

    it('should delete a CRM task', async () => {
        const response = await request(app)
            .delete(`/api/crm/${testCrmTaskId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const verify = await prisma.crmTask.findUnique({
            where: { id: testCrmTaskId }
        });
        expect(verify).toBeNull();
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app).get('/api/crm');
        expect(response.status).toBe(401);
    });
});
