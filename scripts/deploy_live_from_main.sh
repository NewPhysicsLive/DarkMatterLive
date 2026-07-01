#!/usr/bin/env bash

set -euo pipefail

DESTINATION="/eos/project-d/darkmatter/www/"
REF="origin/main"
DRY_RUN=1

usage() {
  cat <<'EOF'
Usage: scripts/deploy_live_from_main.sh [--apply] [--dest <path>]

Exports origin/main to a temporary directory and rsyncs only the files
required by the live Dark-Matter-Live website.

The destination is pruned to this allowlist, so files outside the live-site
set are deleted from the target during sync.

Options:
  --apply        Run the deployment for real. Default is dry-run mode.
  --dest <path>  Deployment target directory. Default: /eos/project-d/darkmatter/www/
  --help         Show this help text.

Examples:
  scripts/deploy_live_from_main.sh
  scripts/deploy_live_from_main.sh --apply
  scripts/deploy_live_from_main.sh --dest /tmp/dml-www/
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      DRY_RUN=0
      shift
      ;;
    --dest)
      DESTINATION="${2:?Missing value for --dest}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required" >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required" >&2
  exit 1
fi

git rev-parse --verify "$REF" >/dev/null

echo "Refreshing $REF from origin"
git fetch origin main >/dev/null

tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

echo "Exporting $REF into $tmpdir"
git archive "$REF" | tar -x -C "$tmpdir"

rsync_args=(
  -avh
  --delete
  --delete-excluded
  --prune-empty-dirs
  --include=/.htaccess
  --include=/index.html
  --include=/health.html
  --include=/data/***
  --include=/pages/***
  --exclude=/.git/***
  --exclude=/.git*
  --exclude=/.github/***
  --exclude=/.gitlab/***
  --exclude=**/.git/***
  --exclude=**/.git*
  --exclude=**/.github/***
  --exclude=**/.gitlab/***
  --exclude=/.venv/***
  --exclude=/.venv
  --exclude=**/.venv/***
  --exclude=**/.venv
  --exclude=/pages/**/node_modules/***
  --exclude=/pages/**/package.json
  --exclude=/pages/**/package-lock.json
  --exclude=/pages/**/preview-server.js
  --exclude=/pages/**/preview-worker.js
  --exclude=/pages/**/dist/***
  --exclude=/pages/**/README*
  --exclude=/data/**/*.py
  --exclude=*
)

if [[ "$DRY_RUN" -eq 1 ]]; then
  rsync_args=(-n "${rsync_args[@]}")
  echo "Running in dry-run mode. Use --apply to deploy for real."
fi

echo "Syncing $REF to $DESTINATION"
rsync "${rsync_args[@]}" "$tmpdir/" "$DESTINATION"
