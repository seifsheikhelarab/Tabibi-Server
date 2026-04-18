import { Router } from 'express';
import patientRouter from './patients/patient.router.js';
import doctorRouter from './doctors/doctor.router.js';
import appointmentRouter from './appointments/appointment.router.js';
import recordRouter from './records/record.router.js';
import prescriptionRouter from './prescriptions/prescription.router.js';
import referralRouter from './referrals/referral.router.js';
import crmRouter from './crm/crm.router.js';
import integrationRouter from './integrations/integration.router.js';
import paymentRouter from './payments/payment.router.js';
import pharmacyRouter from './pharmacies/pharmacy.router.js';
import labRouter from './labs/lab.router.js';
import chatbotRouter from './chatbot/chatbot.router.js';
import uploadRouter from './upload/upload.router.js';
import adminRouter from './admin/admin.router.js';
import adminDoctorRouter from './admin/doctor.router.js';
import ratingRouter from './ratings/rating.router.js';
import membersRouter from './members/members.router.js';
import receptionRouter from './reception/reception.router.js';
import customAuthRouter from './auth/custom-auth.router.js';

const router = Router();

router.use('/auth', customAuthRouter);
router.use('/patients', patientRouter);
router.use('/doctors', doctorRouter);
router.use('/appointments', appointmentRouter);
router.use('/records', recordRouter);
router.use('/prescriptions', prescriptionRouter);
router.use('/referrals', referralRouter);
router.use('/crm', crmRouter);
router.use('/integrations', integrationRouter);
router.use('/payments', paymentRouter);
router.use('/pharmacies', pharmacyRouter);
router.use('/labs', labRouter);
router.use('/chatbot', chatbotRouter);
router.use('/upload', uploadRouter);
router.use('/admin', adminRouter);
router.use('/doctor', adminDoctorRouter);
router.use('/members', membersRouter);
router.use('/reception', receptionRouter);
router.use('/ratings', ratingRouter);

router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;