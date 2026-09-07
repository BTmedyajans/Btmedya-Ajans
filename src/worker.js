/* BTMEDYA Worker — birleşik API
 * 1) Haber CMS  (D1 tablo: news)        — /api/news, /api/admin/news
 * 2) Medya Kasası (D1 tablo: media, R2) — /api/media*, /api/public/media, /api/export, /media/*, /api/login, /api/logout
 * Statik dosyalar env.ASSETS üzerinden servis edilir.
 */

const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...headers}});
const text = (data, status=200, headers={}) => new Response(data, {status, headers:{'content-type':'text/plain; charset=utf-8', ...headers}});

/* ---------- yardımcılar (medya kasası) ---------- */
function b64url(bytes){ return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
async function hmac(secret, message){ const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']); return b64url(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message))); }
async function sessionToken(secret){ const payload=b64url(new TextEncoder().encode(JSON.stringify({iat:Date.now(),exp:Date.now()+7*86400000,role:'admin'}))); return payload+'.'+await hmac(secret,payload); }
async function validSession(request, secret){
  if(!secret) return false;
  const c=request.headers.get('cookie')||''; const m=c.match(/bt_admin=([^;]+)/); if(!m) return false;
  const [p,s]=m[1].split('.'); if(!p||!s) return false; const expected=await hmac(secret,p);
  if(s!==expected) return false; try { return JSON.parse(new TextDecoder().decode(unb64url(p))).exp>Date.now(); } catch { return false; }
}
async function signedMediaUrl(request, key, secret, ttl=86400){
  const u=new URL(request.url); const exp=Math.floor(Date.now()/1000)+ttl; const msg=`${key}:${exp}`; const sig=await hmac(secret,msg); return `${u.origin}/media/${key}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}
async function validMediaSig(key, exp, sig, secret){ if(!exp||!sig||Number(exp)<Math.floor(Date.now()/1000)) return false; return (await hmac(secret,`${key}:${exp}`))===sig; }
function safeKey(name){ return name.normalize('NFKD').replace(/[^\w.\-]+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'').toLowerCase(); }
function extFromMime(mime){ const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/wav':'wav','audio/mp4':'m4a','application/pdf':'pdf'}; return map[mime]||'bin'; }
const ALLOWED_MIME = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/mp4','application/pdf']);

/* ---------- Haber CMS API ---------- */
async function newsApi(request, env, url){
  if(url.pathname==='/api/health') return json({ok:true,service:'btmedya',cms:!!env.DB,r2:!!env.MEDIA});
  if(url.pathname==='/api/news' && request.method==='GET'){
    if(!env.DB) return json({ok:true,source:'static',items:[]});
    const limit=Math.min(Number(url.searchParams.get('limit'))||100,100);
    const rows=await env.DB.prepare("SELECT id,slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,updated_at FROM news WHERE status='published' ORDER BY published_at DESC LIMIT ?").bind(limit).all();
    return json({ok:true,items:rows.results});
  }
  if(url.pathname==='/api/admin/news' && request.method==='POST'){
    if(!(await validSession(request, env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD))) return json({ok:false,error:'Yetkisiz'},401);
    if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
    const b=await request.json();
    if(!b.title || !b.slug) return json({ok:false,error:'title and slug required'},400);
    const status=b.status==='published'?'published':'draft';
    const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,category=excluded.category,author=excluded.author,cover_url=excluded.cover_url,video_url=excluded.video_url,status=excluded.status,published_at=excluded.published_at,updated_at=excluded.updated_at`)
      .bind(b.slug,b.title,b.excerpt||'',b.body||'',b.category||'',b.author||'',b.cover_url||'',b.video_url||'',status,status==='published'?(b.published_at||now):null,now).run();
    return json({ok:true,slug:b.slug,status});
  }
  return null;
}

