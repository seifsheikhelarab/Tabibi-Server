import { getGemini } from '../../config/integrations.config.js';
import prisma from '../../config/prisma.config.js';
import { ConfigurationError } from '../../utils/response.util.js';

export class ChatbotService {
    async chat(message: string, imageBuffer?: Buffer, imageMimeType?: string) {
        const doctors = await prisma.doctor.findMany({
            where: { isAvailable: true },
            select: {
                firstName: true,
                lastName: true,
                specialization: true,
                isAvailable: true
            },
            take: 10
        });

        const specialities = [...new Set(doctors.map(doc => doc.specialization))].join(', ');

        const gemini = getGemini();
        if (!gemini) {
            throw new ConfigurationError('Gemini AI not configured');
        }

        const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
        You are a helpful medical assistant for a doctor appointment booking system called "Tabibi".
        
        The user will describe their symptoms or provide medical reports/images. Your job is to:
        1. Empathize with the user briefly.
        2. Based on the symptoms or image provided, SUGGEST the most appropriate medical specialist from this list: [${specialities}].
        3. If the symptoms/report don't match any of our specialists clearly, suggest a "General Physician".
        4. Provide a very brief advice / precaution.
        5. IF AN IMAGE/REPORT IS PROVIDED: Analyze it and give a brief, non-conclusive summary of what it shows, while emphasizing that you are an AI and they should see a doctor for a professional diagnosis.
        
        Available Doctors context (for your reference, do not list them all unless relevant):
        ${JSON.stringify(doctors)}

        User Message: "${message || 'Please analyze this image.'}"

        Format your response as a JSON object with this structure:
        {
            "reply": "Your friendly text response to the user here...",
            "recommendedSpeciality": "The exact speciality string from the list above"
        }
        Do not include markdown formatting in the response, just the raw JSON.
        `;

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

        let parsedResponse;
        try {
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedResponse = JSON.parse(cleanText);
        } catch (e) {
            parsedResponse = {
                reply: responseText,
                recommendedSpeciality: 'General Physician'
            };
        }

        const recommendedDoctors = await prisma.doctor.findMany({
            where: {
                specialization: parsedResponse.recommendedSpeciality,
                isAvailable: true
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                experience: true,
                fees: true,
                image: true
            }
        });

        return {
            reply: parsedResponse.reply,
            doctors: recommendedDoctors
        };
    }
}

export const chatbotService = new ChatbotService();