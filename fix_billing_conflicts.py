#!/usr/bin/env python3
"""Fix billing.rs conflicts by properly merging both sides."""

def fix_billing_conflicts():
    with open('likelee-server/src/billing.rs', 'r') as f:
        lines = f.readlines()
    
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check for conflict marker
        if line.startswith('<<<<<<< ours'):
            # Find the middle and end markers
            middle_idx = None
            end_idx = None
            for j in range(i + 1, len(lines)):
                if lines[j].startswith('======='):
                    middle_idx = j
                elif lines[j].startswith('>>>>>>> theirs'):
                    end_idx = j
                    break
            
            if middle_idx and end_idx:
                # Extract both sides
                ours = lines[i+1:middle_idx]
                theirs = lines[middle_idx+1:end_idx]
                
                # Add both sides (ours first, then theirs)
                result.extend(ours)
                result.append('\n')  # Add spacing
                result.extend(theirs)
                
                # Skip to after the conflict
                i = end_idx + 1
                continue
        
        result.append(line)
        i += 1
    
    # Write back
    with open('likelee-server/src/billing.rs', 'w') as f:
        f.writelines(result)
    
    print("✓ Fixed billing.rs conflicts")

if __name__ == '__main__':
    fix_billing_conflicts()
