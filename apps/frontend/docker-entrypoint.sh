#!/bin/sh
set -e

: "${BACKEND_UPSTREAM:=mynextscreen-backend:3000}"; export BACKEND_UPSTREAM
# Upload cap for /api/content/upload. Keep at or above the backend's
# MAX_FILE_SIZE_BYTES (default 100 MB) — nginx is the outermost of the three
# layers that enforce it.
: "${MAX_UPLOAD_SIZE:=100m}"; export MAX_UPLOAD_SIZE
envsubst '${BACKEND_UPSTREAM} ${MAX_UPLOAD_SIZE}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
