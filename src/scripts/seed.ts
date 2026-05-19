import 'dotenv/config';
import prisma from '../config/prisma.config.js';
import logger from '../utils/logger.util.js';
import { auth } from '../config/auth.config.js';

const TEST_PASSWORD = 'Test@123456';

const firstNames = [
  'Ahmed', 'Mohamed', 'Omar', 'Ali', 'Youssef', 'Ziad', 'Karim', 'Tarek', 'Hany', 'Wael',
  'Sarah', 'Nadia', 'Mona', 'Layla', 'Hana', 'Dina', 'Mira', 'Lina', 'Yasmin', 'Rania',
  'Kareem', 'Hassan', 'Nour', 'Mariam', 'Farah', 'Sami', 'Lama', 'Rami', 'Noor', 'Ibrahim',
  'Aisha', 'Yasin', 'Leila', 'Bassem', 'Rasha', 'Fadi', 'Lama', 'Hussein', 'Sara', 'Mohanad',
  'Eman', 'Khaled', 'Nada', 'Maher', 'Aya', 'Walid', 'Salma', 'Adel', 'Jana', 'Sameer'
];

const lastNames = [
  'Amin', 'Naguib', 'Shahin', 'Fawzy', 'El-Sayed', 'Rashid', 'Mansour', 'Farouk', 'Nasser', 'Hassan',
  'Khalil', 'Gamal', 'Saad', 'Bishara', 'Tawfik', 'Roumieh', 'Suleiman', 'Abbas', 'Moussa', 'Haroun',
  'Khoury', 'Habib', 'Dawood', 'Ghazi', 'Safadi', 'Malek', 'Boulos', 'Naim', 'Jabr', 'Asfour'
];

const specializations = [
  'Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics',
  'Internal Medicine', 'General Practice', 'Ophthalmology', 'ENT', 'Psychiatry',
  'Urology', 'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Rheumatology',
  'Nephrology', 'Hematology', 'Oncology', 'Gynecology', 'Plastic Surgery'
];

const cities = ['Cairo', 'Alexandria', 'Giza', 'Mansoura', 'Luxor', 'Aswan', 'Port Said', 'Suez', 'Tanta', 'Ismailia'];
const degrees = ['MD', 'PhD', 'MSc', 'FACP', 'MRCP', 'FRCS', 'Board Certified', 'Specialist', 'Consultant'];

const pharmacyNames = [
  'Al-Shifa Pharmacy', 'El-Ezaby Pharmacy', 'Misr Pharmacy', 'El-Nile Pharmacy', 'Mohandseen Pharmacy',
  'Maadi Pharmacy', 'Zamalek Pharmacy', 'Heliopolis Pharmacy', 'Nasr City Pharmacy', 'October Pharmacy',
  'El-Salam Pharmacy', 'Future Pharmacy', 'Al-Ahly Pharmacy', 'Care Pharmacy', 'Trust Pharmacy'
];

const labNames = [
  'Al-Borg Medical Lab', 'El-Mokhtabar Lab', 'PathLab', 'Alfa Medical Lab', 'International Lab',
  'Beta Diagnostics', 'Gamma Lab', 'Delta Medical Lab', 'Sigma Lab', 'Omega Lab',
  'City Lab Services', 'Golden Medical Lab', 'Premier Lab', 'Advanced Diagnostics', 'AccuLab'
];

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
    await prisma.pharmacy.deleteMany();
    await prisma.lab.deleteMany();
    
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

