#!/usr/bin/env bash
# build.sh — build a static site distribution for Render deployment
# Usage: bash build.sh <site>   (e.g. bash build.sh landcros)
set -euo pipefail

SITE="${1:-landcros}"
OUT="dist-${SITE}"

if [ ! -d "sites/${SITE}" ]; then
  echo "ERROR: sites/${SITE}/ not found" >&2
  exit 1
fi

echo "Building ${SITE} → ${OUT}/"
rm -rf "${OUT}"
mkdir -p "${OUT}/assets"

# Engine files (JS, HTML, CSS, worker, helpers)
for f in *.js *.html *.css coi-serviceworker.js qr.js; do
  [ -f "$f" ] && cp "$f" "${OUT}/" || true
done

# Config and static-host helpers
for f in _headers serve.json staticwebapp.config.json; do
  [ -f "$f" ] && cp "$f" "${OUT}/" || true
done

# Site-specific data
cp -r "sites/${SITE}/data" "${OUT}/"

# Site-specific assets (splats, satellite, thumbnails, etc.)
rsync -a "sites/${SITE}/assets/" "${OUT}/assets/"

# Site branding files at root (logo, etc.)
[ -f "sites/${SITE}/logo.png" ]       && cp "sites/${SITE}/logo.png" "${OUT}/"
[ -f "sites/${SITE}/speedlimit2.png" ] && cp "sites/${SITE}/speedlimit2.png" "${OUT}/"

# Shared engine assets (don't overwrite site-specific files)
[ -d assets/dirtwithrocks ] && rsync -a --ignore-existing assets/dirtwithrocks/ "${OUT}/assets/dirtwithrocks/"
[ -f assets/Trex.stl ]     && cp assets/Trex.stl "${OUT}/assets/" 2>/dev/null || true

echo "Done: ${OUT}/"
find "${OUT}" -type f | sort
