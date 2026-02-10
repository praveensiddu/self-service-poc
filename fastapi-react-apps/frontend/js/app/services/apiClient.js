/**
 * API Client - Network helpers for making HTTP requests.
 *
 * This file exports pure functions that handle JSON-based API calls.
 * All functions are exposed globally for use with Babel standalone.
 */

/**
 * Extract a human-readable error message from a fetch Response.
 * Attempts to parse JSON with a `detail` field first, then falls back to plain text or HTTP status.
 * @param {Response} res - Fetch API Response object
 * @returns {Promise<string>} - Error message string
 */
async function readErrorMessage(res) {
  try {
    const text = await res.text();
    if (!text) return `HTTP ${res.status}`;

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") return parsed.detail;
    } catch {
      // ignore JSON parse error
    }

    return text;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * Perform a GET request and return parsed JSON.
 * @param {string} url - The URL to fetch
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - If the response is not ok
 */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}

/**
 * Perform a DELETE request and return parsed JSON.
 * @param {string} url - The URL to send DELETE request to
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - If the response is not ok
 */
async function deleteJson(url) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}

/**
 * Perform a POST request with JSON body and return parsed JSON.
 * @param {string} url - The URL to send POST request to
 * @param {any} [body] - Optional request body (will be JSON stringified)
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - If the response is not ok
 */
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}

/**
 * Perform a PUT request with JSON body and return parsed JSON.
 * @param {string} url - The URL to send PUT request to
 * @param {any} [body] - Optional request body (will be JSON stringified)
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - If the response is not ok
 */
async function putJson(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}
