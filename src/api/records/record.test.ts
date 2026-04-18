import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
let testPatientId: string;
let testDoctorId: string;
let testRecordId: string;
const orgSlug = 'test-record-org';
const testEmail = 'test-record-user@test.com';

beforeAll(async () => {
    await prisma.referral.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.prescription.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.patientRecord.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.patient.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.doctor.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.member.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.session.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.account.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: orgSlug } } });

    try {
        const testUser = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Test Record User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Record Org',
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

        const sessionToken = 'test-record-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-record-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;

        const patient = await prisma.patient.create({
            data: {
                firstName: 'Record',
                lastName: 'Patient',
                userId: testUserId,
                organizationId: testOrgId
            }
        });
        testPatientId = patient.id;

        const doctor = await prisma.doctor.create({
            data: {
                firstName: 'Record',
                lastName: 'Doctor',
                specialization: 'General',
                userId: testUserId,
                organizationId: testOrgId
            }
        });
        testDoctorId = doctor.id;
    } catch (err) {
        console.error('Record Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.referral.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.prescription.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.patientRecord.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.doctor.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Patient Record API', () => {
    it('should create a new patient record', async () => {
        const recordData = {
            patientId: testPatientId,
            doctorId: testDoctorId,
            visitDate: new Date().toISOString(),
            chiefComplaint: 'Headache and fever',
            diagnosis: 'Common cold',
            notes: 'Patient advised rest and fluids',
            vitalSigns: JSON.stringify({ bloodPressure: '120/80', temperature: '98.6F' }),
            attachments: ['https://example.com/reports/123']
        };

        const response = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${authToken}`)
            .send(recordData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.patientId).toBe(testPatientId);
        testRecordId = response.body.id;
    });

    it('should list all patient records', async () => {
        const response = await request(app)
            .get('/api/records')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: '1', limit: '10' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter records by patientId', async () => {
        const response = await request(app)
            .get('/api/records')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ patientId: testPatientId });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter records by doctorId', async () => {
        const response = await request(app)
            .get('/api/records')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ doctorId: testDoctorId });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fetch patient record details', async () => {
        const response = await request(app)
            .get(`/api/records/${testRecordId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testRecordId);
        expect(response.body).toHaveProperty('prescriptions');
        expect(response.body).toHaveProperty('referrals');
    });

    it('should update a patient record', async () => {
        const updateData = {
            diagnosis: 'Flu',
            notes: 'Updated diagnosis - rest and medication prescribed'
        };

        const response = await request(app)
            .put(`/api/records/${testRecordId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.diagnosis).toBe(updateData.diagnosis);
    });

    it('should delete a patient record', async () => {
        const response = await request(app)
            .delete(`/api/records/${testRecordId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const verify = await prisma.patientRecord.findUnique({
            where: { id: testRecordId }
        });
        expect(verify).toBeNull();
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app).get('/api/records');
        expect(response.status).toBe(401);
    });
});
