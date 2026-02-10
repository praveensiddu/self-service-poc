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
  apps,
}) {
  const [draft, setDraft] = React.useState({
    clustername: "",
    purpose: "",
    datacenter: "",
    applications: "",
  });

  const [draftRanges, setDraftRanges] = React.useState([{ startIp: "", endIp: "", error: "" }]);
  const [draftEgressRanges, setDraftEgressRanges] = React.useState([{ startIp: "", endIp: "", error: "" }]);
  const [showAppConfirmModal, setShowAppConfirmModal] = React.useState(false);
  const [nonExistentApps, setNonExistentApps] = React.useState([]);
  const [appConfirmMode, setAppConfirmMode] = React.useState("create"); // "create" or "edit"

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

  const [editRanges, setEditRanges] = React.useState([{ startIp: "", endIp: "", error: "" }]);
  const [editEgressRanges, setEditEgressRanges] = React.useState([{ startIp: "", endIp: "", error: "" }]);

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

  function validateIpRange(startIp, endIp) {
    const start = String(startIp || "").trim();
    const end = String(endIp || "").trim();

    if (!start && !end) return null;
    if (start && !isValidIp(start)) return "Invalid start IP address";
    if (end && !isValidIp(end)) return "Invalid end IP address";
    if (start && end && !isValidIp(start)) return "Invalid start IP address";
    if (start && end && !isValidIp(end)) return "Invalid end IP address";

    return null;
  }

  function formatIpInput(value) {
    return String(value || "").replace(/[^0-9.a-fA-F:]/g, "");
  }

  async function onSubmitAdd() {
    try {
      const applications = String(draft.applications || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Check if all applications exist
      const existingAppNames = Object.keys(apps || {});
      const missingApps = applications.filter(app => !existingAppNames.includes(app));

      if (missingApps.length > 0) {
        setNonExistentApps(missingApps);
        setAppConfirmMode("create");
        setShowAppConfirmModal(true);
        return;
      }

      await submitCluster();
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  async function submitCluster() {
    try {
      const applications = String(draft.applications || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let hasErrors = false;
      const updatedRanges = (draftRanges || []).map((r, i) => {
        const error = validateIpRange(r?.startIp, r?.endIp);
        if (error) hasErrors = true;
        return { ...r, error: error || "" };
      });

      const updatedEgressRanges = (draftEgressRanges || []).map((r, i) => {
        const error = validateIpRange(r?.startIp, r?.endIp);
        if (error) hasErrors = true;
        return { ...r, error: error || "" };
      });

      if (hasErrors) {
        setDraftRanges(updatedRanges);
        setDraftEgressRanges(updatedEgressRanges);
        return;
      }

      const l4_ingress_ip_ranges = (draftRanges || [])
        .map((r) => ({
          start_ip: String(r?.startIp || "").trim(),
          end_ip: String(r?.endIp || "").trim(),
        }))
        .filter((r) => r.start_ip || r.end_ip);

      const egress_ip_ranges = (draftEgressRanges || [])
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
        egress_ip_ranges,
      });
      onCloseCreate();
      setDraft({ clustername: "", purpose: "", datacenter: "", applications: "" });
      setDraftRanges([{ startIp: "", endIp: "", error: "" }]);
      setDraftEgressRanges([{ startIp: "", endIp: "", error: "" }]);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  function openEditCluster(row) {
    const r = row || {};
    const apps = Array.isArray(r?.applications) ? r.applications.map(String) : [];
    const ranges = Array.isArray(r?.l4_ingress_ip_ranges) ? r.l4_ingress_ip_ranges : [];
    const egressRanges = Array.isArray(r?.egress_ip_ranges) ? r.egress_ip_ranges : [];
    setEditDraft({
      clustername: String(r?.clustername || ""),
      purpose: String(r?.purpose || ""),
      datacenter: String(r?.datacenter || ""),
      applications: apps.join(","),
    });
    setEditRanges(
      ranges.length
        ? ranges.map((x) => ({ startIp: String(x?.start_ip || ""), endIp: String(x?.end_ip || ""), error: "" }))
        : [{ startIp: "", endIp: "", error: "" }],
    );
    setEditEgressRanges(
      egressRanges.length
        ? egressRanges.map((x) => ({ startIp: String(x?.start_ip || ""), endIp: String(x?.end_ip || ""), error: "" }))
        : [{ startIp: "", endIp: "", error: "" }],
    );
    setShowEdit(true);
  }

  async function onSubmitEdit() {
    try {
      const applications = String(editDraft.applications || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Check if all applications exist
      const existingAppNames = Object.keys(apps || {});
      const missingApps = applications.filter(app => !existingAppNames.includes(app));

      if (missingApps.length > 0) {
        setNonExistentApps(missingApps);
        setAppConfirmMode("edit");
        setShowAppConfirmModal(true);
        return;
      }

      await submitEditCluster();
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  async function submitEditCluster() {
    try {
      const applications = String(editDraft.applications || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let hasErrors = false;
      const updatedRanges = (editRanges || []).map((r, i) => {
        const error = validateIpRange(r?.startIp, r?.endIp);
        if (error) hasErrors = true;
        return { ...r, error: error || "" };
      });

      const updatedEgressRanges = (editEgressRanges || []).map((r, i) => {
        const error = validateIpRange(r?.startIp, r?.endIp);
        if (error) hasErrors = true;
        return { ...r, error: error || "" };
      });

      if (hasErrors) {
        setEditRanges(updatedRanges);
        setEditEgressRanges(updatedEgressRanges);
        return;
      }

      const l4_ingress_ip_ranges = (editRanges || [])
        .map((r) => ({
          start_ip: String(r?.startIp || "").trim(),
          end_ip: String(r?.endIp || "").trim(),
        }))
        .filter((r) => r.start_ip || r.end_ip);

      const egress_ip_ranges = (editEgressRanges || [])
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
        egress_ip_ranges,
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
                  <div className="muted">Clustername <span style={{ color: "#dc3545" }}>*</span></div>
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
                  <div className="muted">Purpose <span style={{ color: "#dc3545" }}>*</span></div>
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
                  <div className="muted">Datacenter <span style={{ color: "#dc3545" }}>*</span></div>
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
                  <div className="muted">Applications <span style={{ color: "#dc3545" }}>*</span></div>
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
                <div className="muted" style={{ marginBottom: 4 }}>L4 Ingress IP Ranges</div>
                <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                  Enter IP address ranges (e.g., 192.168.1.1 to 192.168.1.254)
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(draftRanges || []).map((r, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                      <input
                        className="filterInput"
                        placeholder="Start IP"
                        value={String(r?.startIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setDraftRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), startIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.endIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setDraftRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      <div style={{ fontSize: 16, color: "#6c757d", textAlign: "center" }}>→</div>
                      <input
                        className="filterInput"
                        placeholder="End IP"
                        value={String(r?.endIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setDraftRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), endIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.startIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setDraftRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      {r?.error && (
                        <div style={{
                          gridColumn: "1 / -1",
                          color: "#dc3545",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                          </svg>
                          {r.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Egress IP Ranges</div>
                <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                  Enter IP address ranges (e.g., 10.0.0.1 to 10.0.0.254)
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(draftEgressRanges || []).map((r, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                      <input
                        className="filterInput"
                        placeholder="Start IP"
                        value={String(r?.startIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setDraftEgressRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), startIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.endIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setDraftEgressRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      <div style={{ fontSize: 16, color: "#6c757d", textAlign: "center" }}>→</div>
                      <input
                        className="filterInput"
                        placeholder="End IP"
                        value={String(r?.endIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setDraftEgressRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), endIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.startIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setDraftEgressRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      {r?.error && (
                        <div style={{
                          gridColumn: "1 / -1",
                          color: "#dc3545",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                          </svg>
                          {r.error}
                        </div>
                      )}
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

      {showAppConfirmModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAppConfirmModal(false);
              setNonExistentApps([]);
            }
          }}
          data-testid="app-confirm-modal"
        >
          <div
            className="card"
            style={{
              width: 500,
              maxWidth: "92vw",
              padding: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255, 193, 7, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="#ffc107">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "#212529" }}>
                  Application{nonExistentApps.length > 1 ? 's' : ''} Not Found
                </h3>
                <p style={{ margin: "0 0 12px 0", color: "rgba(0,0,0,0.7)", lineHeight: "1.5" }}>
                  The following application{nonExistentApps.length > 1 ? 's do' : ' does'} not exist:
                </p>
                <ul style={{ margin: "0 0 12px 0", paddingLeft: "20px", color: "rgba(0,0,0,0.7)" }}>
                  {nonExistentApps.map((app, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>
                      <strong>{app}</strong>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: 0, color: "rgba(0,0,0,0.7)", lineHeight: "1.5" }}>
                  Do you want to create {nonExistentApps.length > 1 ? 'these applications' : 'this application'} and continue?
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setShowAppConfirmModal(false);
                  setNonExistentApps([]);
                }}
                data-testid="cancel-app-creation-btn"
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  setShowAppConfirmModal(false);
                  setNonExistentApps([]);
                  if (appConfirmMode === "edit") {
                    await submitEditCluster();
                  } else {
                    await submitCluster();
                  }
                }}
                data-testid="confirm-app-creation-btn"
                autoFocus
              >
                Yes, Create and Continue
              </button>
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
                  <div className="muted">Purpose <span style={{ color: "#dc3545" }}>*</span></div>
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
                  <div className="muted">Datacenter <span style={{ color: "#dc3545" }}>*</span></div>
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
                <div className="muted" style={{ marginBottom: 4 }}>L4 Ingress IP Ranges</div>
                <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                  Enter IP address ranges (e.g., 192.168.1.1 to 192.168.1.254)
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(editRanges || []).map((r, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                      <input
                        className="filterInput"
                        placeholder="Start IP"
                        value={String(r?.startIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setEditRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), startIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.endIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setEditRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      <div style={{ fontSize: 16, color: "#6c757d", textAlign: "center" }}>→</div>
                      <input
                        className="filterInput"
                        placeholder="End IP"
                        value={String(r?.endIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setEditRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), endIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.startIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setEditRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      {r?.error && (
                        <div style={{
                          gridColumn: "1 / -1",
                          color: "#dc3545",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                          </svg>
                          {r.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Egress IP Ranges</div>
                <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                  Enter IP address ranges (e.g., 10.0.0.1 to 10.0.0.254)
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(editEgressRanges || []).map((r, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                      <input
                        className="filterInput"
                        placeholder="Start IP"
                        value={String(r?.startIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setEditEgressRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), startIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.endIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setEditEgressRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      <div style={{ fontSize: 16, color: "#6c757d", textAlign: "center" }}>→</div>
                      <input
                        className="filterInput"
                        placeholder="End IP"
                        value={String(r?.endIp || "")}
                        onChange={(e) => {
                          const v = formatIpInput(e.target.value);
                          setEditEgressRanges((prev) => {
                            const next = Array.isArray(prev) ? [...prev] : [];
                            next[idx] = { ...(next[idx] || {}), endIp: v, error: "" };

                            // Auto-add new row if user is typing in the last row and both fields have content
                            const isLastRow = idx === prev.length - 1;
                            const hasContent = v.trim() || next[idx]?.startIp?.trim();
                            if (isLastRow && hasContent) {
                              next.push({ startIp: "", endIp: "", error: "" });
                            }

                            return next;
                          });
                        }}
                        onBlur={() => {
                          const error = validateIpRange(r?.startIp, r?.endIp);
                          if (error) {
                            setEditEgressRanges((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], error };
                              return next;
                            });
                          }
                        }}
                        style={{
                          borderColor: r?.error ? "#dc3545" : undefined,
                        }}
                      />
                      {r?.error && (
                        <div style={{
                          gridColumn: "1 / -1",
                          color: "#dc3545",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                          </svg>
                          {r.error}
                        </div>
                      )}
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
              <th>Cluster Name</th>
              <th>Purpose</th>
              <th>Datacenter</th>
              <th>Applications</th>
              <th>L4 Ingress IP Ranges</th>
              <th>Egress IP Ranges</th>
              {!readonly && <th>Actions</th>}
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
              <th>
                <input
                  className="filterInput"
                  value={filters.egressIpRanges}
                  onChange={(e) => setFilters((p) => ({ ...p, egressIpRanges: e.target.value }))}
                  data-testid="filter-egress-ip-ranges"
                />
              </th>
              {!readonly && <th></th>}
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
                  {Array.isArray(r?.egress_ip_ranges)
                    ? r.egress_ip_ranges
                      .map((x) => `${String(x?.start_ip || "").trim()}-${String(x?.end_ip || "").trim()}`)
                      .filter((s) => s !== "-")
                      .join(", ")
                    : ""}
                </td>
                {!readonly && (
                  <td>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(filteredRows || []).length === 0 ? (
              <tr>
                <td colSpan={8} className="muted" data-testid="no-clusters-message">
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
