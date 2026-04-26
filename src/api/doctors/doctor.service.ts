import prisma from '../../config/prisma.config.js';
import type {
    CreateDoctorInput,
    UpdateDoctorInput,
    DoctorQueryInput,
    AvailabilityInput
} from './doctor.schemas.js';
import logger from '../../utils/logger.util.js';

export class DoctorService {
    async create(data: CreateDoctorInput & { userId: string; organizationId: string }) {
        logger.info({
            message: 'Creating doctor',
            organizationId: data.organizationId,
            firstName: data.firstName,
            specialization: data.specialization
        });
        
        const doctor = await prisma.doctor.create({
            data: {
                ...data,
                fees: data.fees ? data.fees : undefined
            }
        });
        
        logger.info({ message: 'Doctor created', doctorId: doctor.id });
        return doctor;
    }

    async findAll(query: DoctorQueryInput) {
        const { page, limit, search, specialization, organizationId, isAvailable, allowPublic, city, maxFees } = query;
        const skip = (page - 1) * limit;

        const where = allowPublic
            ? {
                ...(isAvailable !== undefined && { isAvailable }),
                ...(specialization && { specialization }),
                ...(maxFees && { fees: { lte: maxFees } }),
                ...(search && {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' as const } },
                        { lastName: { contains: search, mode: 'insensitive' as const } },
                        { specialization: { contains: search, mode: 'insensitive' as const } },
                        { bio: { contains: search, mode: 'insensitive' as const } }
                    ]
                })
            }
            : {
                ...(organizationId && { organizationId }),
                ...(specialization && { specialization }),
                ...(isAvailable !== undefined && { isAvailable }),
                ...(maxFees && { fees: { lte: maxFees } }),
                ...(search && {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' as const } },
                        { lastName: { contains: search, mode: 'insensitive' as const } },
                        { email: { contains: search, mode: 'insensitive' as const } }
                    ]
                })
            };

        const [doctors, total] = await Promise.all([
            prisma.doctor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, image: true } },
                    reviews: {
                        select: { rating: true }
                    }
                }
            }),
            prisma.doctor.count({ where })
        ]);

        logger.debug({
            message: 'Doctors fetched',
            count: doctors.length,
            total,
            organizationId
        });

        return {
            data: doctors.map(d => {
                const numRatings = d.reviews.length;
                const totalRating = d.reviews.reduce((acc, r) => acc + r.rating, 0);
                
                return {
                    id: d.id,
                    firstName: d.firstName,
                    lastName: d.lastName,
                    name: `${d.firstName} ${d.lastName || ''}`.trim(),
                    email: d.email,
                    phone: d.phone,
                    specialization: d.specialization,
                    qualification: d.qualification,
                    experience: d.experience,
                    fees: d.fees,
                    bio: d.bio,
                    image: d.image || d.user?.image || null,
                    available: d.isAvailable,
                    isAvailable: d.isAvailable,
                    location: "Location not listed",
                    city: "",
                    address: "",
                    createdAt: d.createdAt,
                    rating: totalRating,
                    numRatings: numRatings
                };
            }),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async findById(id: string) {
        const doc = await prisma.doctor.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, image: true } },
                availabilities: { include: { slots: true } },
                reviews: {
                    include: {
                        patient: { select: { firstName: true, lastName: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                _count: { select: { appointments: true, patientRecords: true, reviews: true } }
            }
        });

        if (!doc) return null;

        const aggregate = await prisma.doctorReview.aggregate({
            where: { doctorId: id },
            _sum: { rating: true }
        });

        return {
            ...doc,
            name: `${doc.firstName} ${doc.lastName || ''}`.trim(),
            available: doc.isAvailable,
            location: "Location not listed",
            degree: doc.qualification,
            about: doc.bio,
            rating: aggregate._sum.rating || 0,
            numRatings: doc._count.reviews
        };
    }

    async findByUserId(userId: string, organizationId: string) {
        return prisma.doctor.findFirst({ where: { userId, organizationId } });
    }

    async update(id: string, data: UpdateDoctorInput) {
        logger.info({ message: 'Updating doctor', doctorId: id });
        
        const doctor = await prisma.doctor.update({ where: { id }, data });
        
        logger.info({ message: 'Doctor updated', doctorId: id });
        return doctor;
    }

    async delete(id: string) {
        logger.warn({ message: 'Deleting doctor', doctorId: id });
        
        await prisma.doctor.delete({ where: { id } });
        
        logger.warn({ message: 'Doctor deleted', doctorId: id });
    }

    async setAvailability(doctorId: string, data: AvailabilityInput) {
        logger.info({
            message: 'Setting doctor availability',
            doctorId,
            dayOfWeek: data.dayOfWeek
        });
        
        // Check if availability for this day already exists
        const existing = await prisma.doctorAvailability.findFirst({
            where: { doctorId, dayOfWeek: data.dayOfWeek }
        });

        if (existing) {
            return prisma.doctorAvailability.update({
                where: { id: existing.id },
                data: {
                    startTime: data.startTime,
                    endTime: data.endTime,
                    isActive: data.isActive
                }
            });
        }

        return prisma.doctorAvailability.create({
            data: { ...data, doctorId }
        });
    }

    async getAvailability(doctorId: string) {
        return prisma.doctorAvailability.findMany({
            where: { doctorId },
            include: { slots: true },
            orderBy: { dayOfWeek: 'asc' }
        });
    }
}

export const doctorService = new DoctorService();
