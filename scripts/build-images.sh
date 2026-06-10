#!/usr/bin/env bash
# Build all three production images locally with version/build metadata baked in.
# Invoked via `npm run images:build` (which exports APP_VERSION/GIT_COMMIT/BUILD_DATE).
set -euo pipefail

APP_VERSION="${APP_VERSION:-0.0.0-dev}"
GIT_COMMIT="${GIT_COMMIT:-unknown}"
BUILD_DATE="${BUILD_DATE:-unknown}"
REGISTRY="${REGISTRY:-ghcr.io/flo-schilli/digital-signage}"
# Container engine: docker by default, override with ENGINE=podman
ENGINE="${ENGINE:-docker}"

echo "Building images @ ${APP_VERSION} (commit ${GIT_COMMIT}, built ${BUILD_DATE})"

for svc in backend frontend player; do
  echo "==> ${svc}"
  "${ENGINE}" build \
    --build-arg "APP_VERSION=${APP_VERSION}" \
    --build-arg "GIT_COMMIT=${GIT_COMMIT}" \
    --build-arg "BUILD_DATE=${BUILD_DATE}" \
    -f "apps/${svc}/Dockerfile.prod" \
    -t "${REGISTRY}/${svc}:${APP_VERSION}" \
    -t "${REGISTRY}/${svc}:latest" \
    .
done

echo "Done. Tagged ${REGISTRY}/{backend,frontend,player}:${APP_VERSION}"
