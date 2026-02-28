/**
 * AccessRequestsTable View - Presentational component for access requests table.
 *
 * This component:
 * - Renders the access requests table
 * - Is a pure presentational component with no business logic
 * - Receives all data and callbacks via props
 */

function AccessRequestsTableView({
  accessRequests,
  lookupOpen,
  lookupUserid,
  setLookupUserid,
  lookupLoading,
  lookupError,
  lookupResult,
  onOpenLookup,
  onCloseLookup,
  onRunLookup,
  formatUserOrGroup,
  getStatus,
  isGrantDisabled,
  onGrantAccess,
  grantOpen,
  grantRow,
  grantRole,
  setGrantRole,
  grantUserid,
  setGrantUserid,
  grantGroup,
  setGrantGroup,
  grantError,
  grantSaving,
  onCloseGrant,
  onSaveGrant,
}) {
  const t = String(grantRow?.type || "");
  const isAppAccess = t === "app_access";
  const isGlobalAccess = t === "global_access";
  const roleOptions = isGlobalAccess ? ["viewall"] : ["viewer", "manager"];
  const readonlyInputStyle = {
    background: "#f3f4f6",
    color: "#6b7280",
    cursor: "not-allowed",
  };

  const lookupTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
  };

  function renderKeyValueRows(obj) {
    return Object.entries(obj || {}).map(([k, v]) => (
      <tr key={k}>
        <td style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb", verticalAlign: "top", width: 180 }}>
          <div className="muted">{k}</div>
        </td>
        <td style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb" }}>{v}</td>
      </tr>
    ));
  }

  function renderRolesList(roles) {
    const list = Array.isArray(roles) ? roles : [];
    if (list.length === 0) return <span className="muted">None</span>;
    return list.join(", ");
  }

  function renderAppRolesTable(appRoles) {
    const map = (appRoles && typeof appRoles === "object") ? appRoles : {};
    const entries = Object.entries(map);
    if (entries.length === 0) return <div className="muted">None</div>;
    return (
      <table style={lookupTableStyle}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Application</th>
            <th style={{ textAlign: "left" }}>Roles</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([app, roles]) => (
            <tr key={app}>
              <td style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb" }}>{app}</td>
              <td style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb" }}>{renderRolesList(roles)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderGroupAppRoles(groupAppRoles) {
    const map = (groupAppRoles && typeof groupAppRoles === "object") ? groupAppRoles : {};
    const groups = Object.entries(map);
    if (groups.length === 0) return <div className="muted">None</div>;
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {groups.map(([group, appMap]) => (
          <div key={group}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{group}</div>
            {renderAppRolesTable(appMap)}
          </div>
        ))}
      </div>
    );
  }

  function renderGroupGlobalRoles(groupGlobalRoles) {
    const map = (groupGlobalRoles && typeof groupGlobalRoles === "object") ? groupGlobalRoles : {};
    const entries = Object.entries(map);
    if (entries.length === 0) return <div className="muted">None</div>;
    return (
      <table style={lookupTableStyle}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Group</th>
            <th style={{ textAlign: "left" }}>Roles</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([group, roles]) => (
            <tr key={group}>
              <td style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb" }}>{group}</td>
              <td style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb" }}>{renderRolesList(roles)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>Access Requests</div>
        <button className="btn" type="button" onClick={onOpenLookup}>
          Lookup User role
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Requested At</th>
            <th>Requestor</th>
            <th>Type</th>
            <th>Application</th>
            <th>AccessType</th>
            <th>Userid or Group</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(accessRequests || []).length === 0 ? (
            <tr>
              <td className="muted" colSpan={8}>No access requests found.</td>
            </tr>
          ) : (
            (accessRequests || []).map((r, idx) => (
              <tr key={`${r?.requested_at || ""}:${idx}`}>
                <td className="muted">{r?.requested_at || ""}</td>
                <td>{r?.requestor || ""}</td>
                <td>{r?.type || ""}</td>
                <td>{r?.payload?.application || ""}</td>
                <td>{r?.payload?.role || ""}</td>
                <td>{formatUserOrGroup(r)}</td>
                <td>{getStatus(r, idx)}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => onGrantAccess(r, idx)}
                    disabled={isGrantDisabled(r, idx)}
                  >
                    Grant
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Grant Modal */}
      {grantOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseGrant();
          }}
          data-testid="grant-access-request-panel"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Grant Access</div>
              <button className="btn" type="button" onClick={onCloseGrant} disabled={grantSaving}>
                Close
              </button>
            </div>

            {grantError ? <div className="error" style={{ marginBottom: 10 }}>{grantError}</div> : null}

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Type</div>
                <input className="filterInput" value={t} disabled readOnly style={readonlyInputStyle} />
              </div>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Application</div>
                <input className="filterInput" value={String(grantRow?.payload?.application || "")} disabled readOnly style={readonlyInputStyle} />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Role</div>
                <select
                  className="filterInput"
                  value={grantRole}
                  onChange={(e) => setGrantRole(e.target.value)}
                  disabled={grantSaving}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {isAppAccess ? (
                <>
                  <div>
                    <div className="muted" style={{ marginBottom: 4 }}>Userid</div>
                    <input
                      className="filterInput"
                      value={grantUserid}
                      onChange={(e) => setGrantUserid(e.target.value)}
                      disabled={grantSaving}
                      placeholder='e.g. usr_app1_manager'
                    />
                  </div>
                  <div>
                    <div className="muted" style={{ marginBottom: 4 }}>Group</div>
                    <input
                      className="filterInput"
                      value={grantGroup}
                      onChange={(e) => setGrantGroup(e.target.value)}
                      disabled={grantSaving}
                      placeholder='e.g. grp_app1_manager'
                    />
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Exactly one of Userid or Group must be set.
                  </div>
                </>
              ) : isGlobalAccess ? (
                <>
                  <div>
                    <div className="muted" style={{ marginBottom: 4 }}>Userid or Group</div>
                    <input
                      className="filterInput"
                      value={grantGroup}
                      onChange={(e) => setGrantGroup(e.target.value)}
                      disabled={grantSaving}
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" type="button" onClick={onCloseGrant} disabled={grantSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={onSaveGrant} disabled={grantSaving}>
                {grantSaving ? "Granting..." : "Grant"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Lookup User roles Panel */}
      {lookupOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseLookup();
          }}
          data-testid="lookup-user-roles-panel"
        >
          <div className="card" style={{ width: 860, maxWidth: "94vw", padding: 16, overflow: "auto", maxHeight: "92vh" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Lookup User roles</div>
              <button className="btn" type="button" onClick={onCloseLookup} disabled={lookupLoading}>
                Close
              </button>
            </div>

            {lookupError ? <div className="error" style={{ marginBottom: 10 }}>{lookupError}</div> : null}

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ marginBottom: 4 }}>Userid</div>
                <input
                  className="filterInput"
                  value={lookupUserid}
                  onChange={(e) => setLookupUserid(e.target.value)}
                  disabled={lookupLoading}
                  placeholder='e.g. usr_platform_admin'
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRunLookup();
                  }}
                />
              </div>
              <button className="btn btn-primary" type="button" onClick={onRunLookup} disabled={lookupLoading}>
                {lookupLoading ? "Looking up..." : "Lookup"}
              </button>
            </div>

            {lookupResult ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Summary</div>
                  <table style={lookupTableStyle}>
                    <tbody>
                      {renderKeyValueRows({
                        userid: lookupResult?.userid || "",
                        groups: Array.isArray(lookupResult?.groups) ? lookupResult.groups.join(", ") : "",
                        combined_global_roles: renderRolesList(lookupResult?.combined_global_roles),
                      })}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Combined App Roles</div>
                  {renderAppRolesTable(lookupResult?.combined_app_roles)}
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>User Global Roles</div>
                  <table style={lookupTableStyle}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb" }}>{renderRolesList(lookupResult?.user_global_roles)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Group Global Roles</div>
                  {renderGroupGlobalRoles(lookupResult?.group_global_roles)}
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>User App Roles</div>
                  {renderAppRolesTable(lookupResult?.user_app_roles)}
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Group App Roles</div>
                  {renderGroupAppRoles(lookupResult?.group_app_roles)}
                </div>
              </div>
            ) : (
              <div className="muted">Enter a userid and click Lookup to see roles.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
