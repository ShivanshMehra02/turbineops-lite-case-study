// src/main.ts
import "dotenv/config";
import http from "node:http";

// src/app.ts
import express from "express";
import cors from "cors";
import { readFileSync as readFileSync2 } from "fs";
import path2 from "path";
import swaggerUi from "swagger-ui-express";
import yaml from "yaml";

// src/graphql/apollo.ts
import { ApolloServer } from "apollo-server-express";
import { GraphQLError as GraphQLError4 } from "graphql";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// src/db/prisma.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();

// src/graphql/http-mapper.ts
import { GraphQLError } from "graphql";

// src/utils/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "HttpError";
  }
};
function isHttpError(err) {
  return err instanceof HttpError;
}

// src/graphql/http-mapper.ts
async function gqlFromService(fn) {
  try {
    return await fn();
  } catch (e) {
    if (isHttpError(e)) {
      throw httpErrorToGraphQL(e);
    }
    throw e;
  }
}
function httpErrorToGraphQL(err) {
  return new GraphQLError(err.message, {
    extensions: {
      code: err.code ?? `HTTP_${err.statusCode}`,
      httpStatus: err.statusCode,
      ...process.env.NODE_ENV === "development" && err.details !== void 0 ? { details: err.details } : {}
    }
  });
}

// src/graphql/parse-graphql-input.ts
import { GraphQLError as GraphQLError2 } from "graphql";
function parseGraphQLInput(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw new GraphQLError2("Invalid input", {
      extensions: { code: "BAD_USER_INPUT", details: result.error.flatten() }
    });
  }
  return result.data;
}

// src/graphql/guards.ts
import { GraphQLError as GraphQLError3 } from "graphql";

// src/modules/auth/rbac.ts
function roleAllowsPermission(role, permission) {
  switch (permission) {
    case "read":
      return role === "VIEWER" || role === "ENGINEER" || role === "ADMIN";
    case "write":
      return role === "ENGINEER" || role === "ADMIN";
    case "admin":
      return role === "ADMIN";
    default:
      return false;
  }
}

// src/graphql/guards.ts
function ensurePermission(ctx, permission) {
  if (!ctx.authUser) {
    throw new GraphQLError3("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" }
    });
  }
  if (!roleAllowsPermission(ctx.authUser.role, permission)) {
    throw new GraphQLError3("Forbidden", { extensions: { code: "FORBIDDEN" } });
  }
  return ctx.authUser;
}

// src/services/repair-plan.service.ts
import { Prisma } from "@prisma/client";

// src/utils/repair-plan-logic.ts
function priorityFromMaxSeverity(maxSeverity) {
  if (maxSeverity >= 5) return "HIGH";
  if (maxSeverity >= 3) return "MEDIUM";
  return "LOW";
}
function computeTotalEstimatedCost(findings) {
  return findings.reduce((sum, f) => sum + Number(f.estimatedCost ?? 0), 0);
}
function buildRepairPlanSummary(findings) {
  const findingCount = findings.length;
  const totalEstimatedCost = computeTotalEstimatedCost(findings);
  const maxSeverity = findingCount === 0 ? 0 : Math.max(...findings.map((f) => f.severity));
  const countsByCategory = {};
  for (const f of findings) {
    countsByCategory[f.category] = (countsByCategory[f.category] ?? 0) + 1;
  }
  const topCategories = Object.entries(countsByCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, n]) => `${n}\xD7 ${cat}`).join(", ");
  const text = findingCount === 0 ? "No findings \u2014 empty repair scope." : `${findingCount} finding(s); max severity ${maxSeverity}; total est. cost ${totalEstimatedCost.toFixed(2)}. Categories: ${topCategories || "n/a"}.`;
  return {
    text,
    findingCount,
    maxSeverity,
    countsByCategory,
    totalEstimatedCost
  };
}
function serializeFindingsForSnapshot(findings) {
  return findings.map((f) => ({
    id: f.id,
    category: f.category,
    severity: f.severity,
    estimatedCost: f.estimatedCost,
    notes: f.notes
  }));
}
function buildRepairPlanSnapshotV1(findings) {
  return {
    version: 1,
    summary: buildRepairPlanSummary(findings),
    findings: serializeFindingsForSnapshot(findings)
  };
}
function parseRepairPlanSnapshot(snapshotJson) {
  if (!snapshotJson || typeof snapshotJson !== "object") return null;
  const o = snapshotJson;
  if (o.version !== 1 || typeof o.summary !== "object" || !Array.isArray(o.findings)) return null;
  return snapshotJson;
}

