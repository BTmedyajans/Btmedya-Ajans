import { escapeHtml } from './http.js';
import { layout } from './layout.js';

const SITE_ORIGIN = 'https://www.btmedya.com.tr';

async function getStaticNews(env, request) {
  const url = new URL('/data/haberler.json', request.url);
  const res = await env.ASSETS.fetch(new Request(url));
  if (!res.ok) return [];
  try {
    return await res.json();
  } catch {
    return [];
  }
}

async function getPublishedD1News(env) {
  const { results } = await env.DB.prepare(
    `SELECT slug, title, excerpt, body, category, author, cover_url, video_url, published_at
     FROM news WHERE status = 'published' ORDER BY published_at DESC`
  ).all();
  return (results || []).map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt || '',
    body: r.body || '',
    category: r.category || 'Yerel',
    author: r.author || 'BTMEDYA',
    cover_url: r.cover_url || '',
    video_url: r.video_url || '',
    date: r.published_at,
    source: 'd1',
    placeholder: false,
  }));
}

function dateValue(item) {
  const t = Date.parse(item.date || '');
  return Number.isFinite(t) ? t : 0;
}

export async function getAllNews(env, request) {
  const [staticItems, d1Items] = await Promise.all([
    getStaticNews(env, request),
    getPublishedD1News(env),
  ]);
  const bySlug = new Map();
  for (const item of staticItems) bySlug.set(item.slug, item);
  for (const item of d1Items) bySlug.set(item.slug, item); // D1 canlı yayın statik arşivin önüne geçer
  return [...bySlug.values()].sort((a, b) => dateValue(b) - dateValue(a));
}

export async function findNewsBySlug(env, request, slug) {
  const all = await getAllNews(env, request);
  return all.find((n) => n.slug === slug) || null;
}

function formatDate(dateStr) {
  const t = Date.parse(dateStr || '');
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function renderNewsList(items) {
  const cards = items
    .map((n) => `<a class="archive-card" href="/haberler/${escapeHtml(n.slug)}.html">
        <small>${escapeHtml(n.category || 'BTMEDYA')}</small>
        <h3>${escapeHtml(n.title)}</h3>
        <p>${escapeHtml(n.placeholder ? 'İçerik güncelleniyor.' : n.excerpt)}</p>
        <div class="meta">${escapeHtml(formatDate(n.date))}</div>
      </a>`)
    .join('\n');

  const body = `<section class="archive-page">
      <p class="eyebrow">GÜNCEL / ARŞİV</p>
      <h1>Haberin <span>ritmi</span> burada.</h1>
      <p class="archive-sub">Balıkesir ve çevresinden doğrulanmış saha haberleri, BTMEDYA arşivinden.</p>
      <div class="archive-grid">
        ${cards || '<p class="muted">Henüz yayınlanmış haber yok.</p>'}
      </div>
    </section>`;

  return layout({
    title: 'Haberler — BTMEDYA',
    description: 'BTMEDYA haber arşivi: Balıkesir ve çevresinden doğrulanmış saha haberleri.',
    canonical: `${SITE_ORIGIN}/haberler/`,
    bodyHtml: body,
  });
}

export function renderNewsArticle(item) {
  const isPlaceholder = !!item.placeholder;
  const bodyParagraphs = isPlaceholder
    ? '<p>Bu haberin tam metni yayına hazırlanıyor. Kısa süre içinde bu sayfada erişime açılacaktır.</p>'
    : (item.body || item.excerpt || '')
        .split(/\n+/)
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('\n');

  const body = `<article class="article-page">
      <a class="article-back" href="/haberler/">← Haber Arşivi</a>
      <p class="article-eyebrow">${escapeHtml(item.category || 'BTMEDYA')}</p>
      <h1>${escapeHtml(item.title)}</h1>
      <div class="article-meta">
        <span>${escapeHtml(item.author || 'BTMEDYA')}</span>
        <span>${escapeHtml(formatDate(item.date))}</span>
      </div>
      <div class="article-body">
        ${bodyParagraphs}
      </div>
      ${isPlaceholder ? '<p class="article-note">Bu sayfa geçici bir bekleme içeriğidir; kaynak metin editör ekibi tarafından eklendiğinde güncellenecektir.</p>' : ''}
    </article>`;

  return layout({
    title: `${item.title} — BTMEDYA`,
    description: (item.excerpt || item.title).slice(0, 160),
    canonical: `${SITE_ORIGIN}/haberler/${item.slug}.html`,
    bodyHtml: body,
  });
}

export async function upsertNews(env, payload) {
  const now = new Date().toISOString();
  const status = payload.status === 'published' ? 'published' : 'draft';
  const publishedAt = status === 'published' ? now : null;
  await env.DB.prepare(
    `INSERT INTO news (slug, title, excerpt, body, category, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       excerpt = excluded.excerpt,
       body = excluded.body,
       category = excluded.category,
       status = excluded.status,
       published_at = excluded.published_at,
       updated_at = excluded.updated_at`
  )
    .bind(
      payload.slug,
      payload.title,
      payload.excerpt || '',
      payload.body || '',
      payload.category || '',
      status,
      publishedAt,
      now,
      now
    )
    .run();
}
