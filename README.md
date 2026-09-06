# BTMedya Worker

Minimal Cloudflare Workers projesi iskeleti, BTmedya için.

Kısa kullanım:

- Yerelde test:
  - npm ci
  - npx wrangler dev

- Publish (lokalde veya CI):
  - npx wrangler publish

CI (GitHub Actions) otomatik deploy eklenmiştir. Repo ayarlarına aşağıdaki secrets eklenmelidir:

- CF_ACCOUNT_ID
- CF_API_TOKEN

Notlar:
- wrangler.toml içindeki account_id değerini doğrudan repoya koymayın; CI için GitHub Secrets kullanın.
- Bu iskelet basit bir HTML yanıtı döner ve /health endpoint'i sağlar.
