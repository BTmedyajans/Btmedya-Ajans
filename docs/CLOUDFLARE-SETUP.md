# Cloudflare setup for btmedya.com.tr

This document explains the script included at `scripts/cf-setup.sh` which automates
adding the required Cloudflare DNS records and Workers routes to point
`btmedya.com.tr` and `www.btmedya.com.tr` to the Cloudflare Worker `btmedya-db`.

IMPORTANT: This repository does NOT and SHOULD NOT contain your Cloudflare API token.
Run the script locally and provide the token via environment variable.

## What the script does
- Ensures `www.btmedya.com.tr` is a proxied CNAME to the apex (`btmedya.com.tr`).
- Ensures the apex (@) has A records (adds example Cloudflare edge IPs if none exist).
- Adds zone-scoped Workers routes: `btmedya.com.tr/*` and `www.btmedya.com.tr/*` pointing
  to the `btmedya-db` worker (default). You can override the worker name via
  the `WORKER_NAME` environment variable.

## Prerequisites
- `curl` and `jq` installed on your machine.
- A Cloudflare API Token created with the following permissions (scoped to the zone):
  - Zone:Read
  - Zone:DNS:Edit
  - Zone:Workers Routes:Edit

## Usage
1. Create a Cloudflare API token and copy it.
2. Run the script locally:

```bash
CF_API_TOKEN=PASTE_YOUR_TOKEN_HERE ZONE_NAME=btmedya.com.tr ./scripts/cf-setup.sh
```

Or set env vars and run:

```bash
export CF_API_TOKEN=PASTE_YOUR_TOKEN_HERE
export ZONE_NAME=btmedya.com.tr
./scripts/cf-setup.sh
```

## Tests (after running)
- `curl -I https://www.btmedya.com.tr` — expected 301 redirect (worker redirects www → non‑www)
- `curl https://btmedya.com.tr/api/health` — expected JSON like
  `{"ok":true,"service":"btmedya","cms":true,"r2":true}` depending on env bindings.

## Security notes
- Do not commit or share your CF API token. Revoke the token after use if you want.
- If your worker has a different name than `btmedya-db`, re-run the script with `WORKER_NAME=actual-name`.

