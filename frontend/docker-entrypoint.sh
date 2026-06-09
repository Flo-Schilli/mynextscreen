#!/bin/sh
set -e

if [ -z "$HANKO_API_URL" ]; then
  echo "WARNING: HANKO_API_URL is not set. Hanko authentication will not work."
fi

# Replace ${HANKO_API_URL} placeholder in all JS files
for file in /usr/share/nginx/html/*.js; do
  if [ -f "$file" ]; then
    envsubst '${HANKO_API_URL}' < "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
  fi
done

: "${BACKEND_UPSTREAM:=signage-backend:3000}"; export BACKEND_UPSTREAM
envsubst '${BACKEND_UPSTREAM}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
