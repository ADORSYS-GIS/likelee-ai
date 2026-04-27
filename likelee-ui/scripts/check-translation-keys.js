#!/usr/bin/env node

/**
 * Translation Key Completeness Checker
 * 
 * Compares all locale files against English (source of truth) to identify missing keys.
 * Generates a report showing which keys are missing in each language.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const NAMESPACES = ['agency', 'brand', 'creator', 'common', 'auth'];
const LANGUAGES = ['en', 'de', 'es', 'fr'];

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Load and parse a JSON locale file
 */
function loadLocaleFile(namespace, language) {
  const filePath = path.join(LOCALES_DIR, namespace, `${language}.json`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main analysis function
 */
function analyzeTranslations() {
  console.log('🔍 Translation Key Completeness Analysis\n');
  console.log('=' .repeat(80));
  
  const report = {
    namespaces: {},
    summary: {
      totalMissing: 0,
      byLanguage: { de: 0, es: 0, fr: 0 },
      byNamespace: {}
    }
  };
  
  for (const namespace of NAMESPACES) {
    console.log(`\n📁 Namespace: ${namespace}`);
    console.log('-'.repeat(80));
    
    // Load English as source of truth
    const enData = loadLocaleFile(namespace, 'en');
    if (!enData) {
      console.log(`  ⚠️  Could not load English file, skipping...`);
      continue;
    }
    
    const enKeys = getAllKeys(enData);
    console.log(`  ✓ English (EN): ${enKeys.length} keys`);
    
    report.namespaces[namespace] = {
      en: enKeys.length,
      missing: {}
    };
    
    // Compare other languages
    for (const lang of LANGUAGES) {
      if (lang === 'en') continue;
      
      const langData = loadLocaleFile(namespace, lang);
      if (!langData) {
        console.log(`  ✗ ${lang.toUpperCase()}: File not found`);
        continue;
      }
      
      const langKeys = getAllKeys(langData);
      const missingKeys = enKeys.filter(key => !langKeys.includes(key));
      
      report.namespaces[namespace].missing[lang] = missingKeys;
      report.summary.byLanguage[lang] += missingKeys.length;
      report.summary.totalMissing += missingKeys.length;
      
      if (missingKeys.length > 0) {
        console.log(`  ✗ ${lang.toUpperCase()}: ${langKeys.length} keys (${missingKeys.length} missing)`);
      } else {
        console.log(`  ✓ ${lang.toUpperCase()}: ${langKeys.length} keys (complete)`);
      }
    }
    
    if (!report.summary.byNamespace[namespace]) {
      report.summary.byNamespace[namespace] = 0;
    }
    
    for (const lang of ['de', 'es', 'fr']) {
      report.summary.byNamespace[namespace] += (report.namespaces[namespace].missing[lang]?.length || 0);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal missing keys across all languages: ${report.summary.totalMissing}`);
  console.log('\nMissing keys by language:');
  console.log(`  • German (DE):  ${report.summary.byLanguage.de}`);
  console.log(`  • Spanish (ES): ${report.summary.byLanguage.es}`);
  console.log(`  • French (FR):  ${report.summary.byLanguage.fr}`);
  
  console.log('\nMissing keys by namespace:');
  for (const [namespace, count] of Object.entries(report.summary.byNamespace)) {
    console.log(`  • ${namespace.padEnd(10)}: ${count}`);
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'translation-gaps-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Generate missing keys files for each language
  for (const lang of ['de', 'es', 'fr']) {
    const missingKeysPath = path.join(__dirname, `missing-keys-${lang}.txt`);
    let content = `Missing Translation Keys for ${lang.toUpperCase()}\n`;
    content += `Generated: ${new Date().toISOString()}\n`;
    content += `${'='.repeat(80)}\n\n`;
    
    for (const namespace of NAMESPACES) {
      const missing = report.namespaces[namespace]?.missing[lang] || [];
      if (missing.length > 0) {
        content += `\n[${namespace}] - ${missing.length} missing keys:\n`;
        content += missing.map(key => `  - ${key}`).join('\n') + '\n';
      }
    }
    
    fs.writeFileSync(missingKeysPath, content);
    console.log(`  • Missing keys for ${lang.toUpperCase()}: ${missingKeysPath}`);
  }
  
  console.log('\n✅ Analysis complete!\n');
  
  return report;
}

// Run the analysis
analyzeTranslations();

export { analyzeTranslations, getAllKeys };