// src/services/repair-plan.service.ts
var MONGO_AUDIT_COLLECTION = "repair_plan_audit";
async function appendRepairPlanMongoAudit(deps, doc) {
  try {
    if (!deps.mongoClient) return;
    await deps.mongoClient.db(deps.mongoDbName).collection(MONGO_AUDIT_COLLECTION).insertOne({
      ...doc,
      recordedAt: /* @__PURE__ */ new Date()
    });
  } catch {
  }
}
async function findRepairPlanByInspectionId(db, inspectionId) {
  return db.repairPlan.findUnique({ where: { inspectionId } });
}
async function getRepairPlanByInspectionId(db, inspectionId) {
  const row = await findRepairPlanByInspectionId(db, inspectionId);
  if (!row) throw new HttpError(404, "Repair plan not found for this inspection", "NOT_FOUND");
  return row;
}
function repairPlanPresentation(plan) {
  const parsed = parseRepairPlanSnapshot(plan.snapshotJson);
  if (!parsed) {
    return {
      summaryText: "Legacy repair plan snapshot (pre-versioned format).",
      findingCount: null,
      maxSeverity: null
    };
  }
  return {
    summaryText: parsed.summary.text,
    findingCount: parsed.summary.findingCount,
    maxSeverity: parsed.summary.maxSeverity
  };
}
async function generateRepairPlanForInspection(db, inspectionId, deps) {
  const inspection = await db.inspection.findUnique({
    where: { id: inspectionId },
    include: { findings: true }
  });
  if (!inspection) throw new HttpError(404, "Inspection not found", "NOT_FOUND");
  const snapshot = buildRepairPlanSnapshotV1(inspection.findings);
  const priority = priorityFromMaxSeverity(snapshot.summary.maxSeverity);
  const totalEstimatedCost = snapshot.summary.totalEstimatedCost;
  const jsonSnapshot = snapshot;
  let plan;
  try {
    plan = await db.repairPlan.upsert({
      where: { inspectionId },
      create: {
        inspectionId,
        priority,
        totalEstimatedCost,
        snapshotJson: jsonSnapshot
      },
      update: {
        priority,
        totalEstimatedCost,
        snapshotJson: jsonSnapshot
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      plan = await db.repairPlan.update({
        where: { inspectionId },
        data: {
          priority,
          totalEstimatedCost,
          snapshotJson: jsonSnapshot
        }
      });
    } else {
      throw e;
    }
  }
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  deps.notifyRepairPlanGenerated({
    inspectionId,
    repairPlanId: plan.id,
    priority,
    totalEstimatedCost,
    generatedAt,
    summaryText: snapshot.summary.text,
    findingCount: snapshot.summary.findingCount
  });
  await appendRepairPlanMongoAudit(deps, {
    kind: "REPAIR_PLAN_GENERATED",
    inspectionId,
    repairPlanId: plan.id,
    priority,
    totalEstimatedCost,
    findingCount: snapshot.summary.findingCount,
    maxSeverity: snapshot.summary.maxSeverity,
    summaryText: snapshot.summary.text,
    source: "postgres"
  });
  return plan;
}

// src/utils/pagination.ts
var DEFAULT_PAGE = 1;
var DEFAULT_LIMIT = 20;
var MAX_LIMIT = 100;
function computeSkip(page, limit) {
  return (page - 1) * limit;
}

// src/utils/inspection-day.ts
function toUtcInspectionCalendarDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

// src/utils/inspection-filter.ts
function buildInspectionWhere(filters) {
  const where = {};
  if (filters.turbineId) where.turbineId = filters.turbineId;
  if (filters.dataSource) where.dataSource = filters.dataSource;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = filters.dateFrom;
    if (filters.dateTo) where.date.lte = filters.dateTo;
  }
  return where;
}

// src/utils/prisma-errors.ts
import { Prisma as Prisma2 } from "@prisma/client";
function isInspectionDayUniqueViolation(meta) {
  const target = meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [];
  return fields.includes("inspectionDay") && fields.includes("turbineId");
}
function handleInspectionWriteError(e) {
  if (e instanceof Prisma2.PrismaClientKnownRequestError && e.code === "P2025") {
    throw new HttpError(404, "Inspection not found", "NOT_FOUND");
  }
  if (e instanceof Prisma2.PrismaClientKnownRequestError && e.code === "P2002") {
    if (isInspectionDayUniqueViolation(e.meta)) {
      throw new HttpError(
        409,
        "An inspection already exists for this turbine on the same UTC calendar day.",
        "INSPECTION_OVERLAP"
      );
    }
    throw new HttpError(409, "Conflict with existing data", "CONFLICT");
  }
  if (e instanceof Prisma2.PrismaClientKnownRequestError && e.code === "P2003") {
    throw new HttpError(409, "Related turbine record conflict", "CONFLICT");
  }
  throw e;
}

// src/services/inspection.service.ts
async function ensureTurbineExists(db, turbineId) {
  const row = await db.turbine.findUnique({ where: { id: turbineId }, select: { id: true } });
  if (!row) throw new HttpError(404, "Turbine not found", "NOT_FOUND");
}
async function assertNoOverlappingInspection(db, turbineId, inspectionDay, excludeInspectionId) {
  const existing = await db.inspection.findFirst({
    where: {
      turbineId,
      inspectionDay,
      ...excludeInspectionId ? { NOT: { id: excludeInspectionId } } : {}
    },
    select: { id: true }
  });
  if (existing) {
    throw new HttpError(
      409,
      "An inspection already exists for this turbine on the same UTC calendar day.",
      "INSPECTION_OVERLAP"
    );
  }
}
function movesToDifferentTurbineOrCalendarDay(existing, nextTurbineId, nextInstant) {
  const nextDay = toUtcInspectionCalendarDate(nextInstant);
  return existing.turbineId !== nextTurbineId || existing.inspectionDay.getTime() !== nextDay.getTime();
}
async function listInspections(db, params) {
  const where = buildInspectionWhere(params);
  const skip = computeSkip(params.page, params.limit);
  const [items, totalCount] = await Promise.all([
    db.inspection.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "asc" }],
      skip,
      take: params.limit,
      include: { turbine: true }
    }),
    db.inspection.count({ where })
  ]);
  return {
    items,
    totalCount,
    page: params.page,
    limit: params.limit
  };
}
async function findInspectionById(db, id) {
  return db.inspection.findUnique({
    where: { id },
    include: { turbine: true, findings: true, repairPlan: true }
  });
}
async function getInspectionById(db, id) {
  const row = await findInspectionById(db, id);
  if (!row) throw new HttpError(404, "Inspection not found", "NOT_FOUND");
  return row;
}
async function createInspection(db, input) {
  await ensureTurbineExists(db, input.turbineId);
  const inspectionDay = toUtcInspectionCalendarDate(input.date);
  await assertNoOverlappingInspection(db, input.turbineId, inspectionDay);
  try {
    return await db.inspection.create({
      data: {
        turbineId: input.turbineId,
        date: input.date,
        inspectionDay,
        dataSource: input.dataSource,
        ...input.inspectorName !== void 0 ? { inspectorName: input.inspectorName } : {},
        ...input.rawPackageUrl !== void 0 ? { rawPackageUrl: input.rawPackageUrl } : {}
      },
      include: { turbine: true }
    });
  } catch (e) {
    handleInspectionWriteError(e);
  }
}
async function updateInspection(db, id, input) {
  const existing = await db.inspection.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Inspection not found", "NOT_FOUND");
  const nextTurbineId = input.turbineId ?? existing.turbineId;
  const nextDate = input.date ?? existing.date;
  if (input.turbineId !== void 0 && input.turbineId !== existing.turbineId) {
    await ensureTurbineExists(db, nextTurbineId);
  }
  if (movesToDifferentTurbineOrCalendarDay(existing, nextTurbineId, nextDate)) {
    await assertNoOverlappingInspection(db, nextTurbineId, toUtcInspectionCalendarDate(nextDate), id);
  }
  try {
    return await db.inspection.update({
      where: { id },
      data: {
        ...input.turbineId !== void 0 ? { turbineId: input.turbineId } : {},
        ...input.date !== void 0 ? { date: input.date, inspectionDay: toUtcInspectionCalendarDate(input.date) } : {},
        ...input.inspectorName !== void 0 ? { inspectorName: input.inspectorName } : {},
        ...input.dataSource !== void 0 ? { dataSource: input.dataSource } : {},
        ...input.rawPackageUrl !== void 0 ? { rawPackageUrl: input.rawPackageUrl } : {}
      },
      include: { turbine: true }
    });
  } catch (e) {
    handleInspectionWriteError(e);
  }
}
async function deleteInspection(db, id) {
  try {
    await db.inspection.delete({ where: { id } });
  } catch (e) {
    handleInspectionWriteError(e);
  }
}

