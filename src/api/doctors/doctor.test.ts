import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
let testDoctorId: string;
let testAvailabilityId: string;
const orgSlug = 'test-doctor-org';
const testEmail = 'test-doctor-user@test.com';

beforeAll(async () => {
    await prisma.doctorSlot.deleteMany({ where: { availability: { doctor: { organization: { slug: orgSlug } } } } });
    await prisma.doctorAvailability.deleteMany({ where: { doctor: { organization: { slug: orgSlug } } } });
    await prisma.doctor.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.patient.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.member.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.session.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.account.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: orgSlug } } });

    try {
        const testUser = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Test Doctor User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Doctor Org',
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

        const sessionToken = 'test-doctor-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-doctor-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;
    } catch (err) {
        console.error('Doctor Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.doctorSlot.deleteMany({ where: { availability: { doctor: { organizationId: testOrgId } } } });
    await prisma.doctorAvailability.deleteMany({ where: { doctor: { organizationId: testOrgId } } });
    await prisma.doctor.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Doctor API', () => {
    it('should create a new doctor', async () => {
        const doctorData = {
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith@example.com',
            phone: '12345678901',
            specialization: 'Cardiology',
            qualification: 'MD',
            experience: 10,
            bio: 'Experienced cardiologist',
            fees: 500.00,
            isAvailable: true
        };

        const response = await request(app)
            .post('/api/doctors')
            .set('Authorization', `Bearer ${authToken}`)
            .send(doctorData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.firstName).toBe(doctorData.firstName);
        expect(response.body.specialization).toBe(doctorData.specialization);
        testDoctorId = response.body.id;
    });

    it('should list all doctors', async () => {
        const response = await request(app)
            .get('/api/doctors')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: '1', limit: '10' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter doctors by specialization', async () => {
        const response = await request(app)
            .get('/api/doctors')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ specialization: 'Cardiology' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter doctors by isAvailable', async () => {
        const response = await request(app)
            .get('/api/doctors')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ isAvailable: 'true' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fetch doctor details', async () => {
        const response = await request(app)
            .get(`/api/doctors/${testDoctorId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testDoctorId);
    });

    it('should update a doctor', async () => {
        const updateData = {
            firstName: 'Jonathan',
            specialization: 'Neurology',
            experience: 15
        };

        const response = await request(app)
            .put(`/api/doctors/${testDoctorId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.firstName).toBe(updateData.firstName);
        expect(response.body.specialization).toBe(updateData.specialization);
    });

    it('should set doctor availability', async () => {
        const availabilityData = {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '17:00',
            isActive: true
        };

        const response = await request(app)
            .post(`/api/doctors/${testDoctorId}/availability`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(availabilityData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.dayOfWeek).toBe(availabilityData.dayOfWeek);
        testAvailabilityId = response.body.id;
    });

    it('should get doctor availability', async () => {
        const response = await request(app)
            .get(`/api/doctors/${testDoctorId}/availability`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should delete a doctor', async () => {
        const response = await request(app)
            .delete(`/api/doctors/${testDoctorId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const verify = await prisma.doctor.findUnique({
            where: { id: testDoctorId }
        });
        expect(verify).toBeNull();
    });

    it('should return 200 if unauthorized (public route)', async () => {
        const response = await request(app).get('/api/doctors');
        expect(response.status).toBe(200);
    });
});
