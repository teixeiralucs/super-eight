import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_URL } from '$env/static/private';
import { dev } from '$app/environment';
import { PrismaClient } from './generated/prisma/client';

const createClient = () =>
	new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

// Reaproveita a instância entre reloads do Vite em dev para não esgotar conexões.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (dev) globalForPrisma.prisma = prisma;
