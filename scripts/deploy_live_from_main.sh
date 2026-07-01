#!/usr/bin/env bash

set -euo pipefail

DESTINATION="/eos/project-d/darkmatter/www/"
REF="origin/main"
DRY_RUN=1
GIT_CMD=""
RSYNC_CMD=""
TAR_CMD=""

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

if command -v git >/dev/null 2>&1; then
  GIT_CMD="git"
elif command -v git.exe >/dev/null 2>&1; then
  GIT_CMD="git.exe"
fi

if command -v rsync >/dev/null 2>&1; then
  RSYNC_CMD="rsync"
elif command -v rsync.exe >/dev/null 2>&1; then
  RSYNC_CMD="rsync.exe"
fi

if command -v tar >/dev/null 2>&1; then
  TAR_CMD="tar"
elif command -v tar.exe >/dev/null 2>&1; then
  TAR_CMD="tar.exe"
fi

missing=()
[[ -z "$GIT_CMD" ]] && missing+=("git")
[[ -z "$RSYNC_CMD" ]] && missing+=("rsync")
[[ -z "$TAR_CMD" ]] && missing+=("tar")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required command(s): ${missing[*]}" >&2
  echo "Detected shell: ${SHELL:-unknown}" >&2
  echo "Hint: run this script in Git Bash/WSL where git, rsync, and tar are available in PATH." >&2
  exit 1
fi

echo "Using commands: git=$GIT_CMD, rsync=$RSYNC_CMD, tar=$TAR_CMD"

"$GIT_CMD" rev-parse --verify "$REF" >/dev/null

echo "Refreshing $REF from origin"
"$GIT_CMD" fetch origin main >/dev/null

tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

echo "Exporting $REF into $tmpdir"
"$GIT_CMD" archive "$REF" | "$TAR_CMD" -x -C "$tmpdir"

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

if [[ "$DRY_RUN" -eq 0 ]]; then
  if [[ ! -d "$DESTINATION" ]]; then
    echo "Destination directory not found: $DESTINATION" >&2
    echo "Hint: ensure EOS is mounted and this path exists before running --apply." >&2
    exit 1
  fi

  if [[ ! -w "$DESTINATION" ]]; then
    echo "Destination is not writable: $DESTINATION" >&2
    echo "Hint: check permissions (or AFS/EOS credentials) for the target path." >&2
    exit 1
  fi
fi

echo "Syncing $REF to $DESTINATION"
"$RSYNC_CMD" "${rsync_args[@]}" "$tmpdir/" "$DESTINATION"
