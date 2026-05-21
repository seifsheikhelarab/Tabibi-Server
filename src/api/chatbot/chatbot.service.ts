import { getGemini } from '../../config/integrations.config.js';
import prisma from '../../config/prisma.config.js';
import { ConfigurationError } from '../../utils/response.util.js';
import logger from '../../utils/logger.util.js';

export class ChatbotService {
    async chat(
        message: string,
        imageBuffer?: Buffer,
        imageMimeType?: string,
        userId?: string,
        organizationId?: string
    ) {
        const allDoctors = await prisma.doctor.findMany({
            where: { isAvailable: true },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                qualification: true,
                experience: true,
                fees: true,
                image: true,
                isAvailable: true
            }
        });

        const specialities = [...new Set(allDoctors.map(doc => doc.specialization))].join(', ');

        let patientContext = '';
        if (userId && organizationId) {
            const patient = await prisma.patient.findFirst({
                where: { userId, organizationId },
                select: {
                    firstName: true,
                    lastName: true,
                    bloodGroup: true,
                    allergies: true,
                    medicalHistory: true,
                    patientRecords: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        select: {
                            diagnosis: true,
                            chiefComplaint: true,
                            notes: true,
                            createdAt: true
                        }
                    }
                }
            });

            if (patient) {
                const recentRecords = patient.patientRecords
                    .map(r => `- ${r.createdAt.toISOString().split('T')[0]}: ${r.chiefComplaint || ''}${r.diagnosis ? ' → ' + r.diagnosis : ''}`)
                    .join('\n');

                patientContext = `
        PATIENT CONTEXT (from their medical profile):
        - Name: ${patient.firstName || ''} ${patient.lastName || ''}
        - Blood Group: ${patient.bloodGroup || 'Not on file'}
        - Allergies: ${patient.allergies || 'None recorded'}
        - Medical History: ${patient.medicalHistory || 'None recorded'}
        ${recentRecords ? `- Recent Visits:\n${recentRecords}` : '- No prior visits recorded'}
        `;
            }
        }

        const gemini = getGemini();

        const prompt = `
        You are a helpful medical assistant for a doctor appointment booking system called "Tabibi".
        
        The user will describe their symptoms or provide medical reports/images. Your job is to:
        1. Empathize with the user briefly.
        2. Based on the symptoms or image provided, SUGGEST the most appropriate medical specialist from this list: [${specialities}].
        3. If the symptoms/report don't match any of our specialists clearly, suggest a "General Physician".
        4. Provide a very brief advice / precaution.
        5. IF AN IMAGE/REPORT IS PROVIDED: Analyze it and give a brief, non-conclusive summary of what it shows, while emphasizing that you are an AI and they should see a doctor for a professional diagnosis.
        ${patientContext ? `6. The patient's medical profile and history are provided below. Use these to personalize your advice and recommendations.\n        ${patientContext}` : ''}
        
        Available Doctors context (for your reference, do not list them all unless relevant):
        ${JSON.stringify(allDoctors)}

        User Message: "${message || 'Please analyze this image.'}"

        Format your response as a JSON object with this structure:
        {
            "reply": "Your friendly text response to the user here...",
            "recommendedSpeciality": "The exact speciality string from the list above"
        }
        Do not include markdown formatting in the response, just the raw JSON.
        `;

        let parsedResponse;

        try {
            if (process.env.NODE_ENV === 'test' || !gemini) {
                parsedResponse = {
                    reply: "Hello! Based on the symptom details you've shared, I suggest connecting with a certified specialist to assess this properly. Here are some of our top recommended doctors who can help you.",
                    recommendedSpeciality: "General Physician"
                };
            } else {
                const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
                let result;

                if (imageBuffer && imageMimeType) {
                    const imagePart = {
                        inlineData: {
                            data: imageBuffer.toString('base64'),
                            mimeType: imageMimeType
                        }
                    };
                    result = await model.generateContent([prompt, imagePart]);
                } else {
                    result = await model.generateContent(prompt);
                }

                const responseText = result.response.text();
                const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedResponse = JSON.parse(cleanText);
            }
        } catch (e: any) {
            logger.warn('Gemini API query failed or rate-limited. Falling back gracefully: ' + e.message);
            parsedResponse = {
                reply: "I understand you are experiencing symptoms. To ensure your absolute comfort and safety, I highly recommend scheduling a consultation with a General Physician or a matching specialist from our directory.",
                recommendedSpeciality: 'General Physician'
            };
        }

        const recommendedDoctors = await prisma.doctor.findMany({
            where: {
                specialization: parsedResponse.recommendedSpeciality || 'General Physician',
                isAvailable: true
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                qualification: true,
                experience: true,
                fees: true,
                image: true,
                bio: true
            }
        });

        return {
            reply: parsedResponse.reply,
            doctors: recommendedDoctors
        };
    }
}

export const chatbotService = new ChatbotService();