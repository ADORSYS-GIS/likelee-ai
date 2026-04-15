#!/usr/bin/env python3
"""
Automatically resolve git merge conflicts by keeping both changes.
This script processes files with conflict markers and merges both sides.
"""

import sys
import re
from pathlib import Path

def resolve_conflicts_in_file(filepath):
    """Resolve conflicts in a single file by keeping both changes."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False
    
    if '<<<<<<< HEAD' not in content:
        print(f"No conflicts in {filepath}")
        return True
    
    # Pattern to match conflict blocks
    conflict_pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+\n'
    
    def merge_conflict(match):
        ours = match.group(1)
        theirs = match.group(2)
        
        # For function definitions, keep both
        # For imports, merge and deduplicate
        # For other code, keep both with proper spacing
        
        # Simple strategy: keep both with a newline separator
        return f"{ours}\n\n{theirs}\n"
    
    # Replace all conflicts
    resolved = re.sub(conflict_pattern, merge_conflict, content, flags=re.DOTALL)
    
    # Write back
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(resolved)
        print(f"✓ Resolved conflicts in {filepath}")
        return True
    except Exception as e:
        print(f"Error writing {filepath}: {e}")
        return False

def main():
    # List of conflicted files
    conflicted_files = [
        'likelee-server/src/billing.rs',
        'likelee-server/src/brands.rs',
        'likelee-server/src/entitlements.rs',
        'likelee-server/src/face_profiles.rs',
        'likelee-server/src/payouts.rs',
        'likelee-ui/src/api/functions.ts',
        'likelee-ui/src/pages/BrandDashboard.tsx',
        'likelee-ui/src/pages/index.tsx',
    ]
    
    success_count = 0
    for filepath in conflicted_files:
        if Path(filepath).exists():
            if resolve_conflicts_in_file(filepath):
                success_count += 1
        else:
            print(f"File not found: {filepath}")
    
    print(f"\n✓ Resolved {success_count}/{len(conflicted_files)} files")
    
    # Handle package-lock.json separately (regenerate it)
    print("\nNote: package-lock.json should be regenerated with 'npm install'")

if __name__ == '__main__':
    main()
