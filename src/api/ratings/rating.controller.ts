import type { Request, Response } from 'express';
import { ratingService } from './rating.service.js';
import { CreateReviewSchema, ReviewQuerySchema } from './rating.schemas.js';
import logger from '../../utils/logger.util.js';

export class RatingController {
    async create(req: Request, res: Response) {
        try {
            const validatedData = CreateReviewSchema.parse(req.body);
            const { organizationId } = (req as any).session;
            
            // In a real scenario, we'd get the patientId associated with the logged-in user
            const patient = await (req as any).prisma.patient.findUnique({
                where: { userId_organizationId: { userId: (req as any).session.userId, organizationId } }
            });

            if (!patient) {
                return res.status(403).json({ error: 'User is not registered as a patient in this organization' });
            }

            const review = await ratingService.create({
                ...validatedData,
                organizationId,
                patientId: patient.id
            });

            return res.status(201).json(review);
        } catch (error: any) {
            logger.error({ message: 'Controller: Failed to create review', error: error.message });
            return res.status(400).json({ error: error.message });
        }
    }

    async getDoctorReviews(req: Request, res: Response) {
        try {
            const doctorId = req.params.doctorId as string;
            const query = ReviewQuerySchema.parse({
                ...req.query,
                doctorId,
                organizationId: (req as any).session.organizationId
            });

            const result = await ratingService.findAll(query);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getDoctorStats(req: Request, res: Response) {
        try {
            const stats = await ratingService.getDoctorAverageRating(req.params.doctorId as string);
            return res.json(stats);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}

export const ratingController = new RatingController();
