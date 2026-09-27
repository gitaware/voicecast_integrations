#!/usr/bin/env bash
set -euo pipefail

integration_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT

cp -R "$integration_dir/files/." "$build_dir/"
cp "$integration_dir/manifest.php" "$build_dir/manifest.php"
target="$integration_dir/voicecast-suitecrm.zip"
rm -f "$target"
(
    cd "$build_dir"
    zip -qr "$target" .
)
echo "Built $target"
