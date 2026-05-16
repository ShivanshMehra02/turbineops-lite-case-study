import { describe, expect, it } from '@jest/globals';
import { signAccessToken, verifyAccessToken } from '../utils/jwt';
const testEnv = {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://localhost:5432/x',
    JWT_SECRET: 'unit-test-secret-at-least-32-characters-long',
    JWT_EXPIRES_IN: '15m',
    JWT_ISSUER: undefined,
    JWT_AUDIENCE: undefined,
    MONGO_URL: 'mongodb://localhost:27017',
    MONGO_DB: 'turbineops',
};
describe('jwt access tokens', () => {
    it('roundtrips signed claims', () => {
        const token = signAccessToken(testEnv, { sub: 'user_1', role: 'ENGINEER' });
        const claims = verifyAccessToken(testEnv, token);
        expect(claims.sub).toBe('user_1');
        expect(claims.role).toBe('ENGINEER');
        expect(claims.typ).toBe('access');
    });
    it('rejects tampered tokens', () => {
        const token = signAccessToken(testEnv, { sub: 'user_1', role: 'VIEWER' });
        const busted = `${token.slice(0, -4)}XXXX`;
        expect(() => verifyAccessToken(testEnv, busted)).toThrow();
    });
});
