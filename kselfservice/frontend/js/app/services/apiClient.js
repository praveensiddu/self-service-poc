/**
 * API Client - Network helpers for making HTTP requests.
 *
 * This file exports pure functions that handle JSON-based API calls.
 * All functions are exposed globally for use with Babel standalone.
 */

/**
 * Extract a human-readable error message and parsed body from a fetch Response.
 * Attempts to parse JSON with a `detail` field first, then falls back to plain text or HTTP status.
 * @param {Response} res - Fetch API Response object
 * @returns {Promise<{message: string, status: number, body: any, rawText: string}>} - Error info
 */
async function readErrorMessage(res) {
  try {
    const rawText = await res.text();
    const status = res.status;
    if (!rawText) return { message: `HTTP ${status}`, status, body: null, rawText: "" };

    try {
      const parsed = JSON.parse(rawText);
      // Prefer parsed.detail when it's a string
      if (parsed && typeof parsed.detail === "string") return { message: parsed.detail, status, body: parsed, rawText };
      // Handle detail as an object (e.g., from Casbin RBAC errors)
      if (parsed && typeof parsed.detail === "object" && parsed.detail.message) {
        return { message: parsed.detail.message, status, body: parsed, rawText };
      }
      // Fallback: if parsed has a 'message' field, use that
      if (parsed && typeof parsed.message === "string") return { message: parsed.message, status, body: parsed, rawText };
      return { message: rawText, status, body: parsed, rawText };
    } catch {
      // If JSON parse fails, return the raw text
      return { message: rawText, status, body: rawText, rawText };
    }
  } catch {
    return { message: `HTTP ${res.status}`, status: res.status, body: null, rawText: "" };
  }
}

/**
 * Perform a GET request and return parsed JSON.
 * @param {string} url - The URL to fetch
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - If the response is not ok. The thrown Error will have `.status`, `.body`, and `.rawText` properties when available.
 */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const info = await readErrorMessage(res);
    const err = new Error(info.message);
    err.status = info.status;
    err.body = info.body;
    err.rawText = info.rawText;
    throw err;
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
    const info = await readErrorMessage(res);
    const err = new Error(info.message);
    err.status = info.status;
    err.body = info.body;
    err.rawText = info.rawText;
    throw err;
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
    const info = await readErrorMessage(res);
    const err = new Error(info.message);
    err.status = info.status;
    err.body = info.body;
    err.rawText = info.rawText;
    throw err;
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
    const info = await readErrorMessage(res);
    const err = new Error(info.message);
    err.status = info.status;
    err.body = info.body;
    err.rawText = info.rawText;
    throw err;
  }
  return await res.json();
}
