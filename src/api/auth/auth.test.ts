import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../app.js';
import prisma from '../../config/prisma.config.js';

const TEST_EMAIL = `auth-test-${Date.now()}@test.com`;
const TEST_PASSWORD = 'TestPass123!';

describe('Auth API', () => {
    beforeAll(async () => {
        if (!prisma) return;
        await prisma.session.deleteMany({ where: { user: { email: TEST_EMAIL } } });
        await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    });

    afterAll(async () => {
        if (!prisma) return;
        await prisma.session.deleteMany({ where: { user: { email: TEST_EMAIL } } });
        await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    });

    describe('POST /api/auth/sign-up/email', () => {
        it('should reject duplicate email', async () => {
            await request(app)
                .post('/api/auth/sign-up/email')
                .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test User' });

            const response = await request(app)
                .post('/api/auth/sign-up/email')
                .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test' });

            expect(response.status).toBe(422);
        });
    });

    describe('POST /api/auth/sign-in/email', () => {
        it('should reject wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/sign-in/email')
                .send({ email: TEST_EMAIL, password: 'WrongPass!' });

            expect(response.status).toBe(401);
        });

        it('should reject non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/sign-in/email')
                .send({ email: 'nonexistent@test.com', password: 'TestPass123!' });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/auth/get-session', () => {
        it('should return null for unauthenticated request', async () => {
            const response = await request(app).get('/api/auth/get-session');
            
            expect(response.status).toBe(200);
            expect(response.body).toBeNull();
        });
    });
});
