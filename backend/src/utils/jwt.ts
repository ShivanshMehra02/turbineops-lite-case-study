import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { Role } from '@prisma/client';
import type { Env } from '../config/env';

export const ACCESS_TOKEN_TYP = 'access' as const;

export type AccessTokenClaims = {
  sub: string;
  role: Role;
  typ: typeof ACCESS_TOKEN_TYP;
};

export function signAccessToken(env: Env, claims: Omit<AccessTokenClaims, 'typ'>): string {
  const payload: AccessTokenClaims = { ...claims, typ: ACCESS_TOKEN_TYP };
  const options: jwt.SignOptions = {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    jwtid: randomUUID(),
    ...(env.JWT_ISSUER ? { issuer: env.JWT_ISSUER } : {}),
    ...(env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}),
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(env: Env, token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    ...(env.JWT_ISSUER ? { issuer: env.JWT_ISSUER } : {}),
    ...(env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}),
  });

  if (typeof decoded === 'string' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  const { sub, role, typ } = decoded as jwt.JwtPayload & Partial<AccessTokenClaims>;

  if (typeof sub !== 'string' || !role || typ !== ACCESS_TOKEN_TYP) {
    throw new Error('Invalid access token shape');
  }

  if (role !== 'ADMIN' && role !== 'ENGINEER' && role !== 'VIEWER') {
    throw new Error('Invalid role claim');
  }

  return { sub, role, typ };
}
