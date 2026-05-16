import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { RepairPlanGeneratedSsePayload } from '../../services/repair-plan.service';

const sseClients = new Set<Response>();

/**
 * Broadcasts to all connected SSE clients after a repair plan is persisted in PostgreSQL.
 * Also emits legacy `plan` event for older subscribers.
 */
export function notifyRepairPlanGenerated(payload: RepairPlanGeneratedSsePayload): void {
  const body = JSON.stringify({ type: 'repair_plan_generated', ...payload });
  const legacy = JSON.stringify({
    inspectionId: payload.inspectionId,
    repairPlanId: payload.repairPlanId,
    at: payload.generatedAt,
  });
  for (const client of sseClients) {
    client.write(`event: repair_plan_generated\ndata: ${body}\n\n`);
    client.write(`event: plan\ndata: ${legacy}\n\n`);
  }
}

/**
 * Browser `EventSource` cannot send `Authorization` headers; allow optional `?access_token=` for this route only.
 * Prefer header auth when available (server-to-server). Tokens in URLs may appear in logs — use with care.
 */
export function sseAccessTokenBridge(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ') && typeof req.query.access_token === 'string') {
    const raw = req.query.access_token.trim();
    if (raw) req.headers.authorization = `Bearer ${raw}`;
  }
  next();
}

export const sseEventsHandler: RequestHandler = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: ping\ndata: ok\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
};
