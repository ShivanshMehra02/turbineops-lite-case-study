// src/seed.ts
import bcrypt from "bcryptjs";

// src/db/prisma.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();

// src/utils/inspection-day.ts
function toUtcInspectionCalendarDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

// src/seed.ts
var SEED_INSPECTION_DATE = /* @__PURE__ */ new Date("2025-01-15T12:00:00.000Z");
async function main() {
  const users = [
    { email: "admin@example.com", name: "Admin", role: "ADMIN", password: "admin123" },
    { email: "eng@example.com", name: "Engineer", role: "ENGINEER", password: "engineer123" },
    { email: "viewer@example.com", name: "Viewer", role: "VIEWER", password: "viewer123" }
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hash,
        role: u.role,
        name: u.name,
        disabledAt: null
      },
      create: { email: u.email, passwordHash: hash, role: u.role, name: u.name }
    });
  }
  const turbine = await prisma.turbine.upsert({
    where: { id: "seed-turbine" },
    update: {},
    create: {
      id: "seed-turbine",
      name: "T-1000",
      manufacturer: "SkyGen",
      mwRating: 2.5,
      lat: 12.98,
      lng: 77.59
    }
  });
  await prisma.$transaction(async (tx) => {
    const inspectionDay = toUtcInspectionCalendarDate(SEED_INSPECTION_DATE);
    const inspection = await tx.inspection.upsert({
      where: {
        turbineId_inspectionDay: {
          turbineId: turbine.id,
          inspectionDay
        }
      },
      update: {
        date: SEED_INSPECTION_DATE,
        dataSource: "DRONE",
        inspectorName: "Seed Bot"
      },
      create: {
        turbineId: turbine.id,
        date: SEED_INSPECTION_DATE,
        inspectionDay,
        dataSource: "DRONE",
        inspectorName: "Seed Bot"
      }
    });
    await tx.finding.deleteMany({ where: { inspectionId: inspection.id } });
    await tx.finding.createMany({
      data: [
        {
          inspectionId: inspection.id,
          category: "BLADE_DAMAGE",
          severity: 4,
          estimatedCost: 1200,
          notes: "Leading edge crack observed"
        },
        {
          inspectionId: inspection.id,
          category: "EROSION",
          severity: 2,
          estimatedCost: 350,
          notes: "Surface erosion patch"
        }
      ]
    });
  });
  console.log("Seeded users, turbine:", turbine.name, "and sample inspection/findings.");
}
main().finally(() => prisma.$disconnect());
