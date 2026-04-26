import prisma from '../../config/prisma.config.js';
import type {
    CreatePatientInput,
    UpdatePatientInput,
    PatientQueryInput
} from './patient.schemas.js';
import logger from '../../utils/logger.util.js';

export class PatientService {
    async create(data: CreatePatientInput & { userId: string }) {
        const { userId, dateOfBirth, firstName, lastName, email, phone, gender, address, city, state, pincode, bloodGroup, allergies, medicalHistory, image } = data;
        
        logger.info({
            message: 'Creating patient',
            userId,
            firstName
        });
        
        const patient = await prisma.patient.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                gender: gender as any,
                address,
                city,
                state,
                pincode,
                bloodGroup,
                allergies,
                medicalHistory,
                image,
                userId
            }
        });
        
        logger.info({ message: 'Patient created', patientId: patient.id });
        return patient;
    }

    async findAll(query: PatientQueryInput) {
        const { page, limit, search, doctorId } = query;
        const skip = (page - 1) * limit;

        const where = {
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } }
                ]
            }),
            ...(doctorId && {
                appointments: {
                    some: {
                        doctorId
                    }
                }
            })
        };

        const [patients, total] = await Promise.all([
            prisma.patient.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, email: true, image: true }
                    }
                }
            }),
            prisma.patient.count({ where })
        ]);

        logger.debug({
            message: 'Patients fetched',
            count: patients.length,
            total
        });

        return {
            data: patients,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findById(id: string) {
        return prisma.patient.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, email: true, image: true }
                },
                appointments: {
                    take: 10,
                    orderBy: { appointmentDate: 'desc' }
                },
                prescriptions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    }

    async findByUserId(userId: string) {
        return prisma.patient.findFirst({
            where: { userId }
        });
    }

    async update(id: string, data: UpdatePatientInput) {
        logger.info({ message: 'Updating patient', patientId: id });
        
        const genderMap: Record<string, string> = {
            male: 'MALE', female: 'FEMALE', other: 'OTHER'
        };
        
        const patient = await prisma.patient.update({
            where: { id },
            data: {
                ...data,
                gender: data.gender ? (genderMap[data.gender.toLowerCase()] || data.gender) : undefined,
                dateOfBirth: data.dateOfBirth
                    ? new Date(data.dateOfBirth)
                    : undefined
            }
        });
        
        logger.info({ message: 'Patient updated', patientId: id });
        return patient;
    }

    async delete(id: string) {
        logger.warn({ message: 'Deleting patient', patientId: id });
        
        await prisma.patient.delete({ where: { id } });
        
        logger.warn({ message: 'Patient deleted', patientId: id });
    }
}

export const patientService = new PatientService();
