import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
let testPatientId: string;

beforeAll(async () => {
    // 1. Cleanup
    const testEmail = 'test-patient-user@test.com';
    // Delete in correct order for FKs
    await prisma.appointment.deleteMany({ where: { patient: { organization: { slug: { startsWith: 'test-patient-org' } } } } });
    await prisma.patient.deleteMany({
        where: { organization: { slug: { startsWith: 'test-patient-org' } } }
    });
    await prisma.member.deleteMany({
        where: { user: { email: testEmail } }
    });
    await prisma.session.deleteMany({
        where: { user: { email: testEmail } }
    });
    await prisma.account.deleteMany({
        where: { user: { email: testEmail } }
    });
    await prisma.organization.deleteMany({
        where: { slug: { startsWith: 'test-patient-org' } }
    });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // 2. Setup manually to avoid Better Auth 401s
    try {
        const testUser = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Test Patient User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Patient Organization',
                slug: 'test-patient-org-' + Date.now()
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

        const sessionToken = 'test-session-token-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;
    } catch (err) {
        console.error('Patient Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Patient API', () => {
    it('should create a new patient', async () => {
        const patientData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '1234567890',
            dateOfBirth: '1990-01-01T00:00:00.000Z',
            gender: 'MALE',
            address: '123 Test St',
            city: 'Test City'
        };

        const response = await request(app)
            .post('/api/patients')
            .set('Authorization', `Bearer ${authToken}`)
            .send(patientData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.firstName).toBe(patientData.firstName);
        testPatientId = response.body.id;
    });

    it('should list patients', async () => {
        const response = await request(app)
            .get('/api/patients')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get patient by id', async () => {
        const response = await request(app)
            .get(`/api/patients/${testPatientId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testPatientId);
    });

    it('should update patient', async () => {
        const updateData = { firstName: 'Johnny' };
        const response = await request(app)
            .put(`/api/patients/${testPatientId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.firstName).toBe('Johnny');
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app).get('/api/patients');
        expect(response.status).toBe(401);
    });
});