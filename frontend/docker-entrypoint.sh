#!/bin/sh
set -e

: "${BACKEND_UPSTREAM:=signage-backend:3000}"; export BACKEND_UPSTREAM
envsubst '${BACKEND_UPSTREAM}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
