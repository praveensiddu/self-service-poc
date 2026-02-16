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

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Access Requests</div>

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
    </div>
  );
}
