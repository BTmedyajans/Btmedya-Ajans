#!/usr/bin/env bash
set -euo pipefail

# cf-setup.sh
# Automated helper to add/repair Cloudflare DNS records and Workers routes
# for a site (example: btmedya.com.tr).
#
# WHAT IT DOES
# - Finds the Cloudflare Zone ID for the given zone name
# - Ensures "www.<zone>" is a CNAME to the apex (proxied)
# - Ensures apex (@) has A records (adds example Cloudflare edge IPs if none)
# - Adds two zone-scoped Workers routes: <zone>/* and www.<zone>/* -> specified worker
#
# SECURITY
# - Create a Cloudflare API Token with only the required permissions (Zone:Read,
#   Zone:DNS:Edit, Zone:Workers Routes:Edit) scoped to the single zone.
# - DO NOT share the token. Run this script on your machine and pass the token
#   via environment variable CF_API_TOKEN.
#
# USAGE
#   CF_API_TOKEN=xxxxx ZONE_NAME=btmedya.com.tr ./scripts/cf-setup.sh
#
# Requirements: curl, jq

if ! command -v curl >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  echo "This script requires curl and jq. Install them and re-run."
  exit 1
fi

if [ -z "${CF_API_TOKEN:-}" ]; then
  echo "Error: CF_API_TOKEN environment variable is not set."
  echo "Create a token in Cloudflare and run: CF_API_TOKEN=YOURTOKEN ZONE_NAME=btmedya.com.tr ./scripts/cf-setup.sh"
  exit 1
fi

ZONE_NAME="${ZONE_NAME:-btmedya.com.tr}"
WORKER_NAME="${WORKER_NAME:-btmedya-db}"
EDGE_IPS=("104.18.26.246" "104.18.27.246")

CF_API="https://api.cloudflare.com/client/v4"
AUTH_HDR="Authorization: Bearer ${CF_API_TOKEN}"
CONTENT_HDR="Content-Type: application/json"

printf "Starting Cloudflare setup for zone: %s (worker: %s)\n" "$ZONE_NAME" "$WORKER_NAME"

# 1) Get Zone ID
ZONE_ID=$(curl -s -X GET "${CF_API}/zones?name=${ZONE_NAME}" -H "${AUTH_HDR}" -H "${CONTENT_HDR}" \
  | jq -r '.result[0].id // empty')

if [ -z "$ZONE_ID" ]; then
  echo "Zone ID not found. Make sure $ZONE_NAME is in your Cloudflare account and your token has Zone:Read scope."
  exit 1
fi

echo "Zone ID: $ZONE_ID"

get_dns_id(){
  local name="$1"; local type="${2:-}"
  local q="${CF_API}/zones/${ZONE_ID}/dns_records?name=${name}"
  if [ -n "$type" ]; then q="${q}&type=${type}"; fi
  curl -s -X GET "$q" -H "${AUTH_HDR}" -H "${CONTENT_HDR}" | jq -r '.result[0].id // empty'
}

create_or_update_dns(){
  local name="$1"; local type="$2"; local content="$3"; local proxied="${4:-true}"
  local existing
  existing=$(get_dns_id "${name}" "${type}")
  local payload
  payload=$(jq -n --arg t "$type" --arg n "$name" --arg c "$content" --argjson p $proxied \
    '{type:$t, name:$n, content:$c, proxied:$p}')
  if [ -n "$existing" ]; then
    echo "Updating DNS: ${name} ${type} -> ${content} (proxied=${proxied})"
    curl -s -X PUT "${CF_API}/zones/${ZONE_ID}/dns_records/${existing}" \
      -H "${AUTH_HDR}" -H "${CONTENT_HDR}" \
      --data "$payload" | jq -r '.success, .errors, .messages, .result.id'
  else
    echo "Creating DNS: ${name} ${type} -> ${content} (proxied=${proxied})"
    curl -s -X POST "${CF_API}/zones/${ZONE_ID}/dns_records" \
      -H "${AUTH_HDR}" -H "${CONTENT_HDR}" \
      --data "$payload" | jq -r '.success, .errors, .messages, .result.id'
  fi
}

# 2) Ensure www -> apex (CNAME proxied)
create_or_update_dns "www.${ZONE_NAME}" "CNAME" "${ZONE_NAME}" true

# 3) Ensure apex has A records (if none present, add example Cloudflare edge IPs)
existing_a_count=$(curl -s -X GET "${CF_API}/zones/${ZONE_ID}/dns_records?type=A&name=${ZONE_NAME}" -H "${AUTH_HDR}" -H "${CONTENT_HDR}" | jq -r '.result | length')
if [ "$existing_a_count" -eq 0 ]; then
  echo "No apex A records found. Adding example Cloudflare edge IPs as A records (proxied)."
  for ip in "${EDGE_IPS[@]}"; do
    create_or_update_dns "${ZONE_NAME}" "A" "$ip" true
  done
else
  echo "Apex A record(s) present: $existing_a_count; leaving them as-is."
fi

# 4) Add zone-scoped Workers routes
add_route_if_missing(){
  local pattern="$1"
  local found
  found=$(curl -s -X GET "${CF_API}/zones/${ZONE_ID}/workers/routes" -H "${AUTH_HDR}" -H "${CONTENT_HDR}" \
    | jq -r --arg p "$pattern" '.result[] | select(.pattern==$p) | .id' || true)
  if [ -n "$found" ]; then
    echo "Route already exists: ${pattern}"
  else
    echo "Adding route: ${pattern} -> ${WORKER_NAME}"
    curl -s -X POST "${CF_API}/zones/${ZONE_ID}/workers/routes" \
      -H "${AUTH_HDR}" -H "${CONTENT_HDR}" \
      --data "$(jq -n --arg pattern "$pattern" --arg script "$WORKER_NAME" '{pattern:$pattern, script:$script}')" \
      | jq -r '.success, .errors, .messages, .result.id'
  fi
}

add_route_if_missing "${ZONE_NAME}/*"
add_route_if_missing "www.${ZONE_NAME}/*"

# 5) Print resulting DNS records and routes
printf "\n=== DNS RECORDS ===\n"
curl -s -X GET "${CF_API}/zones/${ZONE_ID}/dns_records?per_page=200" -H "${AUTH_HDR}" -H "${CONTENT_HDR}" \
  | jq -r '.result[] | "\(.type)\t\(.name)\t\(.content)\tproxied:\(.proxied)"'

printf "\n=== WORKERS ROUTES ===\n"
curl -s -X GET "${CF_API}/zones/${ZONE_ID}/workers/routes" -H "${AUTH_HDR}" -H "${CONTENT_HDR}" \
  | jq -r '.result[] | "\(.pattern) -> \(.script) [id:\(.id)]"'

printf "\nDone. Run the tests suggested in docs/CLOUDFLARE-SETUP.md or:\n  curl -I https://www.%s\n  curl https://%s/api/health\n" "$ZONE_NAME" "$ZONE_NAME"
