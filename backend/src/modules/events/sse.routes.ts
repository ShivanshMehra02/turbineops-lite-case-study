import type { RequestHandler, Response } from 'express';

const sseClients = new Set<Response>();

export function notifyPlan(inspectionId: string): void {
  for (const client of sseClients) {
    client.write(`event: plan
data: ${JSON.stringify({ inspectionId, at: new Date().toISOString() })}

`);
  }
}

export const sseEventsHandler: RequestHandler = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: ping
data: ok

`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
};
