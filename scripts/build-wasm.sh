#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${WEB_DIR}/.." && pwd)"
PUBLIC_DIR="${WEB_DIR}/public"

mkdir -p "${PUBLIC_DIR}"

echo "Building DAP WebAssembly binary..."
(
  cd "${ROOT_DIR}"
  GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o "${PUBLIC_DIR}/dap.wasm" ./cmd/dap-wasm
)

GOROOT="$(go env GOROOT)"
if [[ -f "${GOROOT}/lib/wasm/wasm_exec.js" ]]; then
  cp "${GOROOT}/lib/wasm/wasm_exec.js" "${PUBLIC_DIR}/wasm_exec.js"
elif [[ -f "${GOROOT}/misc/wasm/wasm_exec.js" ]]; then
  cp "${GOROOT}/misc/wasm/wasm_exec.js" "${PUBLIC_DIR}/wasm_exec.js"
else
  echo "Error: Could not locate wasm_exec.js in ${GOROOT}" >&2
  exit 1
fi

echo "Done! Generated public/dap.wasm and copied wasm_exec.js."
