import { Router } from 'express';
import type { Env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { login } from '../../services/auth.service';
import { asyncHandler } from '../../utils/async-handler';
import { parseBody } from '../../validators/helpers';
import { loginBodySchema } from '../../validators/auth.validator';

export function createAuthRouter(env: Env): Router {
  const router = Router();

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const body = parseBody(loginBodySchema, req.body);
      const result = await login(prisma, env, body);
      res.json(result);
    }),
  );

  return router;
}
