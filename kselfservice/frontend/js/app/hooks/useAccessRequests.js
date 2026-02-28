/**
 * useAccessRequests Hook - Manages access requests state and operations.
 *
 * This hook provides:
 * - Access requests list state
 * - Grant access operations
 * - Status tracking for each request
 *
 * Note: Uses global functions from services/appsService.js
 */

/**
 * Custom hook for managing access requests.
 * @param {Object} params - Hook parameters
 * @param {Function} params.setLoading - Loading state setter
 * @param {Function} params.setError - Error state setter
 * @returns {Object} - Access requests state and operations
 */
function useAccessRequests({
  setLoading,
  setError,
}) {
  const [accessRequests, setAccessRequests] = React.useState([]);
  const [accessRequestStatusByKey, setAccessRequestStatusByKey] = React.useState({});

  /**
   * Generate a unique key for an access request.
   * @param {Object} r - Access request object
   * @param {number} idx - Index in the array
   * @returns {string} - Unique key
   */
  const getAccessRequestKey = React.useCallback((r, idx) => {
    const requestedAt = r?.requested_at || "";
    const requestor = r?.requestor || "";
    const type = r?.type || "";
    if (requestedAt && requestor && type) return `${requestedAt}:${requestor}:${type}`;
    return `${requestedAt}:${idx}`;
  }, []);

  /**
   * Load access requests from the API.
   * @returns {Promise<Array>} - List of access requests
   */
  const loadAccessRequestsData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadAccessRequests();
      setAccessRequests(Array.isArray(data) ? data : []);
      return data;
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * Grant access for a request.
   * @param {Object} r - Access request object
   * @param {number} idx - Index in the array
   * @param {Object} overridePayload - Optional payload override from UI
   */
  const grantAccessRequest = React.useCallback(async (r, idx, overridePayload) => {
    const key = getAccessRequestKey(r, idx);

    try {
      setAccessRequestStatusByKey((prev) => ({
        ...(prev || {}),
        [key]: { state: "granting", message: "Granting…" },
      }));

      const t = String(r?.type || "");
      const payload = (overridePayload && typeof overridePayload === "object") ? overridePayload : (r?.payload || {});

      if (t === "app_access") {
        await grantAppAccessRequest(payload);
      } else if (t === "global_access") {
        await grantGlobalAccessRequest(payload);
      } else {
        throw new Error(`Unsupported access request type: ${t}`);
      }

      // Refresh access requests after a successful grant so the table reflects persisted status.
      try {
        const data = await loadAccessRequests();
        setAccessRequests(Array.isArray(data) ? data : []);
      } catch {
        // Best-effort refresh; do not fail the grant flow if reload fails.
      }

      // Clear in-flight state; UI should reflect persisted status from backend after reload.
      setAccessRequestStatusByKey((prev) => {
        const updated = { ...(prev || {}) };
        delete updated[key];
        return updated;
      });
    } catch (e) {
      // Remove the "granting" status and revert to pending
      setAccessRequestStatusByKey((prev) => {
        const updated = { ...(prev || {}) };
        delete updated[key];
        return updated;
      });

      // Show error in modal instead of in status column
      setError(e);
    }
  }, [getAccessRequestKey, setError]);

  return {
    accessRequests,
    accessRequestStatusByKey,
    loadAccessRequestsData,
    grantAccessRequest,
    getAccessRequestKey,
  };
}
