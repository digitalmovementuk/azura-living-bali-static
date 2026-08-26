#!/usr/bin/env bash
# Deploy public/ to the gh-pages branch, which is what azuralivingbali.com serves.
#
#   bash scripts/deploy.sh "commit message"
#
# Uses a throwaway worktree so the working branch is never touched.
set -euo pipefail

cd "$(dirname "$0")/.."
MSG="${1:-Update azuralivingbali.com}"
WT="$(mktemp -d)"

# Refuse to ship a home page that lost its SEO edits, or a guide page built
# from an older version of that home page.
#
# The brand assets go first: the favicon set and the share image are what the
# HTML gates then check the markup against, and a rebuilt asset that no longer
# matches its source would otherwise ship under a passing HTML check.
python3 scripts/build-brand-assets.py --check
node scripts/seo-patch.mjs --check
node scripts/build-guide.mjs --check
node scripts/analytics-cleanup.mjs --check

git fetch origin gh-pages
git worktree add --detach "$WT" origin/gh-pages

rsync -a --delete \
  --exclude '.git' \
  public/ "$WT"/

touch "$WT/.nojekyll"

git -C "$WT" add -A
if git -C "$WT" diff --cached --quiet; then
  echo "gh-pages already up to date — nothing to deploy."
else
  git -C "$WT" commit -m "$MSG"
  git -C "$WT" push origin HEAD:gh-pages
  echo "Deployed to gh-pages."
fi

git worktree remove --force "$WT"