function zeroPad(num: number, width: number = 3): string {
    return String(num).padStart(width, '0');
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
        
        logger.info('Creating 300 doctors with profiles...');
        const doctors = [];
        const usedEmails = new Set<string>();
        
        for (let i = 0; i < 300; i++) {
            let firstName: string, lastName: string, email: string;
            do {
                firstName = randomElement(firstNames);
                lastName = randomElement(lastNames);
                email = `doctor${zeroPad(i + 1)}@tabibi.com`;
            } while (usedEmails.has(email));
            usedEmails.add(email);
            
            const userResult = await createUser(email, `Dr. ${firstName} ${lastName}`);
            
            if (userResult.user) {
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
                
                const specialization = randomElement(specializations);
                const doctor = await prisma.doctor.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        specialization,
                        qualification: `Dr. ${randomElement(degrees)}`,
                        experience: randomInt(1, 35),
                        isAvailable: Math.random() > 0.15,
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=doctor${i}`,
                        bio: `Dr. ${firstName} ${lastName} is an experienced ${specialization} specialist with over ${randomInt(3, 20)} years of clinical practice.`,
                        fees: randomInt(150, 1200),
                        organizationId: organizationId,
                        userId: userResult.user.id,
                    }
                });
                doctors.push(doctor);
                
                if ((i + 1) % 50 === 0) {
                    logger.info(`Created ${i + 1}/300 doctors`);
                }
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
        
        for (let i = 0; i < 49; i++) {
            const firstName = randomElement(firstNames);
            const lastName = randomElement(lastNames);
            const email = `patient${zeroPad(i + 1)}@tabibi.com`;
            const userResult = await createUser(email, `${firstName} ${lastName}`);
            
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
                        dateOfBirth: new Date(randomInt(1960, 2005), randomInt(0, 11), randomInt(1, 28)),
                        gender: randomElement(['MALE', 'FEMALE'] as const),
                        organizationId: organizationId,
                        userId: userResult.user.id,
                    }
                });
                patients.push(patient);
            }
        }
        logger.info(`Created ${patients.length} patients`);
        
        logger.info('Creating doctor availabilities...');
        let availabilityCount = 0;
        for (const doctor of doctors) {
            const days = [0, 1, 2, 3, 4, 5].filter(() => Math.random() > 0.2);
            for (const day of days) {
                await prisma.doctorAvailability.create({
                    data: {
                        doctorId: doctor.id,
                        dayOfWeek: day,
                        startTime: '09:00',
                        endTime: '17:00',
                        isActive: true,
                    }
                });
                availabilityCount++;
            }
        }
        logger.info(`Created ${availabilityCount} availabilities`);
        
        logger.info('Creating appointments...');
        const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
        const paymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'VERIFYING'];
        const appointmentTypes = ['CHECKUP', 'FOLLOWUP', 'EMERGENCY', 'CONSULTATION'];
        let appointmentCount = 0;
        
        for (let i = 0; i < 200; i++) {
            const doctor = randomElement(doctors);
            const patient = randomElement(patients);
            const daysOffset = randomInt(-30, 14);
            const appointmentDate = new Date();
            appointmentDate.setDate(appointmentDate.getDate() + daysOffset);
            const status = randomElement(statuses);
            
            await prisma.appointment.create({
                data: {
                    patientId: patient.id,
                    doctorId: doctor.id,
                    organizationId: organizationId,
                    createdByUserId: patient.userId,
                    appointmentDate,
                    startTime: `${randomInt(9, 16).toString().padStart(2, '0')}:${randomElement(['00', '30'])}`,
                    endTime: `${randomInt(9, 17).toString().padStart(2, '0')}:${randomElement(['00', '30'])}`,
                    status: status as any,
                    type: randomElement(appointmentTypes) as any,
                    paymentStatus: status === 'CANCELLED' ? 'PENDING' : randomElement(paymentStatuses) as any,
                    paymentAmount: status !== 'CANCELLED' ? randomInt(150, 1200) : null,
                    paymentMethod: Math.random() > 0.5 ? 'CASH' : 'CARD',
                    reason: `${randomElement(['Routine', 'Annual', 'Follow-up', 'Emergency', 'Urgent'])} ${randomElement(specializations).toLowerCase()} consultation`,
                }
            });
            appointmentCount++;
        }
        logger.info(`Created ${appointmentCount} appointments`);
        
        logger.info('Creating CRM tasks...');
        const crmStatuses = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
        const crmPriorities = ['LOW', 'MEDIUM', 'HIGH'];
        const taskTitles = [
            'Follow up with patient', 'Send prescription', 'Update medical records',
            'Review lab results', 'Schedule follow-up', 'Call patient for confirmation',
            'Process insurance claim', 'Send referral to specialist', 'Order medical supplies',
            'Complete discharge summary', 'Verify insurance coverage', 'Update patient portal'
        ];
        
        for (let i = 0; i < 30; i++) {
            await prisma.crmTask.create({
                data: {
                    title: `Task ${i + 1}: ${randomElement(taskTitles)}`,
                    description: `Description for CRM task ${i + 1}`,
                    status: randomElement(crmStatuses) as any,
                    priority: randomElement(crmPriorities) as any,
                    dueDate: new Date(Date.now() + randomInt(-5, 14) * 24 * 60 * 60 * 1000),
                    organizationId: organizationId,
                }
            });
        }
        logger.info('Created 30 CRM tasks');
        
        logger.info('Creating prescriptions...');
        const medicineList = [
            { name: 'Panadol', dosage: '500mg', frequency: 'Twice daily' },
            { name: 'Amoxicillin', dosage: '250mg', frequency: 'Three times daily' },
            { name: 'Vitamin C', dosage: '1000mg', frequency: 'Once daily' },
            { name: 'Ibuprofen', dosage: '400mg', frequency: 'As needed' },
            { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily' },
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
            { name: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily' },
            { name: 'Lisinopril', dosage: '5mg', frequency: 'Once daily' },
        ];
        
        for (let i = 0; i < 30; i++) {
            const doctor = randomElement(doctors);
            const patient = randomElement(patients);
            const meds = [randomElement(medicineList), Math.random() > 0.5 ? randomElement(medicineList) : null].filter(Boolean);
            
            await prisma.prescription.create({
                data: {
                    patientId: patient.id,
                    doctorId: doctor.id,
                    organizationId: organizationId,
                    notes: `Prescription ${i + 1} - Take medication as directed`,
                    medicines: JSON.stringify(meds),
                }
            });
        }
        logger.info('Created 30 prescriptions');
        
        logger.info('Creating referrals...');
        for (let i = 0; i < 30; i++) {
            const patient = randomElement(patients);
            await prisma.referral.create({
                data: {
                    patientId: patient.id,
                    organizationId: organizationId,
                    type: randomElement(['PHARMACY', 'LAB', 'RADIOLOGY'] as const),
                    status: randomElement(['PENDING', 'SENT', 'COMPLETED', 'EXPIRED'] as const),
                    notes: `Referral for ${randomElement(specializations)} consultation`,
                }
            });
        }
        logger.info('Created 30 referrals');
        
        logger.info('Creating patient records...');
        for (let i = 0; i < 200; i++) {
            const doctor = randomElement(doctors);
            const patient = randomElement(patients);
            await prisma.patientRecord.create({
                data: {
                    patientId: patient.id,
                    doctorId: doctor.id,
                    organizationId: organizationId,
                    visitDate: new Date(Date.now() - randomInt(0, 90) * 24 * 60 * 60 * 1000),
                    chiefComplaint: randomElement(['Flu', 'Headache', 'Back pain', 'Annual checkup', 'Follow-up', 'Chest pain', 'Diabetes check', 'Skin rash', 'High blood pressure', 'Fatigue']),
                    diagnosis: randomElement(['Viral infection', 'Migraine', 'Muscle strain', 'Healthy', 'Recovering', 'Hypertension', 'Type 2 Diabetes', 'Allergic dermatitis', 'GERD', 'Anemia']),
                    notes: `Patient notes for visit ${i + 1}`,
                    vitalSigns: JSON.stringify({
                        bloodPressure: `${randomInt(110, 140)}/${randomInt(70, 90)}`,
                        heartRate: randomInt(60, 100),
                        temperature: Number((36.5 + Math.random() * 1.5).toFixed(1)),
                        weight: randomInt(50, 100)
                    }),
                }
            });
        }
        logger.info('Created 200 patient records');
        
        logger.info('Creating 5 pharmacies...');
        const usedPharmacyNames = new Set<string>();
        for (let i = 0; i < 5; i++) {
            let name: string;
            do {
                name = randomElement(pharmacyNames);
            } while (usedPharmacyNames.has(name));
            usedPharmacyNames.add(name);
            
            await prisma.pharmacy.create({
                data: {
                    name,
                    email: `pharmacy${i + 1}@tabibi.com`,
                    phone: `01${randomInt(100000000, 999999999)}`,
                    address: `${randomInt(1, 200)} ${randomElement(['Main St', 'El-Tahrir St', 'El-Nile St', 'Mohandseen Ave', 'Corniche Rd'])}`,
                    city: randomElement(cities),
                    isActive: true,
                    organizationId: organizationId,
                }
            });
        }
        logger.info('Created 5 pharmacies');
        
        logger.info('Creating 5 labs...');
        const usedLabNames = new Set<string>();
        for (let i = 0; i < 5; i++) {
            let name: string;
            do {
                name = randomElement(labNames);
            } while (usedLabNames.has(name));
            usedLabNames.add(name);
            
            await prisma.lab.create({
                data: {
                    name,
                    email: `lab${i + 1}@tabibi.com`,
                    phone: `01${randomInt(100000000, 999999999)}`,
                    address: `${randomInt(1, 200)} ${randomElement(['Main St', 'El-Tahrir St', 'El-Nile St', 'Mohandseen Ave', 'Corniche Rd'])}`,
                    city: randomElement(cities),
                    isActive: true,
                    organizationId: organizationId,
                }
            });
        }
        logger.info('Created 5 labs');
        
        logger.info('===========================================');
        logger.info('SEED COMPLETED SUCCESSFULLY!');
        logger.info('===========================================');
        logger.info('Test Accounts:');
        logger.info(`  Owner:        owner@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Admin:        admin@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Receptionist: receptionist@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Patient:      patient@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Doctors:      doctor001@tabibi.com - doctor300@tabibi.com / ${TEST_PASSWORD}`);
        logger.info(`  Patients:     patient001@tabibi.com - patient049@tabibi.com / ${TEST_PASSWORD}`);
        logger.info('===========================================');
        
    } catch (error) {
        logger.error({ error }, 'Seed failed');
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seed();