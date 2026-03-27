#!/usr/bin/env bash
# =============================================================================
# setup-github.sh — Configure GitHub repo with branch protection rules
#
# This script uses the GitHub CLI (gh) to set up branch protection on the
# main branch. It is idempotent — safe to run multiple times.
#
# Prerequisites:
#   - gh CLI installed and authenticated (gh auth login)
#   - Repository has a remote origin on GitHub
#
# Usage:
#   ./scripts/setup-github.sh
# =============================================================================

set -e

# --- Verify gh CLI is installed ---
if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is not installed. Install from https://cli.github.com/"
  exit 1
fi

# --- Verify gh is authenticated ---
if ! gh auth status &>/dev/null; then
  echo "Error: gh CLI is not authenticated. Run 'gh auth login' first."
  exit 1
fi

# --- Get repo owner/name from git remote ---
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
if [ -z "$REPO" ]; then
  echo "Error: Could not determine repository. Ensure a GitHub remote origin is configured."
  exit 1
fi

echo "Configuring branch protection for: $REPO (branch: main)"

# --- Set branch protection rules on main ---
# Uses the GitHub REST API via gh to configure:
#   - Require CI status checks (Tests, Security Scans) to pass before merge
#   - Require branches to be up to date before merging
#   - Enforce rules for admins too
#
# See: https://docs.github.com/en/rest/branches/branch-protection
gh api \
  --method PUT \
  "repos/$REPO/branches/main/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Tests", "Security Scans"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF

echo ""
echo "Branch protection configured successfully!"
echo ""

# --- Print summary of protections ---
echo "=== Protection Summary ==="
echo "Repository:       $REPO"
echo "Branch:           main"
echo "Status checks:    Tests, Security Scans (must pass)"
echo "Up-to-date:       Required before merge"
echo "PR reviews:       1 approval required"
echo "Admin enforced:   Yes"
echo "========================="
