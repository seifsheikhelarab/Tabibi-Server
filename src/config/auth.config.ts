import { betterAuth } from 'better-auth';
import { organization, customSession, bearer } from 'better-auth/plugins';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import prisma from './prisma.config.js';

function generateSlug(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${base}-${random}`;
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    trustedOrigins: [
        'http://localhost:5173',
        'http://localhost:5174', 
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'https://tabibi-client.vercel.app',
        'https://tabibi-admin.vercel.app',
        'https://tabibi-server.vercel.app'
    ],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false
    },
    socialProviders: {
        google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET
            }
            : undefined
    },
    session: {
            cookieCache: {
                enabled: true,
                maxAge: 5 * 60 * 60 * 24
        }
    },
    advanced: {
            disableCSRFCheck: true,
        },
    plugins: [
        bearer(),
        organization({
            allowUserToCreateOrganization: true,
            organizationLimit: 10,
            membershipLimit: 100,
            invitationExpiresIn: 60 * 60 * 24 * 7,
            accessControl: {
                enabled: false
            }
        }),
        customSession(async ({ user, session }) => {
            const membership = await prisma.member.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' }
            });

            return {
                user,
                session,
                activeOrganizationId: membership?.organizationId || null
            };
        })
    ],
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    const orgSlug = generateSlug(user.name || user.email?.split('@')[0] || 'user');
                    
                    const org = await prisma.organization.create({
                        data: {
                            name: user.name || `${user.email.split('@')[0]}'s Clinic`,
                            slug: orgSlug
                        }
                    });

                    await prisma.member.create({
                        data: {
                            userId: user.id,
                            organizationId: org.id,
                            role: 'OWNER'
                        }
                    });
                }
            }
        },
        session: {
            create: {
                before: async (session) => {
                    const membership = await prisma.member.findFirst({
                        where: { userId: session.userId },
                        orderBy: { createdAt: 'asc' }
                    });

                    if (!membership) {
                        return { data: session };
                    }

                    return {
                        data: {
                            ...session,
                            activeOrganizationId: membership.organizationId
                        }
                    };
                }
            }
        }
    }
});

export type Auth = typeof auth;