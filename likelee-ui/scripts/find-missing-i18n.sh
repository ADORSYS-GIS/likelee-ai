#!/bin/bash

# Find all TSX files that use translation keys but don't import useTranslation

echo "🔍 Finding components with translation keys but missing useTranslation..."
echo "========================================================================"

find likelee-ui/src -name "*.tsx" -type f | while read file; do
  # Check if file contains t(" pattern (translation usage)
  if grep -q 't("' "$file" || grep -q "t('" "$file"; then
    # Check if file imports useTranslation
    if ! grep -q "useTranslation" "$file"; then
      echo "❌ $file"
      echo "   Uses translations but missing useTranslation import"
      echo ""
    fi
  fi
done

echo "✅ Scan complete!"
