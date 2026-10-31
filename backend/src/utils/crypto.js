import crypto from 'node:crypto';

export const generateToken = () => crypto.randomBytes(32).toString('hex');

export const randomHex = (bytes = 3) => crypto.randomBytes(bytes).toString('hex');

/** Tokens are stored only as SHA-256 hashes. */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Constant-time comparison for secrets. */
export function safeEqual(a = '', b = '') {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
