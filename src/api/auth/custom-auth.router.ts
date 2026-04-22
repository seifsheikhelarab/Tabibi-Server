import { Router } from 'express';
import { auth } from '../../config/auth.config.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { ResponseHandler, ErrorCode } from '../../utils/response.util.js';
import prisma from '../../config/prisma.config.js';
import { fromNodeHeaders } from 'better-auth/node';
import { OrganizationRole } from '../../generated/prisma/index.js';

const router = Router();

router.post('/sign-in/email', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return ResponseHandler.error(res, 'Email and password are required', ErrorCode.VALIDATION_ERROR, 400);
    }

    try {
        const signInResult = await auth.api.signInEmail({
            body: { email, password }
        });

        if (!signInResult) {
            return ResponseHandler.error(res, 'Invalid credentials', ErrorCode.INVALID_CREDENTIALS, 401);
        }

        const activeOrgId = (signInResult as any).session?.activeOrganizationId;
        
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    include: { organization: true }
                }
            }
        });

        if (!user) {
            return ResponseHandler.error(res, 'User not found', ErrorCode.USER_NOT_FOUND, 401);
        }

        // Find membership for active org, or first membership
        let membership = user.memberships.find(m => m.organizationId === activeOrgId) || user.memberships[0];
        const role = membership?.role || 'MEMBER';

        return ResponseHandler.success(res, {
            success: true,
            token: (signInResult as any)?.token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image
            },
            role,
            organizationId: membership?.organizationId || null,
            organization: membership?.organization ? {
                id: membership.organization.id,
                name: membership.organization.name
            } : null
        });

    } catch (err) {
        return ResponseHandler.error(res, 'Invalid credentials', ErrorCode.INVALID_CREDENTIALS, 401);
    }
}));

router.post('/sign-up/email', asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return ResponseHandler.error(res, 'Email, password, and name are required', ErrorCode.VALIDATION_ERROR, 400);
    }

    try {
        const signUpResult = await auth.api.signUpEmail({
            body: { email, password, name }
        });

        if (!signUpResult) {
            return ResponseHandler.error(res, 'Failed to create account', ErrorCode.SERVER_ERROR, 500);
        }

        const userId = (signUpResult as any)?.user?.id;
        
        if (userId) {
            const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
            
            const organization = await prisma.organization.create({
                data: {
                    name: name + "'s Clinic",
                    slug: slug.slice(0, 50)
                }
            });
            
            await prisma.member.create({
                data: {
                    userId,
                    organizationId: organization.id,
                    role: OrganizationRole.OWNER,
                    active: true
                }
            });
        }

        return ResponseHandler.success(res, {
            success: true,
            message: 'Account created successfully',
            user: {
                id: userId,
                email,
                name
            }
        });

    } catch (err) {
        return ResponseHandler.error(res, 'Failed to create account', ErrorCode.SERVER_ERROR, 500);
    }
}));

router.post('/sign-out', asyncHandler(async (req, res) => {
    const headers = getAuthHeaders(req);
    
    try {
        await auth.api.signOut({
            headers: fromNodeHeaders(headers)
        });
        
        return ResponseHandler.success(res, {
            success: true,
            message: 'Signed out successfully'
        });
    } catch (err) {
        return ResponseHandler.success(res, {
            success: true,
            message: 'Signed out successfully'
        });
    }
}));

router.get('/get-session', asyncHandler(async (req, res) => {
    const headers = getAuthHeaders(req);

    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(headers)
        });

        if (!session) {
            return ResponseHandler.error(res, 'Not authenticated', ErrorCode.INVALID_TOKEN, 401);
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                memberships: {
                    include: { organization: true }
                }
            }
        });

        const membership = user?.memberships[0];
        const role = membership?.role || 'MEMBER';

        return ResponseHandler.success(res, {
            success: true,
            session: {
                token: session.session?.token,
                expiresAt: session.session?.expiresAt
            },
            user: {
                id: user?.id,
                name: user?.name,
                email: user?.email,
                image: user?.image
            },
            role,
            organizationId: membership?.organizationId || null
        });

    } catch (err) {
        return ResponseHandler.error(res, 'Not authenticated', ErrorCode.INVALID_TOKEN, 401);
    }
}));

function getAuthHeaders(req: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        headers['authorization'] = authHeader;
    }
    
    const cookieHeader = req.headers.cookie as string;
    if (cookieHeader) {
        headers['cookie'] = cookieHeader;
    }
    
    return headers;
}

export default router;