// src/services/finding.service.ts
import { Prisma as Prisma3 } from "@prisma/client";

// src/utils/finding-filter.ts
function buildFindingWhere(filters) {
  const where = {};
  if (filters.inspectionId) where.inspectionId = filters.inspectionId;
  if (filters.category) where.category = filters.category;
  if (filters.severity !== void 0) where.severity = filters.severity;
  if (filters.notesContains?.trim()) {
    where.notes = { contains: filters.notesContains.trim(), mode: "insensitive" };
  }
  return where;
}

// src/validators/finding-rules.ts
function validateBladeDamageCrackSeverityRule(params) {
  if (params.category !== "BLADE_DAMAGE") return { ok: true };
  const text = params.notes ?? "";
  if (!text.toLowerCase().includes("crack")) return { ok: true };
  if (params.severity >= 4) return { ok: true };
  return {
    ok: false,
    message: 'For BLADE_DAMAGE findings, when notes contain "crack", severity must be at least 4 (scale 1\u20135).',
    path: ["severity"]
  };
}

// src/services/finding.service.ts
function assertFindingBusinessRules(params) {
  const r = validateBladeDamageCrackSeverityRule(params);
  if (!r.ok) {
    throw new HttpError(400, r.message, "VALIDATION_ERROR", { path: r.path });
  }
}
async function ensureInspectionExists(db, inspectionId) {
  const row = await db.inspection.findUnique({ where: { id: inspectionId }, select: { id: true } });
  if (!row) throw new HttpError(404, "Inspection not found", "NOT_FOUND");
}
async function listFindings(db, params) {
  const where = buildFindingWhere(params);
  const skip = computeSkip(params.page, params.limit);
  const [items, totalCount] = await Promise.all([
    db.finding.findMany({
      where,
      orderBy: [{ id: "asc" }],
      skip,
      take: params.limit,
      include: { inspection: true }
    }),
    db.finding.count({ where })
  ]);
  return {
    items,
    totalCount,
    page: params.page,
    limit: params.limit
  };
}
async function findFindingById(db, id) {
  return db.finding.findUnique({
    where: { id },
    include: { inspection: true }
  });
}
async function getFindingById(db, id) {
  const row = await findFindingById(db, id);
  if (!row) throw new HttpError(404, "Finding not found", "NOT_FOUND");
  return row;
}
async function createFinding(db, input) {
  await ensureInspectionExists(db, input.inspectionId);
  assertFindingBusinessRules({
    category: input.category,
    severity: input.severity,
    notes: input.notes
  });
  try {
    return await db.finding.create({
      data: {
        inspectionId: input.inspectionId,
        category: input.category,
        severity: input.severity,
        estimatedCost: input.estimatedCost,
        ...input.notes !== void 0 ? { notes: input.notes } : {}
      },
      include: { inspection: true }
    });
  } catch (e) {
    handleFindingWriteError(e);
  }
}
async function updateFinding(db, id, input) {
  const existing = await db.finding.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Finding not found", "NOT_FOUND");
  const merged = {
    category: input.category ?? existing.category,
    severity: input.severity ?? existing.severity,
    notes: input.notes !== void 0 ? input.notes : existing.notes
  };
  assertFindingBusinessRules(merged);
  try {
    return await db.finding.update({
      where: { id },
      data: {
        ...input.category !== void 0 ? { category: input.category } : {},
        ...input.severity !== void 0 ? { severity: input.severity } : {},
        ...input.estimatedCost !== void 0 ? { estimatedCost: input.estimatedCost } : {},
        ...input.notes !== void 0 ? { notes: input.notes } : {}
      },
      include: { inspection: true }
    });
  } catch (e) {
    handleFindingWriteError(e);
  }
}
async function deleteFinding(db, id) {
  try {
    await db.finding.delete({ where: { id } });
  } catch (e) {
    handleFindingWriteError(e);
  }
}
function handleFindingWriteError(e) {
  if (e instanceof Prisma3.PrismaClientKnownRequestError && e.code === "P2025") {
    throw new HttpError(404, "Finding not found", "NOT_FOUND");
  }
  if (e instanceof Prisma3.PrismaClientKnownRequestError && e.code === "P2003") {
    throw new HttpError(409, "Related inspection record conflict", "CONFLICT");
  }
  throw e;
}

// src/services/turbine.service.ts
import { Prisma as Prisma4 } from "@prisma/client";
function buildWhere(params) {
  if (!params.name) return {};
  return {
    name: { contains: params.name, mode: "insensitive" }
  };
}
async function listTurbines(db, params) {
  const where = buildWhere(params);
  const skip = computeSkip(params.page, params.limit);
  const [items, totalCount] = await Promise.all([
    db.turbine.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: params.limit
    }),
    db.turbine.count({ where })
  ]);
  return {
    items,
    totalCount,
    page: params.page,
    limit: params.limit
  };
}
async function findTurbineById(db, id) {
  return db.turbine.findUnique({ where: { id } });
}
async function getTurbineById(db, id) {
  const row = await findTurbineById(db, id);
  if (!row) throw new HttpError(404, "Turbine not found", "NOT_FOUND");
  return row;
}
async function createTurbine(db, input) {
  return db.turbine.create({
    data: {
      name: input.name,
      ...input.manufacturer !== void 0 ? { manufacturer: input.manufacturer } : {},
      ...input.mwRating !== void 0 ? { mwRating: input.mwRating } : {},
      ...input.lat !== void 0 ? { lat: input.lat } : {},
      ...input.lng !== void 0 ? { lng: input.lng } : {}
    }
  });
}
async function updateTurbine(db, id, input) {
  try {
    return await db.turbine.update({
      where: { id },
      data: {
        ...input.name !== void 0 ? { name: input.name } : {},
        ...input.manufacturer !== void 0 ? { manufacturer: input.manufacturer } : {},
        ...input.mwRating !== void 0 ? { mwRating: input.mwRating } : {},
        ...input.lat !== void 0 ? { lat: input.lat } : {},
        ...input.lng !== void 0 ? { lng: input.lng } : {}
      }
    });
  } catch (e) {
    if (e instanceof Prisma4.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new HttpError(404, "Turbine not found", "NOT_FOUND");
    }
    throw e;
  }
}
async function deleteTurbine(db, id) {
  try {
    await db.turbine.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma4.PrismaClientKnownRequestError) {
      if (e.code === "P2025") throw new HttpError(404, "Turbine not found", "NOT_FOUND");
      if (e.code === "P2003")
        throw new HttpError(
          409,
          "Cannot delete turbine while inspections reference it",
          "CONFLICT"
        );
    }
    throw e;
  }
}

