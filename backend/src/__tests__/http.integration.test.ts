import 'dotenv/config';
import request from 'supertest';
import type { Application } from 'express';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

/** Avoid pulling `graphql/apollo.ts` into ts-jest (import.meta); REST stack is what we exercise here. */
jest.mock('../graphql/apollo', () => ({
  attachGraphQL: jest.fn(async () => {
    /* no-op: transport tests target REST + auth + RBAC */
  }),
}));

import { createApp } from '../app';
import { loadEnv } from '../config/env';
import { prisma } from '../db/prisma';

/**
 * Transport-level smoke: real Express stack + Prisma + JWT + RBAC.
 * Runs when INTEGRATION_TESTS=1 (CI + optional local). Keeps default `npm test` fast without Postgres.
 */
const runIntegration = process.env.INTEGRATION_TESTS === '1';
const d = runIntegration ? describe : describe.skip;

d('HTTP integration (Supertest)', () => {
  let app: Application;

  beforeAll(async () => {
    jest.setTimeout(30_000);
    const env = loadEnv();
    app = await createApp(env, null);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /api/auth/login returns a bearer token for seeded credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@example.com', password: 'viewer123' })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      email: 'viewer@example.com',
      role: 'VIEWER',
    });
  });

  it('REST: VIEWER may read turbines and cannot create (403)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@example.com', password: 'viewer123' })
      .expect(200);

    const token = login.body.accessToken as string;

    await request(app).get('/api/turbines').set('Authorization', `Bearer ${token}`).expect(200);

    await request(app)
      .post('/api/turbines')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({})
      .expect(403);
  });
});
