import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
export const ACCESS_TOKEN_TYP = 'access';
export function signAccessToken(env, claims) {
    const payload = { ...claims, typ: ACCESS_TOKEN_TYP };
    const options = {
        algorithm: 'HS256',
        expiresIn: env.JWT_EXPIRES_IN,
        jwtid: randomUUID(),
        ...(env.JWT_ISSUER ? { issuer: env.JWT_ISSUER } : {}),
        ...(env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}),
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
}
export function verifyAccessToken(env, token) {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        ...(env.JWT_ISSUER ? { issuer: env.JWT_ISSUER } : {}),
        ...(env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}),
    });
    if (typeof decoded === 'string' || decoded === null) {
        throw new Error('Invalid token payload');
    }
    const { sub, role, typ } = decoded;
    if (typeof sub !== 'string' || !role || typ !== ACCESS_TOKEN_TYP) {
        throw new Error('Invalid access token shape');
    }
    if (role !== 'ADMIN' && role !== 'ENGINEER' && role !== 'VIEWER') {
        throw new Error('Invalid role claim');
    }
    return { sub, role, typ };
}
