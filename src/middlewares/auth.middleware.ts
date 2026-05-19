import { type Request, type Response, type NextFunction } from 'express';
import { auth } from '../config/auth.config.js';
import { AuthenticationError, AuthorizationError } from '../errors/index.js';
import { asyncHandler } from './error.middleware.js';
import { fromNodeHeaders } from 'better-auth/node';
import prisma from '../config/prisma.config.js';
import logger from '../utils/logger.util.js';
import { OrganizationRole } from '../generated/prisma/index.js';

function prepareAuthHeaders(req: Request): Record<string, string | string[] | undefined> {
    const headers = { ...req.headers };
    
    // Support custom atoken header
    const aToken = headers.atoken as string;
    if (aToken && !headers.authorization) {
        headers.authorization = `Bearer ${aToken}`;
    }
    
    return headers;
}

export interface SessionUser {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
}

export interface SessionData {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    activeOrganizationId?: string | null;
}

export type AuthenticatedRequest = Request & {
    user: SessionUser;
    session: SessionData;
    membership?: unknown;
};

export const protect = asyncHandler<AuthenticatedRequest>(
    async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        // Test environment bypass for manual tokens
        if (process.env.NODE_ENV === 'test') {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer test-')) {
                const token = authHeader.split(' ')[1];
                const session = await prisma.session.findUnique({
                    where: { token },
                    include: { user: true }
                });

                if (session) {
                    req.user = session.user as SessionUser;
                    req.session = session as unknown as SessionData;
                    return next();
                }
            }
        }

        const headers = prepareAuthHeaders(req);
        
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(headers)
        });

        if (!session) {
            // Allow public access to doctor list and details
            const isPublicDoctorRoute = req.method === 'GET' && (req.path === '/api/doctors' || req.path === '/api/doctors/' || /^\/api\/doctors\/[^\/]+$/.test(req.path));
            if (isPublicDoctorRoute) {
                return next();
            }

            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            logger.warn({
                message: 'Authentication failed - invalid session',
                ip,
                path: req.path,
                method: req.method
            });
            throw new AuthenticationError(
                'Authentication required. Please log in.'
            );
        }

        req.user = session.user as SessionUser;
        const headerOrgId = req.headers['x-organization-id'] as string;
        req.session = {
            ...session.session as SessionData,
            activeOrganizationId: (session as any).activeOrganizationId || headerOrgId
        };

        logger.debug({
            message: 'User authenticated successfully',
            userId: req.user.id,
            path: req.path
        });

        next();
    }
);

export const requireActiveOrganization = () => asyncHandler<AuthenticatedRequest>(
    async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        const headerOrgId = req.headers['x-organization-id'] as string;
        const activeOrganizationId = req.session.activeOrganizationId || headerOrgId;

        if (!activeOrganizationId) {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            logger.warn({
                message: 'Authorization failed - no active organization in session',
                userId: req.user.id,
                ip,
                path: req.path
            });
            throw new AuthorizationError(
                'No active organization found in your session. Please select an organization.'
            );
        }

        // Ensure it's populated on req.session for subsequent handlers
        req.session.activeOrganizationId = activeOrganizationId;

        logger.debug({
            message: 'Organization access granted',
            userId: req.user.id,
            organizationId: activeOrganizationId,
            path: req.path
        });

        next();
    }
);

export const requireRole = (...allowedRoles: OrganizationRole[]) => {
    return asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, _res, next) => {
        const activeOrganizationId = req.session.activeOrganizationId;
        
        const membership = await prisma.member.findFirst({
            where: { 
                userId: req.user.id,
                organizationId: activeOrganizationId as string
            }
        });

        if (!membership) {
            throw new AuthorizationError('Organization membership not found');
        }

        if (!allowedRoles.includes(membership.role)) {
            logger.warn({
                message: 'RBAC: Access denied',
                userId: req.user.id,
                userRole: membership.role,
                requiredRoles: allowedRoles,
                path: req.path
            });
            throw new AuthorizationError(
                `Access denied. Required role: ${allowedRoles.join(' or ')}`
            );
        }

        req.membership = membership;
        logger.debug({
            message: 'RBAC: Access granted',
            userId: req.user.id,
            userRole: membership.role,
            path: req.path
        });

        next();
    });
};

export const requireAdmin = () => requireRole(OrganizationRole.OWNER, OrganizationRole.ADMIN);
export const requireOwner = () => requireRole(OrganizationRole.OWNER);
export const requireDoctor = () => requireRole(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.DOCTOR);
export const requireReceptionist = () => requireRole(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.RECEPTIONIST);
export const requireMember = () => requireRole(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.DOCTOR, OrganizationRole.RECEPTIONIST, OrganizationRole.MEMBER);
