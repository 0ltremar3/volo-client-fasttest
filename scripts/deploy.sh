#!/usr/bin/env bash
# volo-client-fasttest 前端-only 发布：干净工作区 → ff-only 拉 main → 测试构建
# → releases/<sha> → 更新 current/previous → reload nginx → HTTP 检查。
#
# Usage:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --skip-pull
#   ./scripts/deploy.sh --skip-tests
#
# Optional env overrides:
#   PROJECT_DIR  WEB_ROOT  GIT_REMOTE  GIT_BRANCH
#   PUBLIC_API_BASE  VITE_API_BASE_URL  VITE_MOCK_MODE  LOG_ROOT

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
WEB_ROOT="${WEB_ROOT:-/var/www/everecho-frontend}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
PUBLIC_API_BASE="${PUBLIC_API_BASE:-https://api.volohorizon.com}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-$PUBLIC_API_BASE}"
VITE_MOCK_MODE="${VITE_MOCK_MODE:-false}"
LOG_ROOT="${LOG_ROOT:-$HOME/logs}"
CHECK_PATHS="${CHECK_PATHS:-/ /login /chat /account}"

export PATH="${HOME}/.local/node-v22/bin:${HOME}/.local/bin:${PATH}"

SKIP_PULL=0
SKIP_TESTS=0
SHA_BEFORE=""
SHA_AFTER=""
OLD_CURRENT=""
HEALTH_BODY=""

usage() {
  sed -n '2,16p' "$0"
}

for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=1 ;;
    --skip-tests) SKIP_TESTS=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

step() { printf '\n▶ %s\n' "$*"; }
ok() { printf '  ✅ %s\n' "$*"; }
skip() { printf '  ⏭️  %s\n' "$*"; }
fail() { printf '  ❌ %s\n' "$*" >&2; }
info() { printf '     %s\n' "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "缺少命令: $1"
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    fail "缺少必要文件: $1"
    exit 1
  fi
}

git_c() {
  git -C "$PROJECT_DIR" "$@"
}

current_release() {
  if [[ -e "$WEB_ROOT/current" ]]; then
    readlink -f "$WEB_ROOT/current"
  fi
}

previous_release() {
  if [[ -e "$WEB_ROOT/previous" ]]; then
    readlink -f "$WEB_ROOT/previous"
  fi
}

banner() {
  printf '\n'
  printf '╔══════════════════════════════════════════════════╗\n'
  printf '║     volo-client-fasttest · frontend deploy       ║\n'
  printf '╚══════════════════════════════════════════════════╝\n'
  info "checkout: $PROJECT_DIR"
  info "web root: $WEB_ROOT"
  info "branch:   $GIT_REMOTE/$GIT_BRANCH"
  info "public:   $PUBLIC_API_BASE/"
}

check_clean_worktree() {
  if [[ -n "$(git_c diff --name-only)" || -n "$(git_c diff --cached --name-only)" ]]; then
    fail "跟踪文件有未提交修改，已停止"
    git_c status
    exit 1
  fi
  ok "工作区跟踪文件干净"
}

record_predeploy() {
  local rec
  rec="$LOG_ROOT/volo-frontend-predeploy-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$rec"
  {
    echo "timestamp=$(date -Is)"
    echo "frontend_checkout=$PROJECT_DIR"
    echo "frontend_sha_before=$SHA_BEFORE"
    echo "frontend_branch=$(git_c rev-parse --abbrev-ref HEAD)"
    echo "frontend_current=$(current_release || true)"
    echo "frontend_previous=$(previous_release || true)"
    echo "git_remote=$GIT_REMOTE"
    echo "git_branch=$GIT_BRANCH"
  } >"$rec/rollback-record.txt"
  ok "回滚记录: $rec/rollback-record.txt"
}

pull_ff_only() {
  local branch
  branch="$(git_c rev-parse --abbrev-ref HEAD)"
  if [[ "$branch" != "$GIT_BRANCH" ]]; then
    fail "当前分支是 $branch，需要 $GIT_BRANCH"
    exit 1
  fi
  git_c fetch "$GIT_REMOTE" "$GIT_BRANCH"
  git_c merge --ff-only "$GIT_REMOTE/$GIT_BRANCH"
  SHA_AFTER="$(git_c rev-parse HEAD)"
  if [[ "$SHA_AFTER" == "$SHA_BEFORE" ]]; then
    ok "已是最新 $SHA_AFTER"
  else
    ok "fast-forward $SHA_BEFORE → $SHA_AFTER"
    info "$(git_c log -1 --format='%h %s')"
  fi
}

build_release() {
  require_file "$PROJECT_DIR/package-lock.json"
  (
    cd "$PROJECT_DIR"
    npm ci
    if [[ $SKIP_TESTS -eq 0 ]]; then
      npm run format:check
      npm run typecheck
      npm run lint
      npm test
    else
      skip "已跳过 format / typecheck / lint / test"
    fi
    VITE_API_BASE_URL="$VITE_API_BASE_URL" VITE_MOCK_MODE="$VITE_MOCK_MODE" npm run build
  )
  require_file "$PROJECT_DIR/dist/index.html"
  ok "构建完成"
}

