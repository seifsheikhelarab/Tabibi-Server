import { Router } from 'express';
import { protect, requireActiveOrganization, type AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { ResponseHandler } from '../../utils/response.util.js';
import prisma from '../../config/prisma.config.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

const membersRouter = Router();

membersRouter.get('/me', protect, requireActiveOrganization(), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const activeOrganizationId = req.session.activeOrganizationId;
    
    const membership = await prisma.member.findFirst({
        where: { 
            userId: req.user.id,
            organizationId: activeOrganizationId as string
        },
        include: {
            organization: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true
                }
            }
        }
    });

    if (!membership) {
        return ResponseHandler.success(res, {
            userId: req.user.id,
            role: null,
            organizationId: null,
            organization: null
        });
    }

    return ResponseHandler.success(res, {
        userId: req.user.id,
        role: membership.role,
        organizationId: membership.organizationId,
        organization: membership.organization
    });
}));

membersRouter.get('/', protect, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.query.organizationId as string | undefined;

    const where = organizationId ? { organizationId } : {};

    const members = await prisma.member.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    image: true
                }
            },
            organization: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return ResponseHandler.success(res, { members });
}));

membersRouter.get('/:id', protect, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const member = await prisma.member.findUnique({
        where: { id: req.params.id as string },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    image: true
                }
            },
            organization: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            }
        }
    });

    if (!member) {
        return ResponseHandler.error(res, 'Member not found', 'RESOURCE_NOT_FOUND' as any, 404);
    }

    return ResponseHandler.success(res, { member });
}));

export default membersRouter;
