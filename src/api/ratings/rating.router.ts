import { Router } from 'express';
import { ratingController } from './rating.controller.js';
import { protect, requireActiveOrganization } from '../../middlewares/auth.middleware.js';

const router = Router();

// Publicly viewable stats/reviews for doctors (within org context)
router.get('/doctor/:doctorId/stats', protect, requireActiveOrganization(), ratingController.getDoctorStats);
router.get('/doctor/:doctorId', protect, requireActiveOrganization(), ratingController.getDoctorReviews);

// Patients can submit reviews
router.post('/', protect, requireActiveOrganization(), ratingController.create);

export default router;
