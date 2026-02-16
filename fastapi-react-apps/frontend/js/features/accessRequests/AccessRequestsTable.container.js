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
  const [grantOpen, setGrantOpen] = React.useState(false);
  const [grantRow, setGrantRow] = React.useState(null);
  const [grantIdx, setGrantIdx] = React.useState(-1);
  const [grantRole, setGrantRole] = React.useState("viewer");
  const [grantUserid, setGrantUserid] = React.useState("");
  const [grantGroup, setGrantGroup] = React.useState("");
  const [grantError, setGrantError] = React.useState("");
  const [grantSaving, setGrantSaving] = React.useState(false);

  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [lookupUserid, setLookupUserid] = React.useState("");
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState("");
  const [lookupResult, setLookupResult] = React.useState(null);

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
    const persisted = safeTrim(r?.status);
    if (persisted) return persisted;
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
    const t = String(r?.type || "");
    const payload = r?.payload || {};

    setGrantError("");
    setGrantRow(r);
    setGrantIdx(idx);

    if (t === "app_access") {
      setGrantRole(safeTrim(payload?.role) || "viewer");
      setGrantUserid(safeTrim(payload?.userid) || "");
      setGrantGroup(safeTrim(payload?.group) || "");
    } else if (t === "global_access") {
      setGrantRole(safeTrim(payload?.role) || "viewall");
      setGrantUserid("");
      setGrantGroup(safeTrim(payload?.usr_or_grp) || "");
    } else {
      setGrantRole(safeTrim(payload?.role) || "viewer");
      setGrantUserid("");
      setGrantGroup("");
    }

    setGrantOpen(true);
  }

  function closeGrant() {
    if (grantSaving) return;
    setGrantOpen(false);
    setGrantRow(null);
    setGrantIdx(-1);
    setGrantError("");
    setGrantRole("viewer");
    setGrantUserid("");
    setGrantGroup("");
  }

  function openLookup() {
    setLookupError("");
    setLookupResult(null);
    setLookupUserid("");
    setLookupOpen(true);
  }

  function closeLookup() {
    if (lookupLoading) return;
    setLookupOpen(false);
    setLookupError("");
    setLookupResult(null);
    setLookupUserid("");
  }

  async function runLookup() {
    try {
      setLookupLoading(true);
      setLookupError("");
      setLookupResult(null);
      const data = await lookupUserRoles(lookupUserid);
      setLookupResult(data);
    } catch (e) {
      setLookupError(e?.message || String(e));
    } finally {
      setLookupLoading(false);
    }
  }

  async function saveGrant() {
    if (!grantRow) return;
    const t = String(grantRow?.type || "");
    const basePayload = grantRow?.payload || {};

    const role = safeTrim(grantRole);
    const userid = safeTrim(grantUserid);
    const group = safeTrim(grantGroup);

    if (!role) {
      setGrantError("Role is required.");
      return;
    }

    if (t === "app_access") {
      if (Boolean(userid) === Boolean(group)) {
        setGrantError("Exactly one of Userid or Group is required.");
        return;
      }
    } else if (t === "global_access") {
      if (!group) {
        setGrantError("Userid or Group is required.");
        return;
      }
    }

    const nextPayload = {
      ...(basePayload || {}),
      role,
      ...(t === "app_access"
        ? { userid: userid || undefined, group: group || undefined }
        : { usr_or_grp: group || undefined }),
    };

    try {
      setGrantSaving(true);
      setGrantError("");
      if (onGrantAccessRequest) {
        await onGrantAccessRequest(grantRow, grantIdx, nextPayload);
      }
      closeGrant();
    } catch (e) {
      setGrantError(e?.message || String(e));
    } finally {
      setGrantSaving(false);
    }
  }

  return (
    <AccessRequestsTableView
      accessRequests={accessRequests}
      lookupOpen={lookupOpen}
      lookupUserid={lookupUserid}
      setLookupUserid={setLookupUserid}
      lookupLoading={lookupLoading}
      lookupError={lookupError}
      lookupResult={lookupResult}
      onOpenLookup={openLookup}
      onCloseLookup={closeLookup}
      onRunLookup={runLookup}
      formatUserOrGroup={formatUserOrGroup}
      getStatus={getStatus}
      isGrantDisabled={isGrantDisabled}
      onGrantAccess={handleGrantAccess}
      grantOpen={grantOpen}
      grantRow={grantRow}
      grantRole={grantRole}
      setGrantRole={setGrantRole}
      grantUserid={grantUserid}
      setGrantUserid={setGrantUserid}
      grantGroup={grantGroup}
      setGrantGroup={setGrantGroup}
      grantError={grantError}
      grantSaving={grantSaving}
      onCloseGrant={closeGrant}
      onSaveGrant={saveGrant}
    />
  );
}