publish_release() {
  local release="$WEB_ROOT/releases/$SHA_AFTER"
  if [[ -z "$SHA_AFTER" ]]; then
    fail "缺少发布 SHA"
    exit 1
  fi

  sudo mkdir -p "$WEB_ROOT/releases"
  sudo rm -rf "$release"
  sudo mkdir -p "$release"
  sudo cp -a "$PROJECT_DIR/dist/." "$release/"

  if [[ -n "$OLD_CURRENT" && "$OLD_CURRENT" != "$release" ]]; then
    sudo ln -sfn "$OLD_CURRENT" "$WEB_ROOT/previous"
  fi
  sudo ln -sfn "$release" "$WEB_ROOT/current"
  sudo chown -R "$(id -un):$(id -gn)" "$WEB_ROOT"

  if [[ "$(current_release)" != "$release" ]]; then
    fail "current 未指向 $release"
    exit 1
  fi
  ok "已发布 $release"
  info "current  -> $(current_release)"
  info "previous -> $(previous_release || echo none)"
}

reload_nginx() {
  sudo nginx -t
  sudo systemctl reload nginx
  ok "nginx 已 reload"
}

http_get() {
  local url="$1" dest="$2"
  curl -fsS -o "$dest" -w '%{http_code}\t%{content_type}\t%{size_download}' "$url"
}

read_http_meta() {
  local raw="$1"
  IFS=$'\t' read -r HTTP_CODE HTTP_TYPE HTTP_SIZE <<<"$raw"
}

verify_http() {
  local tmp js css path dest raw
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  dest="$tmp/index.html"
  raw="$(http_get "$PUBLIC_API_BASE/" "$dest")"
  read_http_meta "$raw"
  if [[ "$HTTP_CODE" != "200" || "$HTTP_TYPE" != text/html* ]]; then
    fail "GET / 失败: status=$HTTP_CODE type=$HTTP_TYPE"
    exit 1
  fi
  info "/ → $HTTP_CODE $HTTP_TYPE ${HTTP_SIZE}B"

  for path in $CHECK_PATHS; do
    [[ "$path" == "/" ]] && continue
    dest="$tmp/page.html"
    raw="$(http_get "$PUBLIC_API_BASE$path" "$dest")"
    read_http_meta "$raw"
    if [[ "$HTTP_CODE" != "200" || "$HTTP_TYPE" != text/html* ]]; then
      fail "GET $path 失败: status=$HTTP_CODE type=$HTTP_TYPE"
      exit 1
    fi
    info "$path → $HTTP_CODE $HTTP_TYPE ${HTTP_SIZE}B"
  done

  js="$(grep -oE '/assets/index-[^"]+\.js' "$tmp/index.html" | head -n1 || true)"
  css="$(grep -oE '/assets/index-[^"]+\.css' "$tmp/index.html" | head -n1 || true)"
  if [[ -z "$js" || -z "$css" ]]; then
    fail "线上 index.html 未找到 hashed JS/CSS"
    exit 1
  fi
  if [[ ! -f "$WEB_ROOT/current$js" || ! -f "$WEB_ROOT/current$css" ]]; then
    fail "current release 缺少 $js 或 $css"
    exit 1
  fi

  dest="$tmp/asset.bin"
  raw="$(http_get "$PUBLIC_API_BASE$js" "$dest")"
  read_http_meta "$raw"
  if [[ "$HTTP_CODE" != "200" || "$HTTP_TYPE" != *javascript* ]]; then
    fail "GET $js 失败: status=$HTTP_CODE type=$HTTP_TYPE"
    exit 1
  fi
  info "$js → $HTTP_CODE $HTTP_TYPE ${HTTP_SIZE}B"

  raw="$(http_get "$PUBLIC_API_BASE$css" "$dest")"
  read_http_meta "$raw"
  if [[ "$HTTP_CODE" != "200" || "$HTTP_TYPE" != text/css* ]]; then
    fail "GET $css 失败: status=$HTTP_CODE type=$HTTP_TYPE"
    exit 1
  fi
  info "$css → $HTTP_CODE $HTTP_TYPE ${HTTP_SIZE}B"

  dest="$tmp/health.json"
  if HEALTH_BODY="$(curl -fsS "$PUBLIC_API_BASE/v1/health")"; then
    if ! grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' <<<"$HEALTH_BODY"; then
      fail "API health 响应异常"
      info "$HEALTH_BODY"
      exit 1
    fi
    ok "API health 正常"
  else
    fail "GET /v1/health 失败"
    exit 1
  fi
}

banner
require_cmd git
require_cmd npm
require_cmd curl
require_cmd sudo
require_file "$PROJECT_DIR/package.json"
if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  fail "未找到 git checkout: $PROJECT_DIR"
  exit 1
fi

SHA_BEFORE="$(git_c rev-parse HEAD)"
OLD_CURRENT="$(current_release || true)"

step "1. 检查工作区"
check_clean_worktree
record_predeploy

step "2. 拉取 $GIT_REMOTE/$GIT_BRANCH"
if [[ $SKIP_PULL -eq 0 ]]; then
  pull_ff_only
else
  SHA_AFTER="$(git_c rev-parse HEAD)"
  skip "已跳过 git pull，使用 $SHA_AFTER"
fi

step "3. 测试并构建"
build_release

step "4. 发布到 $WEB_ROOT"
publish_release

step "5. reload nginx"
reload_nginx

step "6. HTTP 检查"
verify_http

printf '\n部署完成\n'
info "SHA: $SHA_AFTER"
info "app: $PUBLIC_API_BASE/"
info "chat: $PUBLIC_API_BASE/chat"
if [[ -n "$OLD_CURRENT" && "$OLD_CURRENT" != "$(current_release)" ]]; then
  info "rollback: sudo ln -sfn $OLD_CURRENT $WEB_ROOT/current && sudo systemctl reload nginx"
fi
