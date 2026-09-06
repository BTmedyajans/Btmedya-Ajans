import { json, notFound, unauthorized, badRequest } from './lib/http.js';
import { isAuthed, createSessionCookie, clearSessionCookie, checkPassword } from './lib/auth.js';
import { signedMediaUrl, verifyMediaSignature, toPublicItem, buildObjectKey } from './lib/media.js';
import { getAllNews, findNewsBySlug, renderNewsList, renderNewsArticle, upsertNews } from './lib/news.js';

function isSecure(request) {
  return new URL(request.url).protocol === 'https:';
}

async function requireAuth(request, env) {
  if (!(await isAuthed(request, env))) return unauthorized();
  return null;
}

async function handleHealth(env) {
  let cms = false;
  let r2 = false;
  try {
    await env.DB.prepare('SELECT 1').first();
    cms = true;
  } catch {}
  try {
    await env.MEDIA.head('__healthcheck__');
    r2 = true;
  } catch {}
  return json({ ok: true, service: 'btmedya', cms, r2 });
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Geçersiz istek');
  }
  const ok = await checkPassword(env, body.password);
  if (!ok) return unauthorized('Şifre hatalı');
  const cookie = await createSessionCookie(env, isSecure(request));
  return json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
}

function handleLogout(request) {
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(isSecure(request)) } });
}

async function handleMediaList(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category') || '';
  const { results } = await env.DB.prepare(
    `SELECT * FROM media
     WHERE (?1 = '' OR title LIKE '%' || ?1 || '%' OR original_name LIKE '%' || ?1 || '%')
       AND (?2 = '' OR category = ?2)
     ORDER BY sort_order ASC, created_at DESC`
  )
    .bind(q, category)
    .all();
  const items = await Promise.all((results || []).map((row) => toPublicItem(env, row)));
  return json({ items });
}

async function handleMediaCreate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Geçersiz istek');
  }
  if (!body.original_name || !body.mime) return badRequest('original_name ve mime zorunlu');
  const id = crypto.randomUUID();
  const category = body.category || 'arsiv';
  const key = buildObjectKey(category, body.original_name, id);
  const now = new Date().toISOString();

  const multipart = await env.MEDIA.createMultipartUpload(key, {
    httpMetadata: { contentType: body.mime },
  });

  await env.DB.prepare(
    `INSERT INTO media (id, key, original_name, mime, size, category, tags, title, description, alt_text, published, slot, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '[]', ?, '', '', 0, '', 0, ?, ?)`
  )
    .bind(id, key, body.original_name, body.mime, body.size || 0, category, body.original_name, now, now)
    .run();

  return json({ id, key, uploadId: multipart.uploadId });
}

async function handleUploadPart(request, env, key) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get('uploadId');
  const partNumber = Number(url.searchParams.get('partNumber'));
  if (!uploadId || !partNumber || !request.body) return badRequest('uploadId ve partNumber zorunlu');
  const multipart = env.MEDIA.resumeMultipartUpload(key, uploadId);
  const part = await multipart.uploadPart(partNumber, request.body);
  return json({ partNumber: part.partNumber, etag: part.etag });
}

async function handleUploadComplete(request, env, key) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get('uploadId');
  if (!uploadId) return badRequest('uploadId zorunlu');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Geçersiz istek');
  }
  if (!Array.isArray(body.parts)) return badRequest('parts zorunlu');
  const multipart = env.MEDIA.resumeMultipartUpload(key, uploadId);
  await multipart.complete(body.parts);
  return json({ ok: true });
}

