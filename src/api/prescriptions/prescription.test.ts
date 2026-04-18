import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
let testPatientId: string;
let testDoctorId: string;
let testPrescriptionId: string;
const orgSlug = 'test-prescription-org';
const testEmail = 'test-prescription-user@test.com';

beforeAll(async () => {
    await prisma.prescription.deleteMany({ where: { organization: { slug: orgSlug } } });
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
                name: 'Test Prescription User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Prescription Org',
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

        const sessionToken = 'test-prescription-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-prescription-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;

        const patient = await prisma.patient.create({
            data: {
                firstName: 'Prescription',
                lastName: 'Patient',
                userId: testUserId,
                organizationId: testOrgId
            }
        });
        testPatientId = patient.id;

        const doctor = await prisma.doctor.create({
            data: {
                firstName: 'Prescription',
                lastName: 'Doctor',
                specialization: 'General',
                userId: testUserId,
                organizationId: testOrgId
            }
        });
        testDoctorId = doctor.id;
    } catch (err) {
        console.error('Prescription Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.prescription.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.doctor.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Prescription API', () => {
    it('should create a new prescription', async () => {
        const prescriptionData = {
            patientId: testPatientId,
            doctorId: testDoctorId,
            status: 'DRAFT',
            medicines: JSON.stringify([
                { name: 'Aspirin', dosage: '100mg', frequency: 'Once daily' }
            ]),
            notes: 'Take after meals',
            followUpDate: new Date(Date.now() + 7 * 86400000).toISOString()
        };

        const response = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${authToken}`)
            .send(prescriptionData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.patientId).toBe(testPatientId);
        testPrescriptionId = response.body.id;
    });

    it('should list all prescriptions', async () => {
        const response = await request(app)
            .get('/api/prescriptions')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: '1', limit: '10' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter prescriptions by patientId', async () => {
        const response = await request(app)
            .get('/api/prescriptions')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ patientId: testPatientId });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter prescriptions by doctorId', async () => {
        const response = await request(app)
            .get('/api/prescriptions')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ doctorId: testDoctorId });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter prescriptions by status', async () => {
        const response = await request(app)
            .get('/api/prescriptions')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ status: 'DRAFT' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fetch prescription details', async () => {
        const response = await request(app)
            .get(`/api/prescriptions/${testPrescriptionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testPrescriptionId);
    });

    it('should update a prescription', async () => {
        const updateData = {
            status: 'FINALIZED',
            notes: 'Updated notes - take before meals'
        };

        const response = await request(app)
            .put(`/api/prescriptions/${testPrescriptionId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(updateData.status);
        expect(response.body.notes).toBe(updateData.notes);
    });

    it('should delete a prescription', async () => {
        const response = await request(app)
            .delete(`/api/prescriptions/${testPrescriptionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const verify = await prisma.prescription.findUnique({
            where: { id: testPrescriptionId }
        });
        expect(verify).toBeNull();
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app).get('/api/prescriptions');
        expect(response.status).toBe(401);
    });
});
