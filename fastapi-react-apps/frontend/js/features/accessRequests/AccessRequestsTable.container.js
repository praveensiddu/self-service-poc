/**
 * AccessRequestsTable Container - Manages access requests table state and logic.
 *
 * This container:
 * - Manages local UI state (filters, etc.)
 * - Handles user interactions
 * - Passes data and callbacks to AccessRequestsTable view component
 */

function AccessRequestsTable({
  accessRequests,
  accessRequestStatusByKey,
  onGrantAccessRequest,
  getAccessRequestKey,
}) {
  /**
   * Format the userid or group display value.
   * @param {Object} r - Access request object
   * @returns {string} - Formatted display value
   */
  function formatUserOrGroup(r) {
    const payload = r?.payload || {};
    const userid = safeTrim(payload?.userid);
    const group = safeTrim(payload?.group);
    const usrOrGrp = safeTrim(payload?.usr_or_grp);

    if (userid) return userid;
    if (group) return group;
    if (usrOrGrp) return usrOrGrp;
    return "";
  }

  /**
   * Get the status display for a request.
   * @param {Object} r - Access request object
   * @param {number} idx - Request index
   * @returns {string} - Status message
   */
  function getStatus(r, idx) {
    const key = getAccessRequestKey(r, idx);
    const s = (accessRequestStatusByKey || {})[key];
    if (!s) return "Pending";
    if (s?.state === "error") return `Error: ${s?.message || ""}`;
    return s?.message || s?.state || "";
  }

  /**
   * Check if the grant button should be disabled.
   * @param {Object} r - Access request object
   * @param {number} idx - Request index
   * @returns {boolean} - Whether button is disabled
   */
  function isGrantDisabled(r, idx) {
    const key = getAccessRequestKey(r, idx);
    const s = (accessRequestStatusByKey || {})[key];
    return s?.state === "granting" || s?.state === "granted";
  }

  /**
   * Handle grant access button click.
   * @param {Object} r - Access request object
   * @param {number} idx - Request index
   */
  function handleGrantAccess(r, idx) {
    if (onGrantAccessRequest) {
      onGrantAccessRequest(r, idx);
    }
  }

  return (
    <AccessRequestsTableView
      accessRequests={accessRequests}
      formatUserOrGroup={formatUserOrGroup}
      getStatus={getStatus}
      isGrantDisabled={isGrantDisabled}
      onGrantAccess={handleGrantAccess}
    />
  );
}
