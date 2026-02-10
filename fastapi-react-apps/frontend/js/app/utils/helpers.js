/**
 * General Utility Helpers
 *
 * This file exports pure utility functions used across the application.
 * All functions are exposed globally for use with Babel standalone.
 */

/**
 * Return an array of unique strings, preserving order.
 * @param {string[]} items - Array of strings
 * @returns {string[]} - Array with duplicates removed
 */
function uniqStrings(items) {
  const seen = new Set();
  const out = [];
  for (const v of items) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Safely trim a string, returning empty string for null/undefined.
 * @param {string|null|undefined} str - String to trim
 * @returns {string} - Trimmed string
 */
function safeTrim(str) {
  return String(str || "").trim();
}

/**
 * Check if a value is a non-empty string after trimming.
 * @param {any} value - Value to check
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Parse a comma-separated string into an array of trimmed strings.
 * @param {string} str - Comma-separated string
 * @returns {string[]} - Array of trimmed strings (empty strings filtered out)
 */
function parseCommaSeparated(str) {
  return String(str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Deep clone an object using JSON serialization.
 * Note: Does not handle functions, undefined, or circular references.
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
function deepClone(obj) {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two values are equal (shallow comparison for objects).
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean}
 */
function shallowEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

/**
 * Format an error for display.
 * @param {Error|string|any} err - Error to format
 * @returns {string} - Formatted error message
 */
function formatError(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return String(err);
}

