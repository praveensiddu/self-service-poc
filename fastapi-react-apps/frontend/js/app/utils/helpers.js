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
