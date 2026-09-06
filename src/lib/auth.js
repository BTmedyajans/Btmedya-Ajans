import { hmacSign, timingSafeEqual } from './crypto.js';

const COOKIE_NAME = 'btm_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 saat

export function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function isAuthed(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return false;
  const cookies = parseCookies(request);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() / 1000 > exp) return false;
  const expected = await hmacSign(env.ADMIN_SESSION_SECRET, expStr);
  return timingSafeEqual(expected, sig);
}

export async function createSessionCookie(env, secure) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await hmacSign(env.ADMIN_SESSION_SECRET, String(exp));
  const token = `${exp}.${sig}`;
  const attrs = [`${COOKIE_NAME}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_TTL_SECONDS}`];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearSessionCookie(secure) {
  const attrs = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export async function checkPassword(env, password) {
  if (!env.ADMIN_PASSWORD || typeof password !== 'string') return false;
  return timingSafeEqual(env.ADMIN_PASSWORD, password);
}