// src/validators/finding.validator.ts
import { FindingCategory } from "@prisma/client";
import { z } from "zod";
var severitySchema = z.number().int().gte(1).lte(5);
var notesSchema = z.union([z.string().max(8e3), z.null()]).optional();
var findingCreateBodySchema = z.object({
  inspectionId: z.string().min(1),
  category: z.nativeEnum(FindingCategory),
  severity: severitySchema,
  estimatedCost: z.number().finite().gte(0),
  notes: notesSchema
}).strict();
var findingCreateRestSchema = z.object({
  inspection_id: z.string().min(1),
  category: z.nativeEnum(FindingCategory),
  severity: severitySchema,
  estimated_cost: z.number().finite().gte(0),
  notes: notesSchema
}).strict().transform((v) => ({
  inspectionId: v.inspection_id,
  category: v.category,
  severity: v.severity,
  estimatedCost: v.estimated_cost,
  notes: v.notes
}));
var findingUpdateBodySchema = z.object({
  category: z.nativeEnum(FindingCategory).optional(),
  severity: severitySchema.optional(),
  estimatedCost: z.number().finite().gte(0).optional(),
  notes: notesSchema
}).strict().refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });
var findingUpdateRestSchema = z.object({
  category: z.nativeEnum(FindingCategory).optional(),
  severity: severitySchema.optional(),
  estimated_cost: z.number().finite().gte(0).optional(),
  notes: notesSchema
}).strict().transform((v) => {
  const out = {};
  if (v.category !== void 0) out.category = v.category;
  if (v.severity !== void 0) out.severity = v.severity;
  if (v.estimated_cost !== void 0) out.estimatedCost = v.estimated_cost;
  if (v.notes !== void 0) out.notes = v.notes;
  return out;
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });
var findingListRestQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(20),
  inspection_id: z.string().min(1).optional(),
  category: z.nativeEnum(FindingCategory).optional(),
  severity: z.coerce.number().int().gte(1).lte(5).optional(),
  notes_contains: z.string().trim().max(500).optional()
}).transform((q) => ({
  page: q.page,
  limit: q.limit,
  inspectionId: q.inspection_id?.trim(),
  category: q.category,
  severity: q.severity,
  notesContains: q.notes_contains?.trim() || void 0
}));
var findingListGraphQLArgsSchema = z.object({
  page: z.number().int().positive().optional().nullable(),
  limit: z.number().int().positive().max(MAX_LIMIT).optional().nullable(),
  inspectionId: z.preprocess((v) => v === null || v === "" ? void 0 : v, z.string().min(1).optional()),
  category: z.preprocess((v) => v === null ? void 0 : v, z.nativeEnum(FindingCategory).optional()),
  severity: z.preprocess(
    (v) => v === null || v === void 0 ? void 0 : v,
    z.coerce.number().int().gte(1).lte(5).optional()
  ),
  notesContains: z.preprocess(
    (v) => v === null || v === "" ? void 0 : v,
    z.string().trim().max(500).optional()
  )
}).strict().transform((a) => ({
  page: a.page ?? void 0,
  limit: a.limit ?? void 0,
  inspectionId: a.inspectionId?.trim(),
  category: a.category,
  severity: a.severity,
  notesContains: a.notesContains?.trim() || void 0
}));
var findingIdParamsSchema = z.object({
  id: z.string().min(1)
});

// src/validators/inspection.validator.ts
import { DataSource } from "@prisma/client";
import { z as z2 } from "zod";
var optionalUrl = z2.union([z2.string().url().max(2048), z2.literal(""), z2.null()]);
function normalizedRawPackageUrl(value) {
  if (value === void 0) return void 0;
  if (value === "" || value === null) return null;
  return value;
}
var inspectionCoreCreate = {
  turbineId: z2.string().min(1),
  date: z2.coerce.date(),
  inspectorName: z2.union([z2.string().max(256), z2.null()]).optional(),
  dataSource: z2.nativeEnum(DataSource),
  rawPackageUrl: optionalUrl.optional()
};
var inspectionCreateBodySchema = z2.object(inspectionCoreCreate).strict().transform((v) => {
  const out = {
    turbineId: v.turbineId,
    date: v.date,
    dataSource: v.dataSource
  };
  if (v.inspectorName !== void 0) out.inspectorName = v.inspectorName;
  const url = normalizedRawPackageUrl(v.rawPackageUrl);
  if (url !== void 0) out.rawPackageUrl = url;
  return out;
});
var inspectionCreateRestSchema = z2.object({
  turbine_id: z2.string().min(1),
  date: z2.coerce.date(),
  inspector_name: z2.union([z2.string().max(256), z2.null()]).optional(),
  data_source: z2.nativeEnum(DataSource),
  raw_package_url: optionalUrl.optional()
}).strict().transform((v) => {
  const out = {
    turbineId: v.turbine_id,
    date: v.date,
    dataSource: v.data_source
  };
  if (v.inspector_name !== void 0) out.inspectorName = v.inspector_name;
  const url = normalizedRawPackageUrl(v.raw_package_url);
  if (url !== void 0) out.rawPackageUrl = url;
  return out;
});
var inspectionUpdateBodySchema = z2.object({
  turbineId: z2.string().min(1).optional(),
  date: z2.coerce.date().optional(),
  inspectorName: z2.union([z2.string().max(256), z2.null()]).optional(),
  dataSource: z2.nativeEnum(DataSource).optional(),
  rawPackageUrl: optionalUrl.optional()
}).strict().transform((v) => {
  const out = {};
  if (v.turbineId !== void 0) out.turbineId = v.turbineId;
  if (v.date !== void 0) out.date = v.date;
  if (v.inspectorName !== void 0) out.inspectorName = v.inspectorName;
  if (v.dataSource !== void 0) out.dataSource = v.dataSource;
  const url = normalizedRawPackageUrl(v.rawPackageUrl);
  if (url !== void 0) out.rawPackageUrl = url;
  return out;
}).refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required"
});
var inspectionUpdateRestSchema = z2.object({
  turbine_id: z2.string().min(1).optional(),
  date: z2.coerce.date().optional(),
  inspector_name: z2.union([z2.string().max(256), z2.null()]).optional(),
  data_source: z2.nativeEnum(DataSource).optional(),
  raw_package_url: optionalUrl.optional()
}).strict().transform((v) => {
  const out = {};
  if (v.turbine_id !== void 0) out.turbineId = v.turbine_id;
  if (v.date !== void 0) out.date = v.date;
  if (v.inspector_name !== void 0) out.inspectorName = v.inspector_name;
  if (v.data_source !== void 0) out.dataSource = v.data_source;
  const url = normalizedRawPackageUrl(v.raw_package_url);
  if (url !== void 0) out.rawPackageUrl = url;
  return out;
}).refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required"
});
var inspectionListGraphQLArgsSchema = z2.object({
  page: z2.number().int().positive().optional().nullable(),
  limit: z2.number().int().positive().max(MAX_LIMIT).optional().nullable(),
  turbineId: z2.preprocess((v) => v === null || v === "" ? void 0 : v, z2.string().min(1).optional()),
  dateFrom: z2.preprocess((v) => v === null || v === "" ? void 0 : v, z2.coerce.date().optional()),
  dateTo: z2.preprocess((v) => v === null || v === "" ? void 0 : v, z2.coerce.date().optional()),
  dataSource: z2.preprocess((v) => v === null ? void 0 : v, z2.nativeEnum(DataSource).optional())
}).strict().transform((a) => ({
  page: a.page ?? void 0,
  limit: a.limit ?? void 0,
  turbineId: a.turbineId?.trim() || void 0,
  dateFrom: a.dateFrom,
  dateTo: a.dateTo,
  dataSource: a.dataSource
})).superRefine((q, ctx) => {
  if (q.dateFrom && q.dateTo && q.dateFrom > q.dateTo) {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "dateFrom must be <= dateTo", path: ["dateTo"] });
  }
});
var inspectionListRestQuerySchema = z2.object({
  page: z2.coerce.number().int().positive().default(1),
  limit: z2.coerce.number().int().positive().max(MAX_LIMIT).default(20),
  turbine_id: z2.string().min(1).optional(),
  from: z2.coerce.date().optional(),
  to: z2.coerce.date().optional(),
  data_source: z2.nativeEnum(DataSource).optional()
}).refine((q) => !q.from || !q.to || q.from <= q.to, {
  message: "from must be <= to",
  path: ["to"]
}).transform((q) => ({
  page: q.page,
  limit: q.limit,
  turbineId: q.turbine_id?.trim(),
  dateFrom: q.from,
  dateTo: q.to,
  dataSource: q.data_source
}));
var inspectionIdParamsSchema = z2.object({
  id: z2.string().min(1)
});

// src/validators/turbines.validator.ts
import { z as z3 } from "zod";
var turbineFields = {
  name: z3.string().min(1).max(256),
  manufacturer: z3.union([z3.string().max(256), z3.null()]).optional(),
  mwRating: z3.union([z3.number().finite(), z3.null()]).optional(),
  lat: z3.union([z3.number().finite().gte(-90).lte(90), z3.null()]).optional(),
  lng: z3.union([z3.number().finite().gte(-180).lte(180), z3.null()]).optional()
};
var turbineCreateBodySchema = z3.object({
  name: turbineFields.name,
  manufacturer: turbineFields.manufacturer,
  mwRating: turbineFields.mwRating,
  lat: turbineFields.lat,
  lng: turbineFields.lng
});
var turbineUpdateBodySchema = z3.object({
  name: z3.string().min(1).max(256).optional(),
  manufacturer: z3.union([z3.string().max(256), z3.null()]).optional(),
  mwRating: z3.union([z3.number().finite(), z3.null()]).optional(),
  lat: z3.union([z3.number().finite().gte(-90).lte(90), z3.null()]).optional(),
  lng: z3.union([z3.number().finite().gte(-180).lte(180), z3.null()]).optional()
}).strict().refine((v) => Object.values(v).some((x) => x !== void 0), {
  message: "At least one field is required"
});
var turbineListQuerySchema = z3.object({
  page: z3.coerce.number().int().positive().default(1),
  limit: z3.coerce.number().int().positive().max(MAX_LIMIT).default(20),
  /** Case-insensitive substring match on `Turbine.name` */
  name: z3.string().trim().min(1).max(200).optional()
});
var turbineIdParamsSchema = z3.object({
  id: z3.string().min(1)
});

