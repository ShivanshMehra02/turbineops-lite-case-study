import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import type { Env } from '../config/env';
import { prisma } from '../db/prisma';
import { login } from '../services/auth.service';

jest.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const env = {
  NODE_ENV: 'test',
  PORT: 4000,
  DATABASE_URL: 'postgresql://localhost:5432/x',
  JWT_SECRET: 'unit-test-secret-at-least-32-characters-long',
  JWT_EXPIRES_IN: '15m',
  JWT_ISSUER: undefined,
  JWT_AUDIENCE: undefined,
  MONGO_URL: 'mongodb://localhost:27017',
  MONGO_DB: 'turbineops',
} satisfies Env;

function engineerRow(passwordHash: string, disabledAt: Date | null) {
  const now = new Date();
  return {
    id: 'u1',
    email: 'eng@example.com',
    name: 'Engineer',
    role: 'ENGINEER' as const,
    disabledAt,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };
}

describe('auth.service login', () => {
  const findUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('returns token + safe user on success', async () => {
    const hash = await bcrypt.hash('correct', 6);
    findUnique.mockResolvedValue(engineerRow(hash, null));

    const result = await login(prisma, env, { email: 'eng@example.com', password: 'correct' });

    expect(result.user).toEqual({
      id: 'u1',
      email: 'eng@example.com',
      name: 'Engineer',
      role: 'ENGINEER',
    });
    expect(result.accessToken.length).toBeGreaterThan(20);
    expect(result.tokenType).toBe('Bearer');
    expect(findUnique).toHaveBeenCalled();
  });

  it('rejects disabled users with generic error', async () => {
    const hash = await bcrypt.hash('correct', 6);
    findUnique.mockResolvedValue(engineerRow(hash, new Date()));

    await expect(login(prisma, env, { email: 'eng@example.com', password: 'correct' })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('rejects wrong password with generic error', async () => {
    const hash = await bcrypt.hash('correct', 6);
    findUnique.mockResolvedValue(engineerRow(hash, null));

    await expect(login(prisma, env, { email: 'eng@example.com', password: 'wrong' })).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
