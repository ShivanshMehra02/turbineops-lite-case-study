import { z } from 'zod';
export const repairPlanGenerateRestSchema = z
    .object({
    inspection_id: z.string().min(1),
})
    .strict()
    .transform((v) => ({ inspectionId: v.inspection_id }));
export const repairPlanInspectionParamsSchema = z.object({
    inspectionId: z.string().min(1),
});