// src/graphql/resolvers.ts
function buildResolvers(deps) {
  return {
    Query: {
      turbines: async (_, args, ctx) => {
        ensurePermission(ctx, "read");
        const page = Math.max(1, args.page ?? DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? DEFAULT_LIMIT));
        const name = args.nameContains?.trim() || void 0;
        return listTurbines(prisma, { page, limit, name });
      },
      turbine: async (_, args, ctx) => {
        ensurePermission(ctx, "read");
        return findTurbineById(prisma, args.id);
      },
      inspections: async (_, args, ctx) => {
        ensurePermission(ctx, "read");
        const parsed = parseGraphQLInput(inspectionListGraphQLArgsSchema, args);
        const page = Math.max(1, parsed.page ?? DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parsed.limit ?? DEFAULT_LIMIT));
        return listInspections(prisma, {
          page,
          limit,
          turbineId: parsed.turbineId,
          dateFrom: parsed.dateFrom,
          dateTo: parsed.dateTo,
          dataSource: parsed.dataSource
        });
      },
      inspection: async (_, args, ctx) => {
        ensurePermission(ctx, "read");
        return findInspectionById(prisma, args.id);
      },
      findings: async (_, args, ctx) => {
        ensurePermission(ctx, "read");
        const parsed = parseGraphQLInput(findingListGraphQLArgsSchema, args);
        const page = Math.max(1, parsed.page ?? DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parsed.limit ?? DEFAULT_LIMIT));
        return listFindings(prisma, {
          page,
          limit,
          inspectionId: parsed.inspectionId,
          category: parsed.category,
          severity: parsed.severity,
          notesContains: parsed.notesContains
        });
      },
      finding: async (_, args, ctx) => {
        ensurePermission(ctx, "read");
        return findFindingById(prisma, args.id);
      },
      repairPlan: async (_, args, ctx) => {
        ensurePermission(ctx, "read");
        return findRepairPlanByInspectionId(prisma, args.inspectionId);
      }
    },
    Mutation: {
      createTurbine: async (_, args, ctx) => {
        ensurePermission(ctx, "write");
        const input = parseGraphQLInput(turbineCreateBodySchema, args.input);
        return gqlFromService(() => createTurbine(prisma, input));
      },
      updateTurbine: async (_, args, ctx) => {
        ensurePermission(ctx, "write");
        const input = parseGraphQLInput(turbineUpdateBodySchema, args.input);
        return gqlFromService(() => updateTurbine(prisma, args.id, input));
      },
      deleteTurbine: async (_, args, ctx) => {
        ensurePermission(ctx, "admin");
        await gqlFromService(() => deleteTurbine(prisma, args.id));
        return true;
      },
      createInspection: async (_, args, ctx) => {
        ensurePermission(ctx, "write");
        const input = parseGraphQLInput(inspectionCreateBodySchema, args.input);
        return gqlFromService(() => createInspection(prisma, input));
      },
      updateInspection: async (_, args, ctx) => {
        ensurePermission(ctx, "write");
        const input = parseGraphQLInput(inspectionUpdateBodySchema, args.input);
        return gqlFromService(() => updateInspection(prisma, args.id, input));
      },
      deleteInspection: async (_, args, ctx) => {
        ensurePermission(ctx, "admin");
        await gqlFromService(() => deleteInspection(prisma, args.id));
        return true;
      },
      createFinding: async (_, args, ctx) => {
        ensurePermission(ctx, "write");
        const input = parseGraphQLInput(findingCreateBodySchema, args.input);
        return gqlFromService(() => createFinding(prisma, input));
      },
      updateFinding: async (_, args, ctx) => {
        ensurePermission(ctx, "write");
        const input = parseGraphQLInput(findingUpdateBodySchema, args.input);
        return gqlFromService(() => updateFinding(prisma, args.id, input));
      },
      deleteFinding: async (_, args, ctx) => {
        ensurePermission(ctx, "admin");
        await gqlFromService(() => deleteFinding(prisma, args.id));
        return true;
      },
      generateRepairPlan: async (_, args, ctx) => {
        ensurePermission(ctx, "write");
        return gqlFromService(
          () => generateRepairPlanForInspection(prisma, args.inspectionId, {
            mongoClient: deps.mongoClient,
            mongoDbName: deps.mongoDbName,
            notifyRepairPlanGenerated: deps.notifyRepairPlanGenerated
          })
        );
      }
    },
    Turbine: {
      createdAt: (parent) => parent.createdAt.toISOString(),
      updatedAt: (parent) => parent.updatedAt.toISOString(),
      inspections: async (parent, _args, ctx) => {
        ensurePermission(ctx, "read");
        return prisma.inspection.findMany({
          where: { turbineId: parent.id },
          orderBy: { date: "desc" }
        });
      }
    },
    Inspection: {
      date: (parent) => parent.date.toISOString(),
      inspectionDay: (parent) => parent.inspectionDay.toISOString().slice(0, 10),
      turbine: async (parent, _args, ctx) => {
        ensurePermission(ctx, "read");
        if (parent.turbine) return parent.turbine;
        const row = await prisma.turbine.findUnique({ where: { id: parent.turbineId } });
        return row;
      },
      findings: async (parent, _args, ctx) => {
        ensurePermission(ctx, "read");
        if ("findings" in parent && Array.isArray(parent.findings)) {
          return parent.findings;
        }
        return prisma.finding.findMany({
          where: { inspectionId: parent.id },
          orderBy: { id: "asc" },
          include: { inspection: true }
        });
      },
      repairPlan: async (parent, _args, ctx) => {
        ensurePermission(ctx, "read");
        if ("repairPlan" in parent) {
          return parent.repairPlan;
        }
        return prisma.repairPlan.findUnique({ where: { inspectionId: parent.id } });
      }
    },
    Finding: {
      inspection: async (parent, _args, ctx) => {
        ensurePermission(ctx, "read");
        if (parent.inspection) return parent.inspection;
        const row = await prisma.inspection.findUnique({ where: { id: parent.inspectionId } });
        return row;
      }
    },
    RepairPlan: {
      inspectionId: (parent) => parent.inspectionId,
      createdAt: (parent) => parent.createdAt.toISOString(),
      updatedAt: (parent) => parent.updatedAt.toISOString(),
      summaryText: (parent) => repairPlanPresentation(parent).summaryText,
      findingCount: (parent) => repairPlanPresentation(parent).findingCount,
      maxSeverity: (parent) => repairPlanPresentation(parent).maxSeverity
    }
  };
}

// src/graphql/apollo.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
async function attachGraphQL(app, deps) {
  const schemaPath = path.join(__dirname, "schema.graphql");
  const typeDefs = readFileSync(schemaPath, "utf8");
  const server = new ApolloServer({
    typeDefs,
    resolvers: buildResolvers({
      mongoClient: deps.mongoClient,
      mongoDbName: deps.mongoDbName,
      notifyRepairPlanGenerated: deps.notifyRepairPlanGenerated
    }),
    context: ({ req }) => ({
      authUser: req.authUser ?? null
    }),
    formatError: (err) => {
      const code = err.extensions?.code;
      const safe = code === "UNAUTHENTICATED" || code === "FORBIDDEN" || code === "BAD_USER_INPUT" || code === "NOT_FOUND" || code === "CONFLICT" || code === "INSPECTION_OVERLAP" || code === "VALIDATION_ERROR";
      if (safe) {
        return err;
      }
      if (deps.env.NODE_ENV === "production") {
        return new GraphQLError4("Internal server error", {
          extensions: { code: "INTERNAL_SERVER_ERROR" }
        });
      }
      return err;
    }
  });
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });
}

// src/utils/password.ts
import bcrypt from "bcryptjs";
var DUMMY_PASSWORD_HASH_FOR_TIMING = bcrypt.hashSync("__auth_dummy__", 10);
async function verifyPassword(plain, passwordHash) {
  return bcrypt.compare(plain, passwordHash);
}

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
var ACCESS_TOKEN_TYP = "access";
function signAccessToken(env, claims) {
  const payload = { ...claims, typ: ACCESS_TOKEN_TYP };
  const options = {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN,
    jwtid: randomUUID(),
    ...env.JWT_ISSUER ? { issuer: env.JWT_ISSUER } : {},
    ...env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}
function verifyAccessToken(env, token) {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    ...env.JWT_ISSUER ? { issuer: env.JWT_ISSUER } : {},
    ...env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}
  });
  if (typeof decoded === "string" || decoded === null) {
    throw new Error("Invalid token payload");
  }
  const { sub, role, typ } = decoded;
  if (typeof sub !== "string" || !role || typ !== ACCESS_TOKEN_TYP) {
    throw new Error("Invalid access token shape");
  }
  if (role !== "ADMIN" && role !== "ENGINEER" && role !== "VIEWER") {
    throw new Error("Invalid role claim");
  }
  return { sub, role, typ };
}

