import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env.config.js';

let prisma: PrismaClient;

declare global {
    var prismaInstance: typeof prisma | undefined;
}

export const pool = new Pool({
    connectionString: env.databaseUrl
});

export const adapter = new PrismaPg(pool);

if (!global.prismaInstance) {
    prisma = new PrismaClient({ adapter });
    global.prismaInstance = prisma;
} else {
    prisma = global.prismaInstance;
}

export default prisma;