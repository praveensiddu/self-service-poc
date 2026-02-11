/**
 * IP Validation Utilities
 *
 * Provides IP address validation and formatting functions.
 */

/**
 * Validate if a string is a valid IPv4 or IPv6 address.
 * @param {string} s - String to validate
 * @returns {boolean} - True if valid IP address or empty string
 */
function isValidIp(s) {
  const v = String(s || "").trim();
  if (!v) return true;
  const ipv4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  if (ipv4.test(v)) return true;
  const ipv6 = /^(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}$|^(?:[A-Fa-f0-9]{1,4}:){1,7}:$|^(?:[A-Fa-f0-9]{1,4}:){1,6}:[A-Fa-f0-9]{1,4}$|^(?:[A-Fa-f0-9]{1,4}:){1,5}(?::[A-Fa-f0-9]{1,4}){1,2}$|^(?:[A-Fa-f0-9]{1,4}:){1,4}(?::[A-Fa-f0-9]{1,4}){1,3}$|^(?:[A-Fa-f0-9]{1,4}:){1,3}(?::[A-Fa-f0-9]{1,4}){1,4}$|^(?:[A-Fa-f0-9]{1,4}:){1,2}(?::[A-Fa-f0-9]{1,4}){1,5}$|^[A-Fa-f0-9]{1,4}:(?::[A-Fa-f0-9]{1,4}){1,6}$|^:(?:(?::[A-Fa-f0-9]{1,4}){1,7}|:)$|^(?:[A-Fa-f0-9]{1,4}:){1,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return ipv6.test(v);
}

/**
 * Validate an IP range (start and end IP).
 * @param {string} startIp - Start IP address
 * @param {string} endIp - End IP address
 * @returns {string|null} - Error message or null if valid
 */
function validateIpRange(startIp, endIp) {
  const start = String(startIp || "").trim();
  const end = String(endIp || "").trim();

  if (!start && !end) return null;
  if (start && !isValidIp(start)) return "Invalid start IP address";
  if (end && !isValidIp(end)) return "Invalid end IP address";

  return null;
}

/**
 * Format IP input by removing invalid characters.
 * @param {string} value - Input value to format
 * @returns {string} - Formatted IP string
 */
function formatIpInput(value) {
  return String(value || "").replace(/[^0-9.a-fA-F:]/g, "");
}

/**
 * Normalize IP ranges from UI format to API format.
 * @param {Array<{startIp: string, endIp: string}>} ranges - UI format ranges
 * @returns {Array<{start_ip: string, end_ip: string}>} - API format ranges
 */
function normalizeIpRanges(ranges) {
  return (ranges || [])
    .map((r) => ({
      start_ip: String(r?.startIp || "").trim(),
      end_ip: String(r?.endIp || "").trim(),
    }))
    .filter((r) => r.start_ip || r.end_ip);
}

/**
 * Validate all IP ranges in an array.
 * @param {Array<{startIp: string, endIp: string, error?: string}>} ranges - Ranges to validate
 * @returns {{hasErrors: boolean, updatedRanges: Array}} - Validation result
 */
function validateAllIpRanges(ranges) {
  let hasErrors = false;
  const updatedRanges = (ranges || []).map((r) => {
    const error = validateIpRange(r?.startIp, r?.endIp);
    if (error) hasErrors = true;
    return { ...r, error: error || "" };
  });
  return { hasErrors, updatedRanges };
}
