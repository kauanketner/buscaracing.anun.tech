/**
 * Autenticação do módulo /v (PWA dos vendedores).
 *
 * Mesma arquitetura do mecanico-auth:
 * - PIN de 6 dígitos (reusa hashPin/verifyPin do mecanico-auth)
 * - Cookie `vendedor_session` HMAC-assinado
 * - Rate limit via vendedor_login_attempts
 * - Sessão 30 dias
 */
import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getDb } from './db';
import { hashPin, verifyPin } from './mecanico-auth';

export { hashPin, verifyPin };

export const VENDEDOR_COOKIE = 'vendedor_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX_FAILS = 5;

function getSessionSecret(): string {
  return (
    process.env.VENDEDOR_SESSION_SECRET ||
    'dev-only-vendedor-secret-change-in-production-99999'
  );
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4);
  const padded = pad < 4 ? s + '='.repeat(pad) : s;
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function createVendedorSession(vendedorId: number): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${vendedorId}.${exp}.${nonce}`;
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest();
  return `${b64url(Buffer.from(payload))}.${b64url(sig)}`;
}

export function parseVendedorSession(
  token: string | undefined | null,
): { vendedorId: number } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  let sig: Buffer;
  try {
    payload = b64urlDecode(payloadB64).toString('utf8');
    sig = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest();
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(sig, expected)) return null;
  const [idStr, expStr] = payload.split('.');
  const vendedorId = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isFinite(vendedorId) || !Number.isFinite(exp)) return null;
  if (Date.now() > exp) return null;
  return { vendedorId };
}

export type VendedorRow = { id: number; nome: string; tipo: string; pin_ativo: number };

export function loadActiveVendedor(vendedorId: number): VendedorRow | null {
  const db = getDb();
  const row = db
    .prepare('SELECT id, nome, tipo, pin_ativo FROM vendedores WHERE id=? AND ativo=1')
    .get(vendedorId) as VendedorRow | undefined;
  if (!row || !row.pin_ativo) return null;
  return row;
}

export function getVendedorFromRequest(request: NextRequest): VendedorRow | null {
  const token = request.cookies.get(VENDEDOR_COOKIE)?.value;
  const parsed = parseVendedorSession(token);
  if (!parsed) return null;
  return loadActiveVendedor(parsed.vendedorId);
}

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function isRateLimited(ip: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM vendedor_login_attempts
       WHERE ip=? AND success=0 AND created_at >= datetime('now', ?)`,
    )
    .get(ip, `-${RATE_LIMIT_WINDOW_MIN} minutes`) as { n: number };
  return row.n >= RATE_LIMIT_MAX_FAILS;
}

export function recordLoginAttempt(ip: string, vendedorId: number | null, success: boolean): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO vendedor_login_attempts (ip, vendedor_id, success) VALUES (?, ?, ?)',
  ).run(ip, vendedorId, success ? 1 : 0);
}

export type LoginResult =
  | { ok: true; vendedor: VendedorRow; token: string }
  | { ok: false; reason: 'rate_limited' | 'invalid_pin' };

export function attemptLogin(pin: string, ip: string): LoginResult {
  if (isRateLimited(ip)) return { ok: false, reason: 'rate_limited' };
  const db = getDb();
  const rows = db
    .prepare('SELECT id, nome, tipo, pin_hash, pin_ativo FROM vendedores WHERE ativo=1 AND pin_ativo=1')
    .all() as { id: number; nome: string; tipo: string; pin_hash: string; pin_ativo: number }[];
  for (const r of rows) {
    if (!r.pin_hash) continue;
    if (verifyPin(pin, r.pin_hash)) {
      recordLoginAttempt(ip, r.id, true);
      const token = createVendedorSession(r.id);
      return { ok: true, vendedor: { id: r.id, nome: r.nome, tipo: r.tipo, pin_ativo: r.pin_ativo }, token };
    }
  }
  recordLoginAttempt(ip, null, false);
  return { ok: false, reason: 'invalid_pin' };
}

export const VENDEDOR_SESSION_TTL_MS = SESSION_TTL_MS;

export function getVendedorSlug(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='vendedor_url_slug'")
    .get() as { valor: string } | undefined;
  return row?.valor || '';
}