async function handleMediaPatch(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Geçersiz istek');
  }
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare('SELECT id FROM media WHERE id = ?').bind(id).all();
  if (!results || !results.length) return notFound('Medya bulunamadı');

  await env.DB.prepare(
    `UPDATE media SET
       title = ?, slot = ?, alt_text = ?, tags = ?, category = ?, published = ?, sort_order = ?, description = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      body.title ?? '',
      body.slot ?? '',
      body.alt_text ?? '',
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      body.category ?? 'arsiv',
      body.published ? 1 : 0,
      Number.isFinite(body.sort_order) ? body.sort_order : 0,
      body.description ?? '',
      now,
      id
    )
    .run();

  return json({ ok: true });
}

async function handleMediaDelete(env, id) {
  const { results } = await env.DB.prepare('SELECT key FROM media WHERE id = ?').bind(id).all();
  if (!results || !results.length) return notFound('Medya bulunamadı');
  const { key } = results[0];
  await env.MEDIA.delete(key);
  await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function handleExport(request, env) {
  if (env.AI_READ_TOKEN) {
    const url = new URL(request.url);
    const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || url.searchParams.get('token');
    if (provided !== env.AI_READ_TOKEN) return unauthorized('Geçersiz erişim anahtarı');
  }
  const { results } = await env.DB.prepare(
    `SELECT * FROM media WHERE published = 1 ORDER BY sort_order ASC, created_at DESC`
  ).all();
  const items = await Promise.all((results || []).map((row) => toPublicItem(env, row, 6 * 60 * 60)));
  return json({ items });
}

async function handlePublicMedia(request, env) {
  const url = new URL(request.url);
  const slot = url.searchParams.get('slot') || '';
  const category = url.searchParams.get('category') || '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 12, 50);
  const { results } = await env.DB.prepare(
    `SELECT * FROM media
     WHERE published = 1
       AND (?1 = '' OR slot = ?1)
       AND (?2 = '' OR category = ?2)
     ORDER BY sort_order ASC, created_at DESC
     LIMIT ?3`
  )
    .bind(slot, category, limit)
    .all();
  const items = await Promise.all((results || []).map((row) => toPublicItem(env, row, 6 * 60 * 60)));
  return json({ items });
}

async function handleSignedMedia(request, env, key) {
  const url = new URL(request.url);
  const exp = url.searchParams.get('exp');
  const sig = url.searchParams.get('sig');
  const valid = await verifyMediaSignature(env, key, exp, sig);
  if (!valid) return unauthorized('Geçersiz veya süresi dolmuş bağlantı');
  const object = await env.MEDIA.get(key);
  if (!object) return notFound('Dosya bulunamadı');
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=3600');
  return new Response(object.body, { headers });
}

async function handleAdminNews(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Geçersiz istek');
  }
  if (!body.title || !body.slug) return badRequest('Başlık ve slug zorunlu');
  await upsertNews(env, body);
  return json({ ok: true });
}

async function handleNewsList(request, env) {
  const items = await getAllNews(env, request);
  return new Response(renderNewsList(items), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

async function handleNewsArticle(request, env, slug) {
  const item = await findNewsBySlug(env, request, slug);
  if (!item) return env.ASSETS.fetch(request);
  return new Response(renderNewsArticle(item), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/api/health') return handleHealth(env);

      if (path === '/api/login' && method === 'POST') return handleLogin(request, env);
      if (path === '/api/logout') return handleLogout(request);

      if (path === '/api/media' && method === 'GET') {
        const authErr = await requireAuth(request, env);
        if (authErr) return authErr;
        return handleMediaList(request, env);
      }
      if (path === '/api/media' && method === 'POST') {
        const authErr = await requireAuth(request, env);
        if (authErr) return authErr;
        return handleMediaCreate(request, env);
      }

      const partMatch = path.match(/^\/api\/upload\/(.+)\/part$/);
      if (partMatch && method === 'PUT') {
        const authErr = await requireAuth(request, env);
        if (authErr) return authErr;
        return handleUploadPart(request, env, decodeURIComponent(partMatch[1]));
      }

      const completeMatch = path.match(/^\/api\/upload\/(.+)\/complete$/);
      if (completeMatch && method === 'POST') {
        const authErr = await requireAuth(request, env);
        if (authErr) return authErr;
        return handleUploadComplete(request, env, decodeURIComponent(completeMatch[1]));
      }

      const mediaIdMatch = path.match(/^\/api\/media\/([^/]+)$/);
      if (mediaIdMatch && method === 'PATCH') {
        const authErr = await requireAuth(request, env);
        if (authErr) return authErr;
        return handleMediaPatch(request, env, mediaIdMatch[1]);
      }
      if (mediaIdMatch && method === 'DELETE') {
        const authErr = await requireAuth(request, env);
        if (authErr) return authErr;
        return handleMediaDelete(env, mediaIdMatch[1]);
      }

      if (path === '/api/export') return handleExport(request, env);
      if (path === '/api/public/media') return handlePublicMedia(request, env);

      if (path === '/api/admin/news' && method === 'POST') {
        const authErr = await requireAuth(request, env);
        if (authErr) return authErr;
        return handleAdminNews(request, env);
      }

      const mediaFileMatch = path.match(/^\/media\/(.+)$/);
      if (mediaFileMatch) return handleSignedMedia(request, env, decodeURIComponent(mediaFileMatch[1]));

      if (path === '/haberler/' || path === '/haberler') {
        return handleNewsList(request, env);
      }
      const articleMatch = path.match(/^\/haberler\/([a-z0-9-]+)\.html$/i);
      if (articleMatch) return handleNewsArticle(request, env, articleMatch[1]);

      return env.ASSETS.fetch(request);
    } catch (err) {
      return json({ ok: false, error: 'Sunucu hatası', detail: String(err && err.message ? err.message : err) }, { status: 500 });
    }
  },
};
