function ClustersTableView({
  envKeys,
  activeEnv,
  clustersByEnv,
  onEnvClick,
  onAddCluster,
  onEditCluster,
  onDeleteCluster,
  loading,
  showCreate,
  onOpenCreate,
  onCloseCreate,
  filters,
  setFilters,
  filteredRows,
  selectedClusters,
  onToggleCluster,
  allSelected,
  onSelectAll,
  readonly,
}) {
  const [draft, setDraft] = React.useState({
    clustername: "",
    purpose: "",
    datacenter: "",
    applications: "",
  });

  const [draftRanges, setDraftRanges] = React.useState([{ startIp: "", endIp: "" }]);

  function normalizeApplicationsInput(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9,]/g, "");
  }

  const [showEdit, setShowEdit] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState({
    clustername: "",
    purpose: "",
    datacenter: "",
    applications: "",
  });

  const [editRanges, setEditRanges] = React.useState([{ startIp: "", endIp: "" }]);

  const canSubmitCreate = Boolean(
    (draft.clustername || "").trim() &&
      (draft.purpose || "").trim() &&
      (draft.datacenter || "").trim() &&
      (draft.applications || "").trim(),
  );

  const envKey = String(activeEnv || "").toUpperCase();

  function isValidIp(s) {
    const v = String(s || "").trim();
    if (!v) return true;
    const ipv4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    if (ipv4.test(v)) return true;
    const ipv6 = /^(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}$|^(?:[A-Fa-f0-9]{1,4}:){1,7}:$|^(?:[A-Fa-f0-9]{1,4}:){1,6}:[A-Fa-f0-9]{1,4}$|^(?:[A-Fa-f0-9]{1,4}:){1,5}(?::[A-Fa-f0-9]{1,4}){1,2}$|^(?:[A-Fa-f0-9]{1,4}:){1,4}(?::[A-Fa-f0-9]{1,4}){1,3}$|^(?:[A-Fa-f0-9]{1,4}:){1,3}(?::[A-Fa-f0-9]{1,4}){1,4}$|^(?:[A-Fa-f0-9]{1,4}:){1,2}(?::[A-Fa-f0-9]{1,4}){1,5}$|^[A-Fa-f0-9]{1,4}:(?:(?::[A-Fa-f0-9]{1,4}){1,6})$|^:(?:(?::[A-Fa-f0-9]{1,4}){1,7}|:)$|^(?:[A-Fa-f0-9]{1,4}:){1,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    return ipv6.test(v);
  }

  async function onSubmitAdd() {
    try {
      const applications = String(draft.applications || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (let i = 0; i < (draftRanges || []).length; i += 1) {
        const r = draftRanges[i] || {};
        const startIp = String(r?.startIp || "").trim();
        const endIp = String(r?.endIp || "").trim();
        if (startIp && !isValidIp(startIp)) {
          alert(`Invalid Start IP in range ${i + 1}: ${startIp}`);
          return;
        }
        if (endIp && !isValidIp(endIp)) {
          alert(`Invalid End IP in range ${i + 1}: ${endIp}`);
          return;
        }
      }

      const l4_ingress_ip_ranges = (draftRanges || [])
        .map((r) => ({
          start_ip: String(r?.startIp || "").trim(),
          end_ip: String(r?.endIp || "").trim(),
        }))
        .filter((r) => r.start_ip || r.end_ip);

      await onAddCluster({
        clustername: String(draft.clustername || ""),
        purpose: String(draft.purpose || ""),
        datacenter: String(draft.datacenter || ""),
        applications,
        l4_ingress_ip_ranges,
      });
      onCloseCreate();
      setDraft({ clustername: "", purpose: "", datacenter: "", applications: "" });
      setDraftRanges([{ startIp: "", endIp: "" }]);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  function openEditCluster(row) {
    const r = row || {};
    const apps = Array.isArray(r?.applications) ? r.applications.map(String) : [];
    const ranges = Array.isArray(r?.l4_ingress_ip_ranges) ? r.l4_ingress_ip_ranges : [];
    setEditDraft({
      clustername: String(r?.clustername || ""),
      purpose: String(r?.purpose || ""),
      datacenter: String(r?.datacenter || ""),
      applications: apps.join(","),
    });
    setEditRanges(
      ranges.length
        ? ranges.map((x) => ({ startIp: String(x?.start_ip || ""), endIp: String(x?.end_ip || "") }))
        : [{ startIp: "", endIp: "" }],
    );
    setShowEdit(true);
  }

  async function onSubmitEdit() {
    try {
      const applications = String(editDraft.applications || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (let i = 0; i < (editRanges || []).length; i += 1) {
        const r = editRanges[i] || {};
        const startIp = String(r?.startIp || "").trim();
        const endIp = String(r?.endIp || "").trim();
        if (startIp && !isValidIp(startIp)) {
          alert(`Invalid Start IP in range ${i + 1}: ${startIp}`);
          return;
        }
        if (endIp && !isValidIp(endIp)) {
          alert(`Invalid End IP in range ${i + 1}: ${endIp}`);
          return;
        }
      }

      const l4_ingress_ip_ranges = (editRanges || [])
        .map((r) => ({
          start_ip: String(r?.startIp || "").trim(),
          end_ip: String(r?.endIp || "").trim(),
        }))
        .filter((r) => r.start_ip || r.end_ip);

      await onAddCluster({
        clustername: String(editDraft.clustername || ""),
        purpose: String(editDraft.purpose || ""),
        datacenter: String(editDraft.datacenter || ""),
        applications,
        l4_ingress_ip_ranges,
      });

      setShowEdit(false);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  return (
    <>
      {showCreate ? (
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
            if (e.target === e.currentTarget) onCloseCreate();
          }}
          data-testid="create-cluster-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Add Cluster ({envKey})</div>
              <button
                className="btn"
                type="button"
                onClick={onCloseCreate}
                data-testid="close-modal-btn"
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Clustername</div>
                  <div className="muted" style={{ fontSize: 12 }}>Unique cluster identifier</div>
                </div>
                <input
                  className="filterInput"
                  value={draft.clustername}
                  onChange={(e) => setDraft((p) => ({ ...p, clustername: String(e.target.value || "").toLowerCase() }))}
                  data-testid="input-clustername"
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Purpose</div>
                  <div className="muted" style={{ fontSize: 12 }}>What this cluster is used for</div>
                </div>
                <input
                  className="filterInput"
                  value={draft.purpose}
                  onChange={(e) => setDraft((p) => ({ ...p, purpose: e.target.value }))}
                  data-testid="input-purpose"
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Datacenter</div>
                  <div className="muted" style={{ fontSize: 12 }}>Physical/region location</div>
                </div>
                <input
                  className="filterInput"
                  value={draft.datacenter}
                  onChange={(e) => setDraft((p) => ({ ...p, datacenter: String(e.target.value || "").toLowerCase() }))}
                  data-testid="input-datacenter"
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Applications</div>
                  <div className="muted" style={{ fontSize: 12 }}>Comma-separated app names</div>
                </div>
                <input
                  className="filterInput"
                  placeholder="comma-separated"
                  value={draft.applications}
                  onChange={(e) => setDraft((p) => ({ ...p, applications: normalizeApplicationsInput(e.target.value) }))}
                  data-testid="input-applications"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">L4 Ingress IP Ranges</div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setDraftRanges((prev) => [...(Array.isArray(prev) ? prev : []), { startIp: "", endIp: "" }])}
                  >
                    + Add Range
                  </button>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(draftRanges || []).map((r, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                      <input
                        className="filterInput"
                        placeholder="Start IP"
                        value={String(r?.startIp || "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), startIp: v };
                            return next;
                          });
                        }}
                      />
                      <input
                        className="filterInput"
                        placeholder="End IP"
                        value={String(r?.endIp || "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), endIp: v };
                            return next;
                          });
                        }}
                      />
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setDraftRanges((prev) => {
                            const next = (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx);
                            return next.length ? next : [{ startIp: "", endIp: "" }];
                          });
                        }}
                        disabled={(draftRanges || []).length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={onSubmitAdd}
                  disabled={loading || !canSubmitCreate}
                  data-testid="submit-cluster-btn"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showEdit ? (
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
            if (e.target === e.currentTarget) setShowEdit(false);
          }}
          data-testid="edit-cluster-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Edit Cluster ({envKey})</div>
              <button
                className="btn"
                type="button"
                onClick={() => setShowEdit(false)}
                data-testid="close-edit-modal-btn"
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Clustername</div>
                  <div className="muted" style={{ fontSize: 12 }}>Read-only</div>
                </div>
                <input
                  className="filterInput"
                  value={editDraft.clustername}
                  disabled
                  readOnly
                  data-testid="edit-input-clustername"
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Purpose</div>
                  <div className="muted" style={{ fontSize: 12 }}>What this cluster is used for</div>
                </div>
                <input
                  className="filterInput"
                  value={editDraft.purpose}
                  onChange={(e) => setEditDraft((p) => ({ ...p, purpose: e.target.value }))}
                  data-testid="edit-input-purpose"
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Datacenter</div>
                  <div className="muted" style={{ fontSize: 12 }}>Physical/region location</div>
                </div>
                <input
                  className="filterInput"
                  value={editDraft.datacenter}
                  onChange={(e) => setEditDraft((p) => ({ ...p, datacenter: String(e.target.value || "").toLowerCase() }))}
                  data-testid="edit-input-datacenter"
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Applications</div>
                  <div className="muted" style={{ fontSize: 12 }}>Comma-separated app names</div>
                </div>
                <input
                  className="filterInput"
                  placeholder="comma-separated"
                  value={editDraft.applications}
                  onChange={(e) => setEditDraft((p) => ({ ...p, applications: normalizeApplicationsInput(e.target.value) }))}
                  data-testid="edit-input-applications"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">L4 Ingress IP Ranges</div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setEditRanges((prev) => [...(Array.isArray(prev) ? prev : []), { startIp: "", endIp: "" }])}
                  >
                    + Add Range
                  </button>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(editRanges || []).map((r, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                      <input
                        className="filterInput"
                        placeholder="Start IP"
                        value={String(r?.startIp || "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), startIp: v };
                            return next;
                          });
                        }}
                      />
                      <input
                        className="filterInput"
                        placeholder="End IP"
                        value={String(r?.endIp || "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), endIp: v };
                            return next;
                          });
                        }}
                      />
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setEditRanges((prev) => {
                            const next = (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx);
                            return next.length ? next : [{ startIp: "", endIp: "" }];
                          });
                        }}
                        disabled={(editRanges || []).length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={onSubmitEdit}
                  disabled={loading || !(editDraft.clustername || "").trim()}
                  data-testid="submit-edit-cluster-btn"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="tabs">
        {envKeys.map((env) => (
          <button
            key={env}
            className={env === activeEnv ? "tab active" : "tab"}
            onClick={() => onEnvClick(env)}
            type="button"
            data-testid={`env-tab-${env}`}
          >
            {env}
          </button>
        ))}
      </div>

      <div className="actions" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        {!readonly && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={onOpenCreate}
            disabled={loading}
            data-testid="add-cluster-btn"
          >
            Add Cluster
          </button>
        )}
      </div>

      <div className="card">
        <table data-testid="clusters-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  aria-label="Select all clusters"
                  data-testid="select-all-checkbox"
                />
              </th>
              <th>Clustername</th>
              <th>Purpose</th>
              <th>Datacenter</th>
              <th>Applications</th>
              <th>L4 Ingress IP Ranges</th>
              <th>Actions</th>
            </tr>
            <tr>
              <th></th>
              <th>
                <input
                  className="filterInput"
                  value={filters.clustername}
                  onChange={(e) => setFilters((p) => ({ ...p, clustername: e.target.value }))}
                  data-testid="filter-clustername"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.purpose}
                  onChange={(e) => setFilters((p) => ({ ...p, purpose: e.target.value }))}
                  data-testid="filter-purpose"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.datacenter}
                  onChange={(e) => setFilters((p) => ({ ...p, datacenter: e.target.value }))}
                  data-testid="filter-datacenter"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.applications}
                  onChange={(e) => setFilters((p) => ({ ...p, applications: e.target.value }))}
                  data-testid="filter-applications"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.l4IngressIpRanges}
                  onChange={(e) => setFilters((p) => ({ ...p, l4IngressIpRanges: e.target.value }))}
                  data-testid="filter-l4-ingress-ip-ranges"
                />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(filteredRows || []).map((r) => (
              <tr key={r?.clustername || JSON.stringify(r)} data-testid={`cluster-row-${r?.clustername}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedClusters?.has(r?.clustername)}
                    onChange={(e) => onToggleCluster(r?.clustername, e.target.checked)}
                    aria-label={`Select ${r?.clustername}`}
                    data-testid={`cluster-checkbox-${r?.clustername}`}
                  />
                </td>
                <td>{r?.clustername || ""}</td>
                <td>{r?.purpose || ""}</td>
                <td>{r?.datacenter || ""}</td>
                <td>{Array.isArray(r?.applications) ? r.applications.join(", ") : ""}</td>
                <td>
                  {Array.isArray(r?.l4_ingress_ip_ranges)
                    ? r.l4_ingress_ip_ranges
                      .map((x) => `${String(x?.start_ip || "").trim()}-${String(x?.end_ip || "").trim()}`)
                      .filter((s) => s !== "-")
                      .join(", ")
                    : ""}
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {!readonly && (
                      <>
                        <button
                          className="iconBtn iconBtn-primary"
                          type="button"
                          onClick={() => {
                            if (typeof onEditCluster === "function") onEditCluster(r);
                            else openEditCluster(r);
                          }}
                          disabled={loading || !(r?.clustername || "").trim()}
                          aria-label={`Edit ${r?.clustername}`}
                          title="Edit cluster"
                          data-testid={`edit-cluster-${r?.clustername}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z"/>
                            <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z"/>
                          </svg>
                        </button>
                        <button
                          className="iconBtn iconBtn-danger"
                          type="button"
                          onClick={() => onDeleteCluster(r?.clustername || "")}
                          disabled={loading || !(r?.clustername || "").trim()}
                          aria-label={`Delete ${r?.clustername}`}
                          title="Delete cluster"
                          data-testid={`delete-cluster-${r?.clustername}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(filteredRows || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="muted" data-testid="no-clusters-message">
                  No clusters found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
