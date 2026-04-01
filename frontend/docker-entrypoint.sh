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

exec nginx -g 'daemon off;'
