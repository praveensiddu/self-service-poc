function L4IngressTableView({
  filters,
  setFilters,
  rows,
  filteredRows,
  onEditRow,
  onAllocateRow,
  onReleaseRow,
  readonly,
  canManage,
  renderAddButton,
  onOpenAdd,
  addOpen,
  addClusters,
  addClusterNo,
  setAddClusterNo,
  addPurpose,
  setAddPurpose,
  addRequested,
  setAddRequested,
  addError,
  addSaving,
  onSaveAdd,
  onCloseAdd,
  editOpen,
  editRow,
  editRequested,
  setEditRequested,
  editError,
  editSaving,
  onSaveEdit,
  onCloseEdit,
  releaseOpen,
  releaseRow,
  releaseIp,
  setReleaseIp,
  releaseError,
  releaseSaving,
  onSaveRelease,
  onCloseRelease,
  errorModalOpen,
  errorModalMessage,
  onCloseErrorModal,
  env,
  appname,
}) {
  return (
    <>
      {typeof renderAddButton !== 'function' && !readonly && canManage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn btn-primary" type="button" onClick={onOpenAdd}>
            + Add
          </button>
        </div>
      )}

      {/* Table View */}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Cluster</th>
              <th>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <span>Purpose</span>
                  <HelpIconButton docPath="/static/help/l4IngressTable/purpose.html" title="Purpose" />
                </span>
              </th>
              <th>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <span>Requested</span>
                  <HelpIconButton docPath="/static/help/l4IngressTable/requested.html" title="Requested" />
                </span>
              </th>
              <th>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <span>Allocated</span>
                  <HelpIconButton docPath="/static/help/l4IngressTable/allocated.html" title="Allocated" />
                </span>
              </th>
              <th>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <span>Allocated IPs</span>
                  <HelpIconButton docPath="/static/help/l4IngressTable/allocatedIps.html" title="Allocated IPs" />
                </span>
              </th>
              {!readonly && <th>Actions</th>}
            </tr>
            <tr>
              <th>
                <input
                  className="filterInput"
                  value={filters.cluster}
                  onChange={(e) => setFilters((p) => ({ ...p, cluster: e.target.value }))}
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.purpose}
                  onChange={(e) => setFilters((p) => ({ ...p, purpose: e.target.value }))}
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.requested}
                  onChange={(e) => setFilters((p) => ({ ...p, requested: e.target.value }))}
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.allocated}
                  onChange={(e) => setFilters((p) => ({ ...p, allocated: e.target.value }))}
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.allocatedIps}
                  onChange={(e) => setFilters((p) => ({ ...p, allocatedIps: e.target.value }))}
                />
              </th>
              {!readonly && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No L4 ingress allocations found.</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No matches.</td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.key}>
                  <td>{r.clusterNo}</td>
                  <td>{r.purpose}</td>
                  <td>{r.requested}</td>
                  <td
                    style={
                      Number(r?.allocatedRaw ?? 0) !== Number(r?.requestedRaw ?? 0)
                        ? { background: "#fff3cd" }
                        : undefined
                    }
                  >
                    {r.allocated}
                  </td>
                  <td>{r.allocatedIps}</td>
                  {!readonly && (
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="iconBtn iconBtn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canManage) {
                              onEditRow(r);
                            }
                          }}
                          aria-label="Edit"
                          title={canManage ? "Edit" : "No permission to edit"}
                          disabled={!canManage}
                          style={{
                            opacity: canManage ? 1 : 0.4,
                            cursor: canManage ? 'pointer' : 'not-allowed',
                            pointerEvents: canManage ? 'auto' : 'none'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
                            <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="iconBtn iconBtn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canManage && Array.isArray(r?.allocatedIpsRaw) && r.allocatedIpsRaw.length > 0) {
                              onReleaseRow(r);
                            }
                          }}
                          aria-label="Release"
                          title={!canManage ? "No permission to release" : (Array.isArray(r?.allocatedIpsRaw) && r.allocatedIpsRaw.length > 0 ? "Release" : "No allocated IPs")}
                          disabled={!canManage || !(Array.isArray(r?.allocatedIpsRaw) && r.allocatedIpsRaw.length > 0)}
                          style={{
                            opacity: (canManage && Array.isArray(r?.allocatedIpsRaw) && r.allocatedIpsRaw.length > 0) ? 1 : 0.4,
                            cursor: (canManage && Array.isArray(r?.allocatedIpsRaw) && r.allocatedIpsRaw.length > 0) ? 'pointer' : 'not-allowed',
                            pointerEvents: (canManage && Array.isArray(r?.allocatedIpsRaw) && r.allocatedIpsRaw.length > 0) ? 'auto' : 'none'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="iconBtn iconBtn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canManage && Number(r?.allocatedRaw ?? 0) < Number(r?.requestedRaw ?? 0) && r?.hasIpRange) {
                              onAllocateRow(r);
                            }
                          }}
                          disabled={!canManage || !(Number(r?.allocatedRaw ?? 0) < Number(r?.requestedRaw ?? 0) && r?.hasIpRange)}
                          aria-label="Allocate"
                          title={!canManage ? "No permission to allocate" : "Allocate"}
                          style={{
                            opacity: (canManage && Number(r?.allocatedRaw ?? 0) < Number(r?.requestedRaw ?? 0) && r?.hasIpRange) ? 1 : 0.4,
                            cursor: (canManage && Number(r?.allocatedRaw ?? 0) < Number(r?.requestedRaw ?? 0) && r?.hasIpRange) ? 'pointer' : 'not-allowed',
                            pointerEvents: (canManage && Number(r?.allocatedRaw ?? 0) < Number(r?.requestedRaw ?? 0) && r?.hasIpRange) ? 'auto' : 'none'
                          }}
                        >
                          <svg
                            className="allocateIcon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 64 64"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <rect x="10" y="6" width="44" height="8" rx="2" />
                            <text x="32" y="12" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">L4</text>
                            <path d="M32 14v10" />
                            <path d="M28 20l4 4 4-4" />
                            <rect x="8" y="36" width="14" height="10" rx="2" />
                            <rect x="25" y="36" width="14" height="10" rx="2" />
                            <rect x="42" y="36" width="14" height="10" rx="2" />
                            <path d="M15 36v-6h34v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {addOpen ? (
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
            if (e.target === e.currentTarget) onCloseAdd();
          }}
          data-testid="add-l4-ingress-panel"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""} App: {appname || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Add L4 Ingress Request</div>
              <button className="btn" type="button" onClick={onCloseAdd}>
                Close
              </button>
            </div>
            {addError ? <div className="error" style={{ marginBottom: 10 }}>{addError}</div> : null}
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Cluster</div>
                </div>
                <select
                  className="filterInput"
                  value={addClusterNo}
                  onChange={(e) => setAddClusterNo(e.target.value)}
                  disabled={addSaving}
                >
                  <option value="">Select...</option>
                  {(addClusters || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Purpose</div>
                  <div className="muted" style={{ fontSize: 12 }}>non http protocols like mysql,postgres, kafka need routing using ip address</div>
                </div>
                <input
                  className="filterInput"
                  value={addPurpose}
                  onChange={(e) => setAddPurpose(e.target.value)}
                  disabled={addSaving}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Requested</div>
                  <div className="muted" style={{ fontSize: 12 }}>Whole number 0..256</div>
                </div>
                <input
                  className="filterInput"
                  type="number"
                  min={0}
                  max={256}
                  step={1}
                  value={addRequested}
                  onChange={(e) => setAddRequested(e.target.value)}
                  disabled={addSaving}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" type="button" onClick={onCloseAdd} disabled={addSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={onSaveAdd} disabled={addSaving}>
                {addSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Release Modal */}
      {releaseOpen ? (
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
            if (e.target === e.currentTarget) onCloseRelease();
          }}
          data-testid="release-l4-ingress-panel"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""} App: {appname || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Release L4 Ingress IP</div>
              <button className="btn" type="button" onClick={onCloseRelease}>
                Close
              </button>
            </div>
            {releaseError ? <div className="error" style={{ marginBottom: 10 }}>{releaseError}</div> : null}

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Cluster</div>
                </div>
                <input className="filterInput" value={String(releaseRow?.clusterNo || "")} disabled readOnly />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Purpose</div>
                </div>
                <input className="filterInput" value={String(releaseRow?.purpose || "")} disabled readOnly />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">IP</div>
                </div>
                <select
                  className="filterInput"
                  value={releaseIp}
                  onChange={(e) => setReleaseIp(e.target.value)}
                  disabled={releaseSaving}
                >
                  <option value="">Select...</option>
                  {(Array.isArray(releaseRow?.allocatedIpsRaw) ? releaseRow.allocatedIpsRaw : []).map((ip) => (
                    <option key={ip} value={ip}>{ip}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" type="button" onClick={onCloseRelease} disabled={releaseSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={onSaveRelease} disabled={releaseSaving}>
                {releaseSaving ? "Releasing..." : "Release"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {editOpen ? (
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
            if (e.target === e.currentTarget) onCloseEdit();
          }}
          data-testid="edit-l4-ingress-panel"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""} App: {appname || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Edit L4 Ingress Requested</div>
              <button className="btn" type="button" onClick={onCloseEdit}>
                Close
              </button>
            </div>
            {editError ? <div className="error" style={{ marginBottom: 10 }}>{editError}</div> : null}
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Cluster</div>
                </div>
                <input className="filterInput" value={String(editRow?.clusterNo || "")} disabled readOnly />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Purpose</div>
                </div>
                <input className="filterInput" value={String(editRow?.purpose || "")} disabled readOnly />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Requested</div>
                  <div className="muted" style={{ fontSize: 12 }}>Total number of IPs requested for this app from each cluster</div>
                </div>
                <input
                  className="filterInput"
                  type="number"
                  min={0}
                  max={256}
                  step={1}
                  value={editRequested}
                  onChange={(e) => setEditRequested(e.target.value)}
                  disabled={editSaving}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" type="button" onClick={onCloseEdit} disabled={editSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={onSaveEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Error Modal */}
      {errorModalOpen ? (
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
            if (e.target === e.currentTarget) onCloseErrorModal();
          }}
        >
          <div className="card" style={{ width: 480, maxWidth: "92vw", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Error</div>
              <button className="btn" type="button" onClick={onCloseErrorModal}>
                Close
              </button>
            </div>
            <div className="error" style={{ marginBottom: 12 }}>{errorModalMessage}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" type="button" onClick={onCloseErrorModal}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
