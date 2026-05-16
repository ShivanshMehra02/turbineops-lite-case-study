import bcrypt from 'bcryptjs';

/** Compared when no matching user exists to reduce timing skew vs real accounts (still return a generic error). */
export const DUMMY_PASSWORD_HASH_FOR_TIMING = bcrypt.hashSync('__auth_dummy__', 10);

/** Delegates to bcrypt (comparison runs in effectively constant time for a fixed hash cost). */
export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

/** Used when introducing registration/password-reset flows. */
export async function hashPassword(plain: string, cost = 10): Promise<string> {
  return bcrypt.hash(plain, cost);
}
