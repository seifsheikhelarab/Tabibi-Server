import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
let testPatientId: string;
let testDoctorId: string;
let testAppointmentId: string;
const orgSlug = "test-org";
const testEmail = 'test-apt-user@test.com';

beforeAll(async () => {

    await prisma.appointmentHistory.deleteMany({ where: { appointment: { organization: { slug: orgSlug } } } });
    await prisma.appointment.deleteMany({ where: { organization: { slug: orgSlug } } });
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
                name: 'Test Apt User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Apt Org',
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

        const sessionToken = 'test-apt-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-apt-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId,
                ipAddress: '::ffff:127.0.0.1'
            }
        });

        authToken = sessionToken;

        // Create test patient
        const patient = await prisma.patient.create({
            data: {
                firstName: 'Apt', lastName: 'Patient', userId: testUserId, organizationId: testOrgId
            }
        });
        testPatientId = patient.id;

        // Create test doctor
        const doctor = await prisma.doctor.create({
            data: {
                firstName: 'Apt', lastName: 'Doctor', specialization: 'General', userId: testUserId, organizationId: testOrgId
            }
        });
        testDoctorId = doctor.id;
    } catch (err) {
        console.error('Appointment Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    // Careful with delete order due to foreign keys
    await prisma.appointmentHistory.deleteMany({ where: { appointment: { organization: { slug: orgSlug } } } });
    await prisma.appointment.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.doctor.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.patient.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.member.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.session.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Appointment API', () => {
    it('should create an appointment', async () => {
        const aptData = {
            patientId: testPatientId,
            doctorId: testDoctorId,
            appointmentDate: new Date(Date.now() + 86400000).toISOString(),
            startTime: '10:00',
            endTime: '10:30',
            type: 'CHECKUP',
            reason: 'Routine checkup',
            status: 'PENDING',
            organizationId: testOrgId // Explicitly add for validation if needed
        };

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${authToken}`)
            .send(aptData);

        if (response.status === 500) {
            console.error('Appointment Creation Failed:', response.body);
        }

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        testAppointmentId = response.body.id;
    });

    it('should list appointments', async () => {
        const response = await request(app)
            .get('/api/appointments')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get appointment stats', async () => {
        const response = await request(app)
            .get('/api/appointments/stats')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total');
    });

    it('should update appointment status', async () => {
        const updateData = { status: 'CONFIRMED' };
        const response = await request(app)
            .put(`/api/appointments/${testAppointmentId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('CONFIRMED');
    });

    it('should return 401 without auth', async () => {
        const response = await request(app).get('/api/appointments');
        expect(response.status).toBe(401);
    });
});