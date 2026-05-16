import { PrismaClient } from '@prisma/client';
/**
 * Single Prisma client for the modular monolith. Instantiate once per process.
 */
export const prisma = new PrismaClient();