// src/services/auth.service.ts
function toPublicUser(row) {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}
async function login(prisma2, env, input) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma2.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      passwordHash: true
    }
  });
  const hashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH_FOR_TIMING;
  const passwordOk = await verifyPassword(input.password, hashToVerify);
  if (!user || user.disabledAt || !passwordOk) {
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  const accessToken = signAccessToken(env, { sub: user.id, role: user.role });
  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: env.JWT_EXPIRES_IN,
    user: toPublicUser(user)
  };
}
async function resolveAuthUserFromAccessToken(prisma2, env, token) {
  let claims;
  try {
    claims = verifyAccessToken(env, token);
  } catch {
    throw new HttpError(401, "Invalid or expired token", "INVALID_TOKEN");
  }
  const user = await prisma2.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, role: true, disabledAt: true }
  });
  if (!user || user.disabledAt) {
    throw new HttpError(401, "Invalid or expired token", "INVALID_TOKEN");
  }
  return toPublicUser(user);
}

// src/utils/async-handler.ts
function asyncHandler(fn) {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

// src/middleware/authenticate.ts
function createAuthenticateMiddleware(env) {
  return asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      req.authUser = void 0;
      next();
      return;
    }
    const raw = header.slice("Bearer ".length).trim();
    if (!raw) {
      throw new HttpError(401, "Invalid or expired token", "INVALID_TOKEN");
    }
    try {
      req.authUser = await resolveAuthUserFromAccessToken(prisma, env, raw);
      next();
    } catch (e) {
      next(e instanceof HttpError ? e : new HttpError(401, "Invalid or expired token", "INVALID_TOKEN"));
    }
  });
}

// src/middleware/error-handler.ts
function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (isHttpError(err)) {
    const payload = {
      error: err.message,
      ...err.code ? { code: err.code } : {}
    };
    if (process.env.NODE_ENV === "development" && err.details !== void 0) {
      payload.details = err.details;
    }
    res.status(err.statusCode).json(payload);
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

// src/middleware/not-found-handler.ts
function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found", path: req.path });
}

// src/middleware/require-permission.ts
function requirePermission(permission) {
  return (req, _res, next) => {
    if (!req.authUser) {
      next(new HttpError(401, "Authentication required", "UNAUTHENTICATED"));
      return;
    }
    if (!roleAllowsPermission(req.authUser.role, permission)) {
      next(new HttpError(403, "Insufficient permissions", "FORBIDDEN"));
      return;
    }
    next();
  };
}

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/validators/helpers.ts
function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    throw new HttpError(400, "Invalid request body", "VALIDATION_ERROR", result.error.flatten());
  }
  return result.data;
}
function parseQuery(schema, query) {
  const result = schema.safeParse(query ?? {});
  if (!result.success) {
    throw new HttpError(400, "Invalid query parameters", "VALIDATION_ERROR", result.error.flatten());
  }
  return result.data;
}
function parseParams(schema, params) {
  const result = schema.safeParse(params ?? {});
  if (!result.success) {
    throw new HttpError(400, "Invalid route parameters", "VALIDATION_ERROR", result.error.flatten());
  }
  return result.data;
}

// src/validators/auth.validator.ts
import { z as z4 } from "zod";
var loginBodySchema = z4.object({
  email: z4.string().trim().email(),
  password: z4.string().min(1, "password required")
});

// src/modules/auth/auth.routes.ts
function createAuthRouter(env) {
  const router = Router();
  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const body = parseBody(loginBodySchema, req.body);
      const result = await login(prisma, env, body);
      res.json(result);
    })
  );
  return router;
}

// src/modules/events/sse.routes.ts
var sseClients = /* @__PURE__ */ new Set();
function notifyRepairPlanGenerated(payload) {
  const body = JSON.stringify({ type: "repair_plan_generated", ...payload });
  const legacy = JSON.stringify({
    inspectionId: payload.inspectionId,
    repairPlanId: payload.repairPlanId,
    at: payload.generatedAt
  });
  for (const client of sseClients) {
    client.write(`event: repair_plan_generated
data: ${body}

`);
    client.write(`event: plan
data: ${legacy}

`);
  }
}
function sseAccessTokenBridge(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ") && typeof req.query.access_token === "string") {
    const raw = req.query.access_token.trim();
    if (raw) req.headers.authorization = `Bearer ${raw}`;
  }
  next();
}
var sseEventsHandler = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`event: ping
data: ok

`);
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
};

// src/modules/health/health.routes.ts
import { Router as Router2 } from "express";
var healthRouter = Router2();
healthRouter.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// src/modules/findings/findings.routes.ts
import { Router as Router3 } from "express";
var findingsRouter = Router3();
findingsRouter.get(
  "/",
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const query = parseQuery(findingListRestQuerySchema, req.query);
    const result = await listFindings(prisma, {
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      inspectionId: query.inspectionId,
      category: query.category,
      severity: query.severity,
      notesContains: query.notesContains
    });
    res.json(result);
  })
);
findingsRouter.get(
  "/:id",
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(findingIdParamsSchema, req.params);
    const row = await getFindingById(prisma, id);
    res.json(row);
  })
);
findingsRouter.post(
  "/",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(findingCreateRestSchema, req.body);
    const row = await createFinding(prisma, body);
    res.status(201).json(row);
  })
);
findingsRouter.patch(
  "/:id",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(findingIdParamsSchema, req.params);
    const body = parseBody(findingUpdateRestSchema, req.body);
    const row = await updateFinding(prisma, id, body);
    res.json(row);
  })
);
findingsRouter.delete(
  "/:id",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(findingIdParamsSchema, req.params);
    await deleteFinding(prisma, id);
    res.status(204).send();
  })
);

