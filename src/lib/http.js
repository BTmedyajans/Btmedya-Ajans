export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function html(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(body, { ...init, headers });
}

export function notFound(message = 'Not found') {
  return json({ ok: false, error: message }, { status: 404 });
}

export function unauthorized(message = 'Unauthorized') {
  return json({ ok: false, error: message }, { status: 401 });
}

export function badRequest(message = 'Bad request') {
  return json({ ok: false, error: message }, { status: 400 });
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}
