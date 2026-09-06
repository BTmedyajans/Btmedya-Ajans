import { hmacSign, timingSafeEqual } from './crypto.js';

const DEFAULT_TTL = 60 * 60; // 1 saat

export async function signedMediaUrl(env, key, ttlSeconds = DEFAULT_TTL) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmacSign(env.MEDIA_SIGNING_SECRET, `${key}:${exp}`);
  return `/media/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}`;
}

export async function verifyMediaSignature(env, key, exp, sig) {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || Date.now() / 1000 > expNum) return false;
  const expected = await hmacSign(env.MEDIA_SIGNING_SECRET, `${key}:${exp}`);
  return timingSafeEqual(expected, sig);
}

export function parseTags(raw) {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function toPublicItem(env, row, ttlSeconds) {
  return {
    id: row.id,
    key: row.key,
    original_name: row.original_name,
    mime: row.mime,
    size: row.size,
    category: row.category,
    tags: parseTags(row.tags),
    title: row.title,
    description: row.description,
    alt_text: row.alt_text,
    published: !!row.published,
    slot: row.slot,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    url: await signedMediaUrl(env, row.key, ttlSeconds),
  };
}

function slugifyName(name) {
  return String(name || 'dosya')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'dosya';
}

export function buildObjectKey(category, originalName, id) {
  const safeCategory = /^[a-z0-9-]+$/i.test(category || '') ? category : 'arsiv';
  const safeName = slugifyName(originalName);
  return `${safeCategory}/${Date.now()}-${id}-${safeName}`;
}
