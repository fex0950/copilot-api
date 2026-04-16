#!/bin/sh
set -eu

if [ "${1:-}" = "--auth" ]; then
  exec bun run dist/main.js auth
fi

if [ "$#" -gt 0 ]; then
  exec bun run dist/main.js "$@"
fi

if [ -n "${CLOUDFLARE_APPLICATION_ID:-}" ] && [ -z "${GH_TOKEN:-}" ]; then
  echo "GH_TOKEN must be set for Cloudflare container deployments." >&2
  exit 1
fi

set -- start

if [ -n "${GH_TOKEN:-}" ]; then
  set -- "$@" --github-token "$GH_TOKEN"
fi

if [ -n "${PORT:-}" ]; then
  set -- "$@" --port "$PORT"
fi

if [ -n "${ACCOUNT_TYPE:-}" ]; then
  set -- "$@" --account-type "$ACCOUNT_TYPE"
fi

if [ -n "${RATE_LIMIT_SECONDS:-}" ]; then
  set -- "$@" --rate-limit "$RATE_LIMIT_SECONDS"
fi

if [ "${RATE_LIMIT_WAIT:-false}" = "true" ]; then
  set -- "$@" --wait
fi

if [ "${SHOW_TOKEN:-false}" = "true" ]; then
  set -- "$@" --show-token
fi

if [ "${PROXY_ENV:-false}" = "true" ]; then
  set -- "$@" --proxy-env
fi

if [ "${DISABLE_TOKEN_ENDPOINT:-false}" = "true" ]; then
  set -- "$@" --disable-token-endpoint
fi

exec bun run dist/main.js "$@"
