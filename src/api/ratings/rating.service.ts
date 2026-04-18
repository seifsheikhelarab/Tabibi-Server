import prisma from '../../config/prisma.config.js';
import type { CreateReviewInput, ReviewQueryInput } from './rating.schemas.js';
import logger from '../../utils/logger.util.js';

export class RatingService {
    async create(data: CreateReviewInput & { organizationId: string; patientId: string }) {
        logger.info({
            message: 'Creating doctor review',
            doctorId: data.doctorId,
            patientId: data.patientId,
            appointmentId: data.appointmentId,
            rating: data.rating
        });

        try {
            // Check if appointment exists and is completed
            const appointment = await prisma.appointment.findUnique({
                where: { id: data.appointmentId }
            });

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            if (appointment.status !== 'COMPLETED') {
                throw new Error('Can only review completed appointments');
            }

            // Check if review already exists
            const existingReview = await prisma.doctorReview.findUnique({
                where: { appointmentId: data.appointmentId }
            });

            if (existingReview) {
                throw new Error('Review already exists for this appointment');
            }

            const review = await prisma.doctorReview.create({
                data: {
                    rating: data.rating,
                    comment: data.comment,
                    doctor: { connect: { id: data.doctorId } },
                    patient: { connect: { id: data.patientId } },
                    appointment: { connect: { id: data.appointmentId } },
                    organization: { connect: { id: data.organizationId } }
                }
            });

            // Update appointment with the rating for quick access
            await prisma.appointment.update({
                where: { id: data.appointmentId },
                data: { rating: data.rating }
            });

            logger.info({ message: 'Review created', reviewId: review.id });
            return review;
        } catch (error) {
            logger.error({ message: 'Failed to create review', error, data });
            throw error;
        }
    }

    async findAll(query: ReviewQueryInput) {
        const { page, limit, doctorId, patientId, organizationId } = query;
        const skip = (page - 1) * limit;

        const where = {
            organizationId,
            ...(doctorId && { doctorId }),
            ...(patientId && { patientId }),
        };

        const [reviews, total] = await Promise.all([
            prisma.doctorReview.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { firstName: true, lastName: true } },
                    doctor: { select: { firstName: true, lastName: true } }
                }
            }),
            prisma.doctorReview.count({ where })
        ]);

        return {
            data: reviews,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async getDoctorAverageRating(doctorId: string) {
        const aggregate = await prisma.doctorReview.aggregate({
            where: { doctorId },
            _avg: { rating: true },
            _count: { rating: true }
        });

        return {
            averageRating: aggregate._avg.rating || 0,
            reviewCount: aggregate._count.rating || 0
        };
    }
}

export const ratingService = new RatingService();
