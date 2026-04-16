/**
 * Autenticação do módulo /mecanico (PWA dos mecânicos).
 *
 * - PIN de 6 dígitos armazenado como scrypt:<salt_b64>:<hash_b64>.
 * - Cookie `mecanico_session` = <payload_b64url>.<sig_b64url>
 *   payload: <mecanico_id>.<exp_ms>.<nonce>
 *   sig:     HMAC-SHA256(payload, MECANICO_SESSION_SECRET)
 * - Rate limit: 5 falhas em 15 min por IP via tabela mecanico_login_attempts.
 * - Sessão dura 30 dias. Toda rota protegida revalida mecanicos.pin_ativo.
 */
import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getDb } from './db';

export const MECANICO_COOKIE = 'mecanico_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX_FAILS = 5;

const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 32;

function getSessionSecret(): string {
  // Em prod precisa ser setada. Em dev cai num default que não serve pra nada
  // de valor — o PWA em dev é pra testes locais.
  return (
    process.env.MECANICO_SESSION_SECRET ||
    'dev-only-mecanico-secret-change-in-production-12345'
  );
}

// ---------------------------------------------------------------------------
// PIN hashing (scrypt nativo do Node)
// ---------------------------------------------------------------------------

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, SCRYPT_KEYLEN, { N: SCRYPT_N });
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, saltB64, hashB64] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, 'base64');
    expected = Buffer.from(hashB64, 'base64');
  } catch {
    return false;
  }
  const actual = crypto.scryptSync(pin, salt, expected.length, { N: SCRYPT_N });
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// Cookie HMAC-assinado
// ---------------------------------------------------------------------------

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4);
  const padded = pad < 4 ? s + '='.repeat(pad) : s;
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function createMecanicoSession(mecanicoId: number): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${mecanicoId}.${exp}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest();
  return `${b64url(Buffer.from(payload))}.${b64url(sig)}`;
}

export function parseMecanicoSession(
  token: string | undefined | null,
): { mecanicoId: number } | null {
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
  const expected = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest();
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(sig, expected)) return null;

  const [idStr, expStr] = payload.split('.');
  const mecanicoId = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isFinite(mecanicoId) || !Number.isFinite(exp)) return null;
  if (Date.now() > exp) return null;
  return { mecanicoId };
}

// ---------------------------------------------------------------------------
// Revalidação (o mecânico foi desativado?)
// ---------------------------------------------------------------------------

export type MecanicoRow = {
  id: number;
  nome: string;
  pin_ativo: number;
};

export function loadActiveMecanico(mecanicoId: number): MecanicoRow | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, nome, pin_ativo FROM mecanicos WHERE id = ? AND ativo = 1',
    )
    .get(mecanicoId) as MecanicoRow | undefined;
  if (!row) return null;
  if (!row.pin_ativo) return null;
  return row;
}

export function getMecanicoFromRequest(
  request: NextRequest,
): MecanicoRow | null {
  const token = request.cookies.get(MECANICO_COOKIE)?.value;
  const parsed = parseMecanicoSession(token);
  if (!parsed) return null;
  return loadActiveMecanico(parsed.mecanicoId);
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function isRateLimited(ip: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM mecanico_login_attempts
       WHERE ip = ? AND success = 0
       AND created_at >= datetime('now', ?)`,
    )
    .get(ip, `-${RATE_LIMIT_WINDOW_MIN} minutes`) as { n: number };
  return row.n >= RATE_LIMIT_MAX_FAILS;
}

export function recordLoginAttempt(
  ip: string,
  mecanicoId: number | null,
  success: boolean,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO mecanico_login_attempts (ip, mecanico_id, success)
     VALUES (?, ?, ?)`,
  ).run(ip, mecanicoId, success ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Slug atual (cache-light: sempre lê do banco — SQLite local é barato)
// ---------------------------------------------------------------------------

export function getCurrentSlug(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='mecanico_url_slug'")
    .get() as { valor: string } | undefined;
  return row?.valor || '';
}

// ---------------------------------------------------------------------------
// Tentativa de login (combina lookup + verify + rate-limit register)
// ---------------------------------------------------------------------------

export type LoginResult =
  | { ok: true; mecanico: MecanicoRow; token: string }
  | { ok: false; reason: 'rate_limited' | 'invalid_pin' };

export function attemptLogin(pin: string, ip: string): LoginResult {
  if (isRateLimited(ip)) {
    return { ok: false, reason: 'rate_limited' };
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, nome, pin_hash, pin_ativo
       FROM mecanicos
       WHERE ativo = 1 AND pin_ativo = 1`,
    )
    .all() as { id: number; nome: string; pin_hash: string; pin_ativo: number }[];

  for (const r of rows) {
    if (!r.pin_hash) continue;
    if (verifyPin(pin, r.pin_hash)) {
      recordLoginAttempt(ip, r.id, true);
      const token = createMecanicoSession(r.id);
      return {
        ok: true,
        mecanico: { id: r.id, nome: r.nome, pin_ativo: r.pin_ativo },
        token,
      };
    }
  }
  recordLoginAttempt(ip, null, false);
  return { ok: false, reason: 'invalid_pin' };
}

export const MECANICO_SESSION_TTL_MS = SESSION_TTL_MS;
