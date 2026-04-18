import 'dotenv/config';
import prisma from '../config/prisma.config.js';
import logger from '../utils/logger.util.js';
import { auth } from '../config/auth.config.js';

const TEST_PASSWORD = 'Test@123456';

const firstNames = ['Ahmed', 'Mohamed', 'Omar', 'Ali', 'Youssef', 'Ziad', 'Karim', 'Tarek', 'Hany', 'Wael', 'Sarah', 'Nadia', 'Mona', 'Layla', 'Hana', 'Dina', 'Mira', 'Lina', 'Yasmin', 'Rania'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Ali', 'Hassan', 'Ibrahim', 'Khalid', 'Rashid'];
const specializations = ['Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Internal Medicine', 'General Practice', 'Ophthalmology', 'ENT', 'Psychiatry'];

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T;
}

async function cleanup() {
    logger.info('Cleaning up database...');
    
    await prisma.verification.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.member.deleteMany();
    await prisma.patientRecord.deleteMany();
    await prisma.prescription.deleteMany();
    await prisma.referral.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.doctorSlot.deleteMany();
    await prisma.doctorAvailability.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.crmTask.deleteMany();
    await prisma.integration.deleteMany();
    await prisma.webhookDelivery.deleteMany();
    await prisma.webhook.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    
    logger.info('Database cleaned up');
}

