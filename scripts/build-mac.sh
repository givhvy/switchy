#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin || "$(uname -m)" != arm64 ]]; then
  echo 'Run this script on your Apple silicon MacBook.' >&2
  exit 1
fi
if ! xcode-select -p >/dev/null 2>&1; then
  echo 'Apple Command Line Tools are needed to build the monitor helper.'
  echo 'Run: xcode-select --install'
  echo 'Finish the installation, then run this script again.'
  exit 1
fi
mkdir -p .tmp
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  NODE_VERSION=v22.20.0
  ARCHIVE="node-${NODE_VERSION}-darwin-arm64.tar.gz"
  NODE_URL="https://nodejs.org/dist/${NODE_VERSION}"
  echo 'Downloading a project-local Node.js runtime from nodejs.org...'
  curl --fail --location "$NODE_URL/$ARCHIVE" --output ".tmp/$ARCHIVE"
  curl --fail --location "$NODE_URL/SHASUMS256.txt" --output .tmp/SHASUMS256.txt
  (cd .tmp && grep "  $ARCHIVE\$" SHASUMS256.txt | shasum -a 256 -c -)
  tar -xzf ".tmp/$ARCHIVE" -C .tmp
  export PATH="$PWD/.tmp/node-${NODE_VERSION}-darwin-arm64/bin:$PATH"
fi
HELPER_REV=04d949794102eb8df01ad3681afff6464a3eede2
HELPER_DIR="$(mktemp -d "${TMPDIR:-/tmp}/switchy-helper.XXXXXX")"
echo 'Building the bundled monitor helper...'
git clone --quiet https://github.com/waydabber/m1ddc.git "$HELPER_DIR"
git -C "$HELPER_DIR" checkout --quiet "$HELPER_REV"
make -C "$HELPER_DIR" CC='clang -arch arm64'
cp "$HELPER_DIR/m1ddc" native/m1ddc
cp "$HELPER_DIR/LICENSE" native/m1ddc-LICENSE
chmod +x native/m1ddc
codesign --force --sign - native/m1ddc
npm ci
npm test
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
codesign --verify --deep --strict dist/mac-arm64/Switchy.app
shasum -a 256 dist/*.dmg dist/*.zip > dist/SHA256SUMS-mac.txt
open dist
echo 'Built! Drag Switchy from the DMG into Applications.'
echo 'The app is ad-hoc signed, not notarized. macOS may require Privacy & Security > Open Anyway.'
echo 'Upload the DMG and ZIP to the GitHub release, or send the build output back to Codex.'
