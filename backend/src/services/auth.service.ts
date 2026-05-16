import type { PrismaClient } from '@prisma/client';
import type { Env } from '../config/env';
import type { AuthUser } from '../types/auth';
import { HttpError } from '../utils/errors';
import { DUMMY_PASSWORD_HASH_FOR_TIMING, verifyPassword } from '../utils/password';
import { signAccessToken, verifyAccessToken } from '../utils/jwt';

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
};

function toPublicUser(row: { id: string; email: string; name: string; role: AuthUser['role'] }): AuthUser {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function login(prisma: PrismaClient, env: Env, input: LoginInput): Promise<LoginResponse> {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      passwordHash: true,
    },
  });

  const hashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH_FOR_TIMING;
  const passwordOk = await verifyPassword(input.password, hashToVerify);

  if (!user || user.disabledAt || !passwordOk) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken(env, { sub: user.id, role: user.role });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: env.JWT_EXPIRES_IN,
    user: toPublicUser(user),
  };
}

/**
 * Validates Bearer access token and returns the current DB user (honors `disabledAt` and latest `role`).
 */
export async function resolveAuthUserFromAccessToken(
  prisma: PrismaClient,
  env: Env,
  token: string,
): Promise<AuthUser> {
  let claims;
  try {
    claims = verifyAccessToken(env, token);
  } catch {
    throw new HttpError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, role: true, disabledAt: true },
  });

  if (!user || user.disabledAt) {
    throw new HttpError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }

  return toPublicUser(user);
}
