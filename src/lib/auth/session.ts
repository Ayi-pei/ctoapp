import crypto from 'crypto';

// Simple HS256 JWT implementation without external deps
// Payload will carry: sub (userId), iat, exp

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return secret;
}

export function signSession(userId: string, ttlSeconds?: number): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(process.env.SESSION_TTL || ttlSeconds || 86400);
  const payload: SessionPayload = {
    sub: userId,
    iat: now,
    exp: now + ttl,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest();
  const encodedSignature = base64url(signature);
  return `${data}.${encodedSignature}`;
}

export function verifySession(token?: string): { valid: boolean; userId?: string; reason?: string } {
  try {
    if (!token) return { valid: false, reason: 'missing' };
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'format' };
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const expected = base64url(
      crypto.createHmac('sha256', getSecret()).update(data).digest()
    );
    if (!crypto.timingSafeEqual(Buffer.from(encodedSignature), Buffer.from(expected))) {
      return { valid: false, reason: 'signature' };
    }
    const payloadJson = Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || now >= payload.exp) {
      return { valid: false, reason: 'expired' };
    }
    if (!payload.sub) return { valid: false, reason: 'no-sub' };
    return { valid: true, userId: payload.sub };
  } catch (e) {
    return { valid: false, reason: 'error' };
  }
}

export const sessionCookieName = 'session';

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
};

export function getDefaultCookieOptions(): CookieOptions {
  const ttl = Number(process.env.SESSION_TTL || 86400);
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd, // in dev you may keep false
    sameSite: 'strict',
    maxAge: ttl,
    path: '/',
  };
}
