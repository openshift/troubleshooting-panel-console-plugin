#!/usr/bin/env bash

set -euo pipefail

PREFER_PODMAN="${PREFER_PODMAN:-1}"
PUSH="${PUSH:-0}"
TAG="${TAG:-v0.1.0}"

REGISTRY_HOST=${REGISTRY_HOST:-quay.io}
REGISTRY_ORG="${REGISTRY_ORG:-openshift-observability-ui}"
REGISTRY_BASE=$REGISTRY_HOST/$REGISTRY_ORG

if [[ -x "$(command -v podman)" && $PREFER_PODMAN == 1 ]]; then
    OCI_BIN="podman"
else
    OCI_BIN="docker"
fi

BASE_IMAGE="${REGISTRY_BASE}/troubleshooting-panel-console-plugin"
IMAGE=${BASE_IMAGE}:${TAG}

echo "Building image '${IMAGE}' with ${OCI_BIN}"
$OCI_BIN build -t $IMAGE --platform=linux/amd64 -f Dockerfile.dev .

if [[ $PUSH == 1 ]]; then
    $OCI_BIN push $IMAGE
fi
