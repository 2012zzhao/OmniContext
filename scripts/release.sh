#!/bin/bash

# OmniContext Release Script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Determine version bump type
BUMP_TYPE=${1:-patch}

# Calculate new version
case $BUMP_TYPE in
  major)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1+1".0.0"}')
    ;;
  minor)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$2++; print $1"."$2".0"}')
    ;;
  patch)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$3++; print $1"."$2"."$3"}')
    ;;
  *)
    echo "Invalid bump type. Use: patch, minor, or major"
    exit 1
    ;;
esac

echo "New version will be: $NEW_VERSION"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Update package.json
npm version $BUMP_TYPE --no-git-tag-version

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
TAG="v$NEW_VERSION"
git tag -a $TAG -m "Release $TAG"

echo ""
echo "Version bumped to $NEW_VERSION"
echo "Tag $TAG created locally"
echo ""
echo "To push and trigger release:"
echo "  git push origin main --tags"
