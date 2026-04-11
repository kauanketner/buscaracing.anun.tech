import { NextRequest } from 'next/server';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Anuntech@10';
const SESSION_COOKIE = 'admin_session';

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function createSession(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return !!token && token.length > 0;
}

export { SESSION_COOKIE };