/* ---------- İletişim Formu API ---------- */
async function contactApi(request, env, url){
  if(url.pathname==='/api/contact' && request.method==='POST'){
    if(!env.DB) return json({ok:false,error:'Veritabanı yapılandırılmadı'},503);
    const b=await request.json().catch(()=>({}));
    if(!b.name||!b.email||!b.message) return json({ok:false,error:'Ad, e-posta ve mesaj zorunludur'},400);
    if(b.message.length>5000) return json({ok:false,error:'Mesaj çok uzun'},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return json({ok:false,error:'Geçersiz e-posta adresi'},400);
    if(b._honey) return json({ok:true});
    await env.DB.prepare('INSERT INTO contact_messages(name,email,phone,subject,message) VALUES(?,?,?,?,?)')
      .bind(b.name,b.email,b.phone||'',b.subject||'',b.message).run();
    return json({ok:true,message:'Mesajınız alındı, teşekkürler!'});
  }
  if(url.pathname==='/api/admin/contact' && request.method==='GET'){
    if(!(await validSession(request, env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD))) return json({ok:false,error:'Yetkisiz'},401);
    const rows=await env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200').all();
    return json({ok:true,items:rows.results});
  }
  const markRead=url.pathname.match(/^\/api\/admin\/contact\/(\d+)$/);
  if(markRead && request.method==='PATCH'){
    if(!(await validSession(request, env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD))) return json({ok:false,error:'Yetkisiz'},401);
    await env.DB.prepare('UPDATE contact_messages SET read=1 WHERE id=?').bind(Number(markRead[1])).run();
    return json({ok:true});
  }
  return null;
}

/* ---------- Medya Kasası API ---------- */
async function mediaApi(request, env){
  const u=new URL(request.url); const path=u.pathname;
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,PUT,OPTIONS','access-control-allow-headers':'Content-Type, Authorization'}});

  if(path==='/api/login' && request.method==='POST'){
    const body=await request.json().catch(()=>({}));
    if(!env.ADMIN_PASSWORD || body.password!==env.ADMIN_PASSWORD) return json({error:'Geçersiz şifre'},401);
    const token=await sessionToken(env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD);
    return json({ok:true},200,{'set-cookie':`bt_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`});
  }
  if(path==='/api/logout') return new Response(null,{status:204,headers:{'set-cookie':'bt_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'}});

  if(path==='/api/public/media' && request.method==='GET') {
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type, Authorization'};
    if(!env.DB) return json({brand:'BTMedya',generated_at:new Date().toISOString(),items:[]},200,cors);
    const q=u.searchParams.get('q')||''; const cat=u.searchParams.get('category')||'';
    let sql='SELECT id,key,original_name,mime,size,category,tags,title,description,alt_text,slot,sort_order,created_at,updated_at FROM media WHERE published=1'; const args=[];
    if(q){sql+=' AND (original_name LIKE ? OR title LIKE ? OR description LIKE ? OR tags LIKE ?)'; const x=`%${q}%`; args.push(x,x,x,x);}
    if(cat){sql+=' AND category=?'; args.push(cat);}
    sql+=' ORDER BY created_at DESC LIMIT 200';
    const r=await env.DB.prepare(sql).bind(...args).all();
    const items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),url:await signedMediaUrl(request,x.key,env.MEDIA_SIGNING_SECRET||env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD,Number(env.MEDIA_PUBLIC_TTL||3600))})));
    return json({brand:'BTMedya',generated_at:new Date().toISOString(),items},200,cors);
  }

  const aiToken=env.AI_READ_TOKEN;
  const bearer=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  const aiRead=(aiToken && bearer===aiToken);
  const auth=aiRead || await validSession(request,env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD);
  if(!auth) return json({error:'Yetkisiz'},401);

  if(path==='/api/media' && request.method==='GET'){
    const q=u.searchParams.get('q')||''; const cat=u.searchParams.get('category')||''; const pub=u.searchParams.get('published');
    let sql='SELECT * FROM media WHERE 1=1'; const args=[];
    if(q){sql+=' AND (original_name LIKE ? OR title LIKE ? OR description LIKE ? OR tags LIKE ?)'; const x=`%${q}%`; args.push(x,x,x,x);}
    if(cat){sql+=' AND category=?';args.push(cat);} if(pub!==null){sql+=' AND published=?';args.push(pub==='1'?1:0);} sql+=' ORDER BY created_at DESC LIMIT 500';
    const r=await env.DB.prepare(sql).bind(...args).all();
    const items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),url:await signedMediaUrl(request,x.key,env.MEDIA_SIGNING_SECRET||env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD,Number(env.MEDIA_PUBLIC_TTL||86400))})));
    return json({items});
  }
  if(path==='/api/media' && request.method==='POST'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const body=await request.json();
    const mime = ALLOWED_MIME.has(body.mime) ? body.mime : 'application/octet-stream';
    const id=crypto.randomUUID(); const now=new Date().toISOString();
    const key=`${body.category||'arsiv'}/${id}-${safeKey(body.original_name||('media.'+extFromMime(mime)))}`;
    await env.DB.prepare('INSERT INTO media (id,key,original_name,mime,size,category,tags,title,description,alt_text,published,slot,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,key,body.original_name||key,mime,Number(body.size||0),body.category||'arsiv',JSON.stringify(body.tags||[]),body.title||'',body.description||'',body.alt_text||'',body.published?1:0,body.slot||'',Number(body.sort_order||0),now,now).run();
    const m=await env.MEDIA.createMultipartUpload(key,{httpMetadata:{contentType:mime}});
    return json({id,key,uploadId:m.uploadId});
  }
  const mp=path.match(/^\/api\/upload\/([^/]+)\/part$/);
  if(mp && request.method==='PUT'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const key=decodeURIComponent(mp[1]); const uploadId=u.searchParams.get('uploadId'); const partNumber=Number(u.searchParams.get('partNumber')); if(!uploadId||!partNumber||!request.body)return json({error:'Eksik multipart parametresi'},400);
    const up=env.MEDIA.resumeMultipartUpload(key,uploadId); const p=await up.uploadPart(partNumber,request.body); return json(p);
  }
  const comp=path.match(/^\/api\/upload\/([^/]+)\/complete$/);
  if(comp && request.method==='POST'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const key=decodeURIComponent(comp[1]); const uploadId=u.searchParams.get('uploadId'); const body=await request.json(); const up=env.MEDIA.resumeMultipartUpload(key,uploadId); const obj=await up.complete(body.parts||[]); return json({ok:true,etag:obj.httpEtag});
  }
  const del=path.match(/^\/api\/media\/([^/]+)$/);
  if(del && request.method==='DELETE'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const id=del[1]; const row=await env.DB.prepare('SELECT key FROM media WHERE id=?').bind(id).first(); if(!row)return json({error:'Bulunamadı'},404); await env.MEDIA.delete(row.key); await env.DB.prepare('DELETE FROM media WHERE id=?').bind(id).run(); return json({ok:true});
  }
  const upd=path.match(/^\/api\/media\/([^/]+)$/);
  if(upd && request.method==='PATCH'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const id=upd[1], body=await request.json(), now=new Date().toISOString();
    await env.DB.prepare('UPDATE media SET title=?,description=?,alt_text=?,category=?,tags=?,published=?,slot=?,sort_order=?,updated_at=? WHERE id=?').bind(body.title||'',body.description||'',body.alt_text||'',body.category||'arsiv',JSON.stringify(body.tags||[]),body.published?1:0,body.slot||'',Number(body.sort_order||0),now,id).run(); return json({ok:true});
  }
  if(path==='/api/export'){
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type, Authorization'};
    const r=await env.DB.prepare('SELECT * FROM media WHERE published=1 ORDER BY created_at DESC').all();
    const items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),url:await signedMediaUrl(request,x.key,env.MEDIA_SIGNING_SECRET||env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD,Number(env.MEDIA_PUBLIC_TTL||86400))})));
    return json({generated_at:new Date().toISOString(),brand:'BTMedya',items},200,cors);
  }
  return null;
}

export default { async fetch(request, env){
  const url = new URL(request.url);

  if(url.hostname.startsWith('www.')){
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }

  if(url.pathname.startsWith('/media/')){
    const key=decodeURIComponent(url.pathname.slice('/media/'.length));
    const ok=await validMediaSig(key,url.searchParams.get('exp'),url.searchParams.get('sig'),env.MEDIA_SIGNING_SECRET||env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD);
    if(!ok) return text('Geçersiz veya süresi dolmuş medya bağlantısı',403);
    if(!env.MEDIA) return text('Medya deposu yapılandırılmadı',503);
    const obj=await env.MEDIA.get(key); if(!obj)return text('Medya bulunamadı',404);
    return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'application/octet-stream','cache-control':'public, max-age=86400'}});
  }

  if(url.pathname.startsWith('/api/')){
    const r1 = await newsApi(request, env, url);
    if(r1) return r1;
    if(env.DB){
      const rc = await contactApi(request, env, url);
      if(rc) return rc;
    }
    if(env.DB && env.MEDIA){
      const r2 = await mediaApi(request, env);
      if(r2) return r2;
    }
    return json({ok:false,error:'Not found'},404);
  }

  return env.ASSETS.fetch(request);
} };
