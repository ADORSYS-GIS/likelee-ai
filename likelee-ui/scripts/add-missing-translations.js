#!/usr/bin/env node

/**
 * Add Missing Translation Keys
 *
 * Automatically adds missing translation keys to locale files with placeholder values.
 * Uses English values as placeholders with a [NEEDS TRANSLATION] prefix.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, "../src/locales");
const NAMESPACES = ["agency", "brand", "creator", "common", "auth"];
const LANGUAGES = ["de", "es", "fr"];

/**
 * Get value from nested object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Set value in nested object using dot notation
 * Handles conflicts where a key exists as a string but needs to be an object
 */
function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();

  let target = obj;
  for (const key of keys) {
    // If the current key doesn't exist or is not an object, create/replace it
    if (
      !target[key] ||
      typeof target[key] !== "object" ||
      Array.isArray(target[key])
    ) {
      target[key] = {};
    }
    target = target[key];
  }

  target[lastKey] = value;
}

/**
 * Load and parse a JSON locale file
 */
function loadLocaleFile(namespace, language) {
  const filePath = path.join(LOCALES_DIR, namespace, `${language}.json`);

  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Save locale file with proper formatting
 */
function saveLocaleFile(namespace, language, data) {
  const filePath = path.join(LOCALES_DIR, namespace, `${language}.json`);
  const content = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj, prefix = "") {
  let keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Add missing keys to a locale file
 */
function addMissingKeys(namespace, language, dryRun = false) {
  console.log(`\n📝 Processing ${namespace}/${language}.json`);

  const enData = loadLocaleFile(namespace, "en");
  const langData = loadLocaleFile(namespace, language);

  if (!enData || !langData) {
    console.log("  ⚠️  Could not load files, skipping...");
    return 0;
  }

  const enKeys = getAllKeys(enData);
  const langKeys = getAllKeys(langData);
  const missingKeys = enKeys.filter((key) => !langKeys.includes(key));

  if (missingKeys.length === 0) {
    console.log("  ✓ No missing keys");
    return 0;
  }

  console.log(`  📌 Found ${missingKeys.length} missing keys`);

  let addedCount = 0;
  for (const key of missingKeys) {
    const enValue = getNestedValue(enData, key);

    // Create placeholder translation
    let placeholder;
    if (typeof enValue === "string") {
      // For short strings, use the English value as placeholder
      // For longer strings, add a translation marker
      if (enValue.length > 50) {
        placeholder = `[NEEDS TRANSLATION] ${enValue}`;
      } else {
        placeholder = enValue;
      }
    } else {
      placeholder = enValue;
    }

    setNestedValue(langData, key, placeholder);
    addedCount++;

    if (addedCount <= 5) {
      console.log(`    + ${key}`);
    }
  }

  if (addedCount > 5) {
    console.log(`    ... and ${addedCount - 5} more`);
  }

  if (!dryRun) {
    saveLocaleFile(namespace, language, langData);
    console.log(
      `  ✅ Added ${addedCount} keys to ${namespace}/${language}.json`,
    );
  } else {
    console.log(`  🔍 [DRY RUN] Would add ${addedCount} keys`);
  }

  return addedCount;
}

/**
 * Main function
 */
function addAllMissingTranslations(dryRun = false) {
  console.log("🔧 Adding Missing Translation Keys");
  console.log("=".repeat(80));

  if (dryRun) {
    console.log("⚠️  DRY RUN MODE - No files will be modified\n");
  }

  const stats = {
    totalAdded: 0,
    byLanguage: { de: 0, es: 0, fr: 0 },
    byNamespace: {},
  };

  for (const namespace of NAMESPACES) {
    console.log(`\n📁 Namespace: ${namespace}`);
    console.log("-".repeat(80));

    stats.byNamespace[namespace] = 0;

    for (const lang of LANGUAGES) {
      const added = addMissingKeys(namespace, lang, dryRun);
      stats.totalAdded += added;
      stats.byLanguage[lang] += added;
      stats.byNamespace[namespace] += added;
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 SUMMARY");
  console.log("=".repeat(80));
  console.log(`\nTotal keys added: ${stats.totalAdded}`);
  console.log("\nKeys added by language:");
  console.log(`  • German (DE):  ${stats.byLanguage.de}`);
  console.log(`  • Spanish (ES): ${stats.byLanguage.es}`);
  console.log(`  • French (FR):  ${stats.byLanguage.fr}`);

  console.log("\nKeys added by namespace:");
  for (const [namespace, count] of Object.entries(stats.byNamespace)) {
    console.log(`  • ${namespace.padEnd(10)}: ${count}`);
  }

  if (!dryRun) {
    console.log("\n✅ All missing keys have been added!");
    console.log(
      "\n⚠️  NOTE: Keys marked with [NEEDS TRANSLATION] require professional translation.",
    );
    console.log(
      "   Other keys use English values as placeholders and should be reviewed.\n",
    );
  } else {
    console.log(
      "\n🔍 Dry run complete. Run without --dry-run to apply changes.\n",
    );
  }
}

// Parse command line arguments
const args = globalThis.process?.argv?.slice(2) || [];
const dryRun = args.includes("--dry-run") || args.includes("-d");

// Run the script
addAllMissingTranslations(dryRun);
