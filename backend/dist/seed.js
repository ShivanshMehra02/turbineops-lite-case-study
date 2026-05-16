import bcrypt from 'bcryptjs';
import { prisma } from './db/prisma';
async function main() {
    // users
    const users = [
        { email: 'admin@example.com', name: 'Admin', role: 'ADMIN', password: 'admin123' },
        { email: 'eng@example.com', name: 'Engineer', role: 'ENGINEER', password: 'engineer123' },
        { email: 'viewer@example.com', name: 'Viewer', role: 'VIEWER', password: 'viewer123' },
    ];
    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash: hash, role: u.role, name: u.name },
            create: { email: u.email, passwordHash: hash, role: u.role, name: u.name },
        });
    }
    // sample turbine
    const t = await prisma.turbine.upsert({
        where: { id: 'seed-turbine' },
        update: {},
        create: { id: 'seed-turbine', name: 'T-1000', manufacturer: 'SkyGen', mwRating: 2.5, lat: 12.98, lng: 77.59 },
    });
    console.log('Seeded. Turbine:', t.name);
}
main().finally(() => prisma.$disconnect());
