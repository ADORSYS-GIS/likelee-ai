#!/usr/bin/env node

/**
 * Automatically add useTranslation hook to components that use translations
 * but don't have the hook imported
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');

/**
 * Check if file uses translation keys
 */
function usesTranslations(content) {
  return /t\(["']/.test(content);
}

/**
 * Check if file already imports useTranslation
 */
function hasUseTranslation(content) {
  return /useTranslation/.test(content);
}

/**
 * Check if component already declares const { t }
 */
function hasTranslationHook(content) {
  return /const\s+{\s*t\s*}\s*=\s*useTranslation\(\)/.test(content);
}

/**
 * Add useTranslation import and hook to a component
 */
function addUseTranslation(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has useTranslation
  if (hasUseTranslation(content) && hasTranslationHook(content)) {
    return { modified: false, reason: 'already has useTranslation' };
  }
  
  // Skip if doesn't use translations
  if (!usesTranslations(content)) {
    return { modified: false, reason: 'no translations used' };
  }
  
  let modified = false;
  
  // Add import if missing
  if (!hasUseTranslation(content)) {
    // Find the last import statement
    const importRegex = /^import\s+.*?;$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      content = 
        content.slice(0, insertPosition) +
        '\nimport { useTranslation } from "react-i18next";' +
        content.slice(insertPosition);
      
      modified = true;
    }
  }
  
  // Add hook declaration if missing
  if (!hasTranslationHook(content)) {
    // Find the component function/const declaration
    const patterns = [
      // export default function ComponentName
      /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*{/,
      // export function ComponentName
      /export\s+function\s+\w+\s*\([^)]*\)\s*{/,
      // function ComponentName
      /^function\s+\w+\s*\([^)]*\)\s*{/m,
      // const ComponentName = () => {
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/,
      // export const ComponentName = () => {
      /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const matchEnd = content.indexOf(match[0]) + match[0].length;
        
        // Check if there's already a hook declaration nearby
        const nextLines = content.slice(matchEnd, matchEnd + 500);
        if (!/const\s+{\s*t\s*}/.test(nextLines)) {
          content =
            content.slice(0, matchEnd) +
            '\n  const { t } = useTranslation();' +
            content.slice(matchEnd);
          
          modified = true;
        }
        break;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { modified: true };
  }
  
  return { modified: false, reason: 'could not find insertion point' };
}

/**
 * Find all TSX files that need useTranslation
 */
function findFilesNeedingTranslation(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findFilesNeedingTranslation(fullPath, files);
      }
    } else if (entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (usesTranslations(content) && !hasTranslationHook(content)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Adding useTranslation to components...\n');
  
  const files = findFilesNeedingTranslation(SRC_DIR);
  
  console.log(`Found ${files.length} files that need useTranslation:\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    const result = addUseTranslation(file);
    
    if (result.modified) {
      console.log(`✅ ${relativePath}`);
      successCount++;
    } else {
      console.log(`⚠️  ${relativePath} - ${result.reason || 'skipped'}`);
      if (result.reason === 'already has useTranslation') {
        skipCount++;
      } else {
        failCount++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files processed: ${files.length}`);
  console.log(`✅ Successfully modified: ${successCount}`);
  console.log(`⚠️  Skipped (already has): ${skipCount}`);
  console.log(`❌ Failed to modify: ${failCount}`);
  
  if (successCount > 0) {
    console.log('\n✅ useTranslation has been added to components!');
    console.log('⚠️  Please review the changes and test the components.\n');
  }
}

main();
