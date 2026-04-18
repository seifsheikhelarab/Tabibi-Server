import request from 'supertest';
import { it, describe, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

let authToken: string;
let testUserId: string;
let testOrgId: string;
let testPatientId: string;
let testDoctorId: string;
let testPharmacyId: string;
let testLabId: string;
let testReferralId: string;
const orgSlug = 'test-referral-org';
const testEmail = 'test-referral-user@test.com';

beforeAll(async () => {
    await prisma.referral.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.pharmacy.deleteMany({ where: { organization: { slug: orgSlug } } });
    await prisma.lab.deleteMany({ where: { organization: { slug: orgSlug } } });
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
                name: 'Test Referral User',
                emailVerified: true
            }
        });
        testUserId = testUser.id;

        const org = await prisma.organization.create({
            data: {
                name: 'Test Referral Org',
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

        const sessionToken = 'test-referral-session-' + Date.now();
        await prisma.session.create({
            data: {
                id: 'test-referral-session-id-' + Date.now(),
                token: sessionToken,
                userId: testUserId,
                expiresAt: new Date(Date.now() + 86400000),
                activeOrganizationId: testOrgId
            }
        });

        authToken = sessionToken;

        const patient = await prisma.patient.create({
            data: {
                firstName: 'Referral',
                lastName: 'Patient',
                userId: testUserId,
                organizationId: testOrgId
            }
        });
        testPatientId = patient.id;

        const doctor = await prisma.doctor.create({
            data: {
                firstName: 'Referral',
                lastName: 'Doctor',
                specialization: 'General',
                userId: testUserId,
                organizationId: testOrgId
            }
        });
        testDoctorId = doctor.id;

        const pharmacy = await prisma.pharmacy.create({
            data: {
                name: 'Test Pharmacy',
                email: 'pharmacy@test.com',
                phone: '1234567890',
                organizationId: testOrgId,
                isActive: true
            }
        });
        testPharmacyId = pharmacy.id;

        const lab = await prisma.lab.create({
            data: {
                name: 'Test Lab',
                email: 'lab@test.com',
                phone: '1234567890',
                organizationId: testOrgId,
                isActive: true
            }
        });
        testLabId = lab.id;
    } catch (err) {
        console.error('Referral Test Setup Error:', err);
        throw err;
    }
});

afterAll(async () => {
    await prisma.referral.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.pharmacy.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.lab.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.doctor.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.member.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
});

describe('Referral API', () => {
    it('should create a new pharmacy referral', async () => {
        const referralData = {
            patientId: testPatientId,
            type: 'PHARMACY',
            pharmacyId: testPharmacyId,
            notes: 'Prescription for antibiotics'
        };

        const response = await request(app)
            .post('/api/referrals')
            .set('Authorization', `Bearer ${authToken}`)
            .send(referralData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.type).toBe('PHARMACY');
        testReferralId = response.body.id;
    });

    it('should create a new lab referral', async () => {
        const referralData = {
            patientId: testPatientId,
            type: 'LAB',
            labId: testLabId,
            notes: 'Blood test required'
        };

        const response = await request(app)
            .post('/api/referrals')
            .set('Authorization', `Bearer ${authToken}`)
            .send(referralData);

        expect(response.status).toBe(201);
        expect(response.body.type).toBe('LAB');
    });

    it('should list all referrals', async () => {
        const response = await request(app)
            .get('/api/referrals')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: '1', limit: '10' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter referrals by patientId', async () => {
        const response = await request(app)
            .get('/api/referrals')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ patientId: testPatientId });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter referrals by type', async () => {
        const response = await request(app)
            .get('/api/referrals')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ type: 'PHARMACY' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter referrals by status', async () => {
        const response = await request(app)
            .get('/api/referrals')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ status: 'PENDING' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fetch referral details', async () => {
        const response = await request(app)
            .get(`/api/referrals/${testReferralId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testReferralId);
    });

    it('should update a referral', async () => {
        const updateData = {
            status: 'SENT',
            notes: 'Updated notes - please confirm receipt'
        };

        const response = await request(app)
            .put(`/api/referrals/${testReferralId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(updateData.status);
    });

    it('should delete a referral', async () => {
        const response = await request(app)
            .delete(`/api/referrals/${testReferralId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const verify = await prisma.referral.findUnique({
            where: { id: testReferralId }
        });
        expect(verify).toBeNull();
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app).get('/api/referrals');
        expect(response.status).toBe(401);
    });
});