async function createUser(email: string, name: string) {
    const result = await auth.api.signUpEmail({
        body: {
            email,
            password: TEST_PASSWORD,
            name,
            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email.split('@')[0]}`
        }
    });
    
    return result;
}

async function seed() {
    logger.info('Starting seed script...');
    
    try {
        await cleanup();
        
        const org = await prisma.organization.create({
            data: {
                name: 'Tabibi Clinic',
                slug: 'tabibi-clinic-main',
                logo: 'https://res.cloudinary.com/demo/image/upload/v1/samples/logo',
            }
        });
        const organizationId = org.id;
        logger.info({ organizationId }, 'Organization created');
        
        logger.info('Creating admin users via Better Auth...');
        
        logger.info('Creating owner...');
        const ownerResult = await createUser('owner@tabibi.com', 'Clinic Owner');
        if (ownerResult.user) {
            await prisma.user.update({
                where: { id: ownerResult.user.id },
                data: { role: 'OWNER' }
            });
            await prisma.member.create({
                data: {
                    userId: ownerResult.user.id,
                    organizationId: organizationId,
                    role: 'OWNER',
                }
            });
            logger.info('Owner created: owner@tabibi.com / ' + TEST_PASSWORD);
        }
        
        logger.info('Creating admin...');
        const adminResult = await createUser('admin@tabibi.com', 'Clinic Admin');
        if (adminResult.user) {
            await prisma.user.update({
                where: { id: adminResult.user.id },
                data: { role: 'ADMIN' }
            });
            await prisma.member.create({
                data: {
                    userId: adminResult.user.id,
                    organizationId: organizationId,
                    role: 'ADMIN',
                }
            });
            logger.info('Admin created: admin@tabibi.com / ' + TEST_PASSWORD);
        }
        
        logger.info('Creating receptionist...');
        const receptionistResult = await createUser('receptionist@tabibi.com', 'Receptionist');
        if (receptionistResult.user) {
            await prisma.user.update({
                where: { id: receptionistResult.user.id },
                data: { role: 'RECEPTIONIST' }
            });
            await prisma.member.create({
                data: {
                    userId: receptionistResult.user.id,
                    organizationId: organizationId,
                    role: 'RECEPTIONIST',
                }
            });
            logger.info('Receptionist created: receptionist@tabibi.com / ' + TEST_PASSWORD);
        }
        
        logger.info('Creating doctors with profiles...');
        const doctors = [];
        for (let i = 0; i < 10; i++) {
            const firstName = randomElement(firstNames);
            const lastName = randomElement(lastNames);
            const email = `doctor${i + 1}@tabibi.com`;
            
            const userResult = await createUser(email, `Dr. ${firstName} ${lastName}`);
            
            if (userResult.user) {
                // Update User role to DOCTOR
                await prisma.user.update({
                    where: { id: userResult.user.id },
                    data: { role: 'DOCTOR' }
                });

                await prisma.member.create({
                    data: {
                        userId: userResult.user.id,
                        organizationId: organizationId,
                        role: 'DOCTOR',
                    }
                });
                
                const doctor = await prisma.doctor.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        specialization: randomElement(specializations),
                        qualification: `Dr. ${randomElement(['PhD', 'Master', 'Specialist', 'Consultant'])}`,
                        experience: randomInt(2, 30),
                        isAvailable: Math.random() > 0.2,
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=doctor${i}`,
                        bio: `Experienced ${randomElement(specializations)} doctor with ${randomInt(5, 20)} years of practice.`,
                        fees: randomInt(200, 1000),
                        organizationId: organizationId,
                        userId: userResult.user.id,
                    }
                });
                doctors.push(doctor);
            }
        }
        logger.info(`Created ${doctors.length} doctors`);
        
        logger.info('Creating patients...');
        const patients = [];
        
        const testPatientResult = await createUser('patient@tabibi.com', 'Test Patient');
        if (testPatientResult.user) {
            await prisma.user.update({
                where: { id: testPatientResult.user.id },
                data: { role: 'MEMBER' }
            });
            const patient = await prisma.patient.create({
                data: {
                    firstName: 'Test',
                    lastName: 'Patient',
                    phone: '01000000000',
                    dateOfBirth: new Date('1990-01-15'),
                    gender: 'MALE',
                    organizationId: organizationId,
                    userId: testPatientResult.user.id,
                }
            });
            patients.push(patient);
        }
        
        for (let i = 0; i < 14; i++) {
            const firstName = randomElement(firstNames);
            const lastName = randomElement(lastNames);
            const userResult = await createUser(`patient${i + 1}@tabibi.com`, `${firstName} ${lastName}`);
            
            if (userResult.user) {
                await prisma.user.update({
                    where: { id: userResult.user.id },
                    data: { role: 'MEMBER' }
                });
                const patient = await prisma.patient.create({
                    data: {
                        firstName,
                        lastName,
                        phone: `01${randomInt(100000000, 999999999)}`,
                        dateOfBirth: new Date(1990 + randomInt(0, 20), randomInt(0, 11), randomInt(1, 28)),
                        gender: randomElement(['MALE', 'FEMALE'] as const),
                        organizationId: organizationId,
                        userId: userResult.user.id,
                    }
                });
                patients.push(patient);
            }
        }
        logger.info(`Created ${patients.length} patients`);
        
        logger.info('Creating appointments...');
        const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
        let appointmentCount = 0;
        
        for (let i = 0; i < 25; i++) {
            const doctor = randomElement(doctors);
            const patient = randomElement(patients);
            const daysOffset = randomInt(-10, 10);
            const appointmentDate = new Date();
            appointmentDate.setDate(appointmentDate.getDate() + daysOffset);
            
            await prisma.appointment.create({
                data: {
                    patientId: patient.id,
                    doctorId: doctor.id,
                    organizationId: organizationId,
                    createdByUserId: patient.userId,
                    appointmentDate,
                    startTime: `${randomInt(9, 17).toString().padStart(2, '0')}:${randomElement(['00', '30'])}`,
                    endTime: `${randomInt(9, 17).toString().padStart(2, '0')}:${randomElement(['00', '30'])}`,
                    status: randomElement(statuses) as any,
                    reason: `Regular ${randomElement(specializations)} consultation`,
                }
            });
            appointmentCount++;
        }
        logger.info(`Created ${appointmentCount} appointments`);
        
        logger.info('===========================================');
        logger.info('SEED COMPLETED SUCCESSFULLY!');
        logger.info('===========================================');
        logger.info('Test Accounts:');
        logger.info(`  Owner:        owner@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Admin:        admin@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Receptionist: receptionist@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Patient:      patient@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Doctors:      doctor1@tabibi.com - doctor10@tabibi.com / ${TEST_PASSWORD}`);
        logger.info('===========================================');
        
    } catch (error) {
        logger.error({ error }, 'Seed failed');
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seed();
