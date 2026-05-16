import bcrypt from 'bcryptjs';
import { prisma } from './db/prisma';
/** Fixed instant so @@unique([turbineId, date]) stays stable across re-seeds. */
const SEED_INSPECTION_DATE = new Date('2025-01-15T12:00:00.000Z');
async function main() {
    const users = [
        { email: 'admin@example.com', name: 'Admin', role: 'ADMIN', password: 'admin123' },
        { email: 'eng@example.com', name: 'Engineer', role: 'ENGINEER', password: 'engineer123' },
        { email: 'viewer@example.com', name: 'Viewer', role: 'VIEWER', password: 'viewer123' },
    ];
    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        await prisma.user.upsert({
            where: { email: u.email },
            update: {
                passwordHash: hash,
                role: u.role,
                name: u.name,
                disabledAt: null,
            },
            create: { email: u.email, passwordHash: hash, role: u.role, name: u.name },
        });
    }
    const turbine = await prisma.turbine.upsert({
        where: { id: 'seed-turbine' },
        update: {},
        create: {
            id: 'seed-turbine',
            name: 'T-1000',
            manufacturer: 'SkyGen',
            mwRating: 2.5,
            lat: 12.98,
            lng: 77.59,
        },
    });
    await prisma.$transaction(async (tx) => {
        const inspection = await tx.inspection.upsert({
            where: {
                turbineId_date: { turbineId: turbine.id, date: SEED_INSPECTION_DATE },
            },
            update: {},
            create: {
                turbineId: turbine.id,
                date: SEED_INSPECTION_DATE,
                dataSource: 'DRONE',
                inspectorName: 'Seed Bot',
            },
        });
        await tx.finding.deleteMany({ where: { inspectionId: inspection.id } });
        await tx.finding.createMany({
            data: [
                {
                    inspectionId: inspection.id,
                    category: 'BLADE_DAMAGE',
                    severity: 4,
                    estimatedCost: 1200,
                    notes: 'Leading edge crack observed',
                },
                {
                    inspectionId: inspection.id,
                    category: 'EROSION',
                    severity: 2,
                    estimatedCost: 350,
                    notes: 'Surface erosion patch',
                },
            ],
        });
    });
    console.log('Seeded users, turbine:', turbine.name, 'and sample inspection/findings.');
}
main().finally(() => prisma.$disconnect());