// src/modules/inspections/inspections.routes.ts
import { Router as Router4 } from "express";
var inspectionsRouter = Router4();
inspectionsRouter.get(
  "/",
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const query = parseQuery(inspectionListRestQuerySchema, req.query);
    const result = await listInspections(prisma, {
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      turbineId: query.turbineId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      dataSource: query.dataSource
    });
    res.json(result);
  })
);
inspectionsRouter.get(
  "/:id",
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(inspectionIdParamsSchema, req.params);
    const row = await getInspectionById(prisma, id);
    res.json(row);
  })
);
inspectionsRouter.post(
  "/",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(inspectionCreateRestSchema, req.body);
    const row = await createInspection(prisma, body);
    res.status(201).json(row);
  })
);
inspectionsRouter.patch(
  "/:id",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(inspectionIdParamsSchema, req.params);
    const body = parseBody(inspectionUpdateRestSchema, req.body);
    const row = await updateInspection(prisma, id, body);
    res.json(row);
  })
);
inspectionsRouter.delete(
  "/:id",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(inspectionIdParamsSchema, req.params);
    await deleteInspection(prisma, id);
    res.status(204).send();
  })
);

// src/modules/repair-plans/repair-plans.routes.ts
import { Router as Router5 } from "express";

// src/validators/repair-plan.validator.ts
import { z as z5 } from "zod";
var repairPlanGenerateRestSchema = z5.object({
  inspection_id: z5.string().min(1)
}).strict().transform((v) => ({ inspectionId: v.inspection_id }));
var repairPlanInspectionParamsSchema = z5.object({
  inspectionId: z5.string().min(1)
});

// src/modules/repair-plans/repair-plans.routes.ts
function createRepairPlansRouter(mongoClient, mongoDbName) {
  const router = Router5();
  router.get(
    "/by-inspection/:inspectionId",
    requirePermission("read"),
    asyncHandler(async (req, res) => {
      const { inspectionId } = parseParams(repairPlanInspectionParamsSchema, req.params);
      const row = await getRepairPlanByInspectionId(prisma, inspectionId);
      res.json(row);
    })
  );
  router.post(
    "/generate",
    requirePermission("write"),
    asyncHandler(async (req, res) => {
      const body = parseBody(repairPlanGenerateRestSchema, req.body);
      const plan = await generateRepairPlanForInspection(prisma, body.inspectionId, {
        mongoClient,
        mongoDbName,
        notifyRepairPlanGenerated
      });
      res.status(201).json(plan);
    })
  );
  return router;
}

// src/modules/turbines/turbines.routes.ts
import { Router as Router6 } from "express";
var turbinesRouter = Router6();
turbinesRouter.get(
  "/",
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const query = parseQuery(turbineListQuerySchema, req.query);
    const result = await listTurbines(prisma, {
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      name: query.name
    });
    res.json(result);
  })
);
turbinesRouter.get(
  "/:id",
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(turbineIdParamsSchema, req.params);
    const row = await getTurbineById(prisma, id);
    res.json(row);
  })
);
turbinesRouter.post(
  "/",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(turbineCreateBodySchema, req.body);
    const row = await createTurbine(prisma, body);
    res.status(201).json(row);
  })
);
turbinesRouter.patch(
  "/:id",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(turbineIdParamsSchema, req.params);
    const body = parseBody(turbineUpdateBodySchema, req.body);
    const row = await updateTurbine(prisma, id, body);
    res.json(row);
  })
);
turbinesRouter.delete(
  "/:id",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(turbineIdParamsSchema, req.params);
    await deleteTurbine(prisma, id);
    res.status(204).send();
  })
);

// src/app.ts
async function createApp(env, mongoClient) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const openapiPath = path2.join(process.cwd(), "openapi.yaml");
  const openapiDoc = yaml.parse(readFileSync2(openapiPath, "utf8"));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
  app.use("/api", healthRouter);
  app.use("/api/auth", createAuthRouter(env));
  const authenticate = createAuthenticateMiddleware(env);
  app.use("/api/turbines", authenticate, turbinesRouter);
  app.use("/api/inspections", authenticate, inspectionsRouter);
  app.use("/api/findings", authenticate, findingsRouter);
  app.use("/api/repair-plans", authenticate, createRepairPlansRouter(mongoClient, env.MONGO_DB));
  app.get("/api/events", sseAccessTokenBridge, authenticate, requirePermission("read"), sseEventsHandler);
  app.use("/graphql", authenticate);
  await attachGraphQL(app, {
    env,
    mongoClient,
    mongoDbName: env.MONGO_DB,
    notifyRepairPlanGenerated
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// src/config/env.ts
import { z as z6 } from "zod";
var envSchema = z6.object({
  NODE_ENV: z6.enum(["development", "test", "production"]).default("development"),
  PORT: z6.coerce.number().int().positive().default(4e3),
  DATABASE_URL: z6.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z6.string().min(1, "JWT_SECRET is required"),
  /** Access token TTL (jsonwebtoken `expiresIn` string). Refresh tokens can reuse separate secret/TTL later. */
  JWT_EXPIRES_IN: z6.string().default("8h"),
  /** Optional standard JWT issuer (`iss`). If set, tokens are verified with the same issuer. */
  JWT_ISSUER: z6.string().min(1).optional(),
  /** Optional JWT audience (`aud`). If set, verification requires `aud`. */
  JWT_AUDIENCE: z6.string().min(1).optional(),
  MONGO_URL: z6.string().default("mongodb://localhost:27017"),
  MONGO_DB: z6.string().min(1).default("turbineops")
}).superRefine((val, ctx) => {
  if (val.NODE_ENV === "production" && val.JWT_SECRET.length < 32) {
    ctx.addIssue({
      code: z6.ZodIssueCode.custom,
      message: "JWT_SECRET must be at least 32 characters in production",
      path: ["JWT_SECRET"]
    });
  }
});
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

// src/services/mongo-client.ts
import { MongoClient } from "mongodb";
async function connectMongo(mongoUrl) {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log("Mongo connected");
    return client;
  } catch (e) {
    console.warn("Mongo unavailable yet:", e.message);
    return null;
  }
}

// src/main.ts
async function gracefulShutdown(server, mongoClient) {
  await new Promise((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
  });
  if (mongoClient) {
    await mongoClient.close().catch(() => void 0);
  }
  await prisma.$disconnect();
}
async function bootstrap() {
  const env = loadEnv();
  const mongoClient = await connectMongo(env.MONGO_URL);
  const app = await createApp(env, mongoClient);
  const server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(env.PORT, () => {
      console.log(`Backend on http://localhost:${env.PORT}`);
      resolve();
    });
  });
  const shutdown = async (signal) => {
    console.info(`${signal} received, shutting down gracefully`);
    try {
      await gracefulShutdown(server, mongoClient);
    } catch (e) {
      console.error("Error during shutdown", e);
      process.exitCode = 1;
    } finally {
      process.exit();
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
