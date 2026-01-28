function NamespaceDetailsView({ namespace, namespaceName, appname, env, onUpdateNamespaceInfo }) {
  if (!namespace) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p className="muted">No namespace data available.</p>
      </div>
    );
  }

  const [editEnabled, setEditEnabled] = React.useState(false);
  const [draftClusters, setDraftClusters] = React.useState("");
  const [draftManagedByArgo, setDraftManagedByArgo] = React.useState(false);
  const [draftEgressNameId, setDraftEgressNameId] = React.useState("");
  const [draftReqCpu, setDraftReqCpu] = React.useState("");
  const [draftReqMemory, setDraftReqMemory] = React.useState("");
  const [draftLimCpu, setDraftLimCpu] = React.useState("");
  const [draftLimMemory, setDraftLimMemory] = React.useState("");
  const [draftRbacEntries, setDraftRbacEntries] = React.useState([]);

  React.useEffect(() => {
    const initialClusters = Array.isArray(namespace?.clusters) ? namespace.clusters.map(String).join(",") : "";
    setDraftClusters(initialClusters);
    setDraftManagedByArgo(Boolean(namespace?.need_argo || namespace?.generate_argo_app));
    setDraftEgressNameId(namespace?.egress_nameid == null ? "" : String(namespace.egress_nameid));
    setDraftReqCpu(namespace?.resources?.requests?.cpu == null ? "" : String(namespace.resources.requests.cpu));
    setDraftReqMemory(namespace?.resources?.requests?.memory == null ? "" : String(namespace.resources.requests.memory));
    setDraftLimCpu(namespace?.resources?.limits?.cpu == null ? "" : String(namespace.resources.limits.cpu));
    setDraftLimMemory(namespace?.resources?.limits?.memory == null ? "" : String(namespace.resources.limits.memory));

    // Initialize RBAC draft values
    // Backend now returns rbac as array of bindings: [{ subject: {...}, roleRef: {...} }, ...]
    let rbacEntries = [];

    if (Array.isArray(namespace?.rbac)) {
      // New format: array of bindings
      rbacEntries = namespace.rbac.map(binding => ({
        subject: { ...(binding.subject || {}) },
        roleRef: { ...(binding.roleRef || {}) }
      }));
    }

    setDraftRbacEntries(rbacEntries);

    setEditEnabled(false);
  }, [namespace, namespaceName]);

  // Helper function to format values
  function formatValue(val) {
    if (val === null || val === undefined) return "N/A";
    if (Array.isArray(val)) return val.join(", ") || "None";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  }

  const effectiveClusters = editEnabled
    ? draftClusters
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : Array.isArray(namespace?.clusters)
      ? namespace.clusters
      : [];

  const effectiveNamespace = editEnabled
    ? {
        ...namespace,
        clusters: effectiveClusters,
        egress_nameid: draftEgressNameId ? draftEgressNameId : null,
        need_argo: Boolean(draftManagedByArgo),
        generate_argo_app: false,
        status: Boolean(draftManagedByArgo) ? "Argo used" : "Argo not used",
        resources: {
          ...(namespace?.resources || {}),
          requests: {
            ...(namespace?.resources?.requests || {}),
            cpu: (draftReqCpu || "").trim(),
            memory: (draftReqMemory || "").trim(),
          },
          limits: {
            ...(namespace?.resources?.limits || {}),
            cpu: (draftLimCpu || "").trim(),
            memory: (draftLimMemory || "").trim(),
          },
        },
      }
    : namespace;

  const clusters = formatValue(effectiveNamespace?.clusters);
  const egressNameId = formatValue(effectiveNamespace?.egress_nameid);
  const podBasedEgress = effectiveNamespace?.enable_pod_based_egress_ip ? "Enabled" : "Disabled";
  const egressFirewall = formatValue(effectiveNamespace?.file_index?.egress);
  const managedByArgo = effectiveNamespace?.need_argo || effectiveNamespace?.generate_argo_app ? "Yes" : "No";

  // Extract detailed attributes
  const status = effectiveNamespace?.status || {};
  const resources = effectiveNamespace?.resources || {};
  const rbac = effectiveNamespace?.rbac || {};
  const policy = effectiveNamespace?.policy || {};

  return (
    <div>
      {/* Centered Namespace Name */}
      <div style={{ position: 'relative', marginBottom: '24px', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }} />
          <div style={{ flex: 2, textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#0d6efd' }}>
              {`${appname || ""} / ${namespaceName}`}
            </h2>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {!editEnabled ? (
              <button className="btn btn-primary" type="button" onClick={() => setEditEnabled(true)}>
                Enable Edit
              </button>
            ) : (
              <>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    const initialClusters = Array.isArray(namespace?.clusters) ? namespace.clusters.map(String).join(",") : "";
                    setDraftClusters(initialClusters);
                    setDraftManagedByArgo(Boolean(namespace?.need_argo || namespace?.generate_argo_app));
                    setDraftEgressNameId(namespace?.egress_nameid == null ? "" : String(namespace.egress_nameid));
                    setDraftReqCpu(namespace?.resources?.requests?.cpu == null ? "" : String(namespace.resources.requests.cpu));
                    setDraftReqMemory(namespace?.resources?.requests?.memory == null ? "" : String(namespace.resources.requests.memory));
                    setDraftLimCpu(namespace?.resources?.limits?.cpu == null ? "" : String(namespace.resources.limits.cpu));
                    setDraftLimMemory(namespace?.resources?.limits?.memory == null ? "" : String(namespace.resources.limits.memory));

                    // Reset RBAC draft values
                    let rbacEntries = [];

                    if (Array.isArray(namespace?.rbac)) {
                      // New format: array of bindings
                      rbacEntries = namespace.rbac.map(binding => ({
                        subject: { ...(binding.subject || {}) },
                        roleRef: { ...(binding.roleRef || {}) }
                      }));
                    }

                    setDraftRbacEntries(rbacEntries);

                    setEditEnabled(false);
                  }}
                >
                  Discard Edits
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={async () => {
                    if (typeof onUpdateNamespaceInfo !== "function") {
                      setEditEnabled(false);
                      return;
                    }

                    try {
                      const clusters = draftClusters
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const egress_nameid = (draftEgressNameId || "").trim();

                      await onUpdateNamespaceInfo(namespaceName, {
                        namespace_info: {
                          clusters,
                          need_argo: Boolean(draftManagedByArgo),
                          egress_nameid,
                        },
                        resources: {
                          requests: {
                            cpu: (draftReqCpu || "").trim(),
                            memory: (draftReqMemory || "").trim(),
                          },
                          limits: {
                            cpu: (draftLimCpu || "").trim(),
                            memory: (draftLimMemory || "").trim(),
                          },
                        },
                        rbac: {
                          bindings: draftRbacEntries.map(entry => ({
                            subject: {
                              kind: entry.subject?.kind || "User",
                              name: entry.subject?.name || ""
                            },
                            roleRef: {
                              kind: entry.roleRef?.kind || "ClusterRole",
                              name: entry.roleRef?.name || ""
                            }
                          }))
                        },
                      });
                      setEditEnabled(false);
                    } catch (error) {
                      // Display validation error to user
                      const errorMessage = error?.message || String(error);
                      alert(`Failed to save changes:\n\n${errorMessage}`);
                    }
                  }}
                >
                  Submit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="dashboardGrid">
        {/* Basic Information Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            <h3>Basic Information</h3>
          </div>
          <div className="dashboardCardBody">
            <div className="detailRow">
              <span className="detailLabel">Clusters:</span>
              {editEnabled ? (
                <input
                  className="filterInput"
                  value={draftClusters}
                  onChange={(e) => setDraftClusters(e.target.value)}
                  placeholder="01,02,03"
                />
              ) : (
                <span className="detailValue detailValueHighlight">{clusters}</span>
              )}
            </div>
            <div className="detailRow">
              <span className="detailLabel">Managed by Argo:</span>
              {editEnabled ? (
                <select
                  className="filterInput"
                  value={draftManagedByArgo ? "Yes" : "No"}
                  onChange={(e) => setDraftManagedByArgo(e.target.value === "Yes")}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              ) : (
                <span className={`detailBadge ${managedByArgo === 'Yes' ? 'detailBadgeSuccess' : 'detailBadgeSecondary'}`}>
                  {managedByArgo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Egress Configuration Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path fillRule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.854 10.803a.5.5 0 1 1-.708-.707L9.243 6H6.475a.5.5 0 1 1 0-1h3.975a.5.5 0 0 1 .5.5v3.975a.5.5 0 1 1-1 0V6.707l-4.096 4.096z"/>
            </svg>
            <h3>Egress Configuration</h3>
          </div>
          <div className="dashboardCardBody">
            <div className="detailRow">
              <span className="detailLabel">Egress Name ID:</span>
              {editEnabled ? (
                <input
                  className="filterInput"
                  value={draftEgressNameId}
                  onChange={(e) => setDraftEgressNameId(e.target.value)}
                />
              ) : (
                <span className="detailValue">{egressNameId}</span>
              )}
            </div>
            <div className="detailRow">
              <span className="detailLabel">Pod-Based Egress IP:</span>
              <span className={`detailBadge ${podBasedEgress === 'Enabled' ? 'detailBadgeSuccess' : 'detailBadgeWarning'}`}>
                {podBasedEgress}
              </span>
            </div>
          </div>
        </div>

        {/* Egress Firewall Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path fillRule="evenodd" d="M2.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-11zM3 2h10v12H3V2zm2 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 4.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 6.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8.5z"/>
            </svg>
            <h3>Egress Firewall</h3>
          </div>
          <div className="dashboardCardBody">
            <div className="detailRow">
              <span className="detailLabel">Rules:</span>
              <span className="detailValue">{egressFirewall}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Attributes Section */}
      <div className="dashboardGrid" style={{ marginTop: '20px' }}>

        {/* RBAC Configuration Card - Takes 2/3 width */}
        <div className="dashboardCard" style={{ gridColumn: 'span 2' }}>
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
            </svg>
            <h3>RBAC Configuration</h3>
            {editEnabled && (
              <button
                className="btn btn-primary"
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setDraftRbacEntries([...draftRbacEntries, {
                    subject: { kind: "User", name: "" },
                    roleRef: { kind: "ClusterRole", name: "" }
                  }]);
                }}
              >
                + Add RBAC Entry
              </button>
            )}
          </div>
          <div className="dashboardCardBody">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Role Type</th>
                    <th>Role Reference</th>
                    <th>Subject Kind</th>
                    <th>Subject Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editEnabled ? (
                    draftRbacEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                          No RBAC entries. Click "+ Add RBAC Entry" to add one.
                        </td>
                      </tr>
                    ) : (
                      draftRbacEntries.map((entry, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              className="filterInput"
                              value={entry.roleRef?.kind || "ClusterRole"}
                              onChange={(e) => {
                                const updated = [...draftRbacEntries];
                                updated[idx] = {
                                  ...updated[idx],
                                  roleRef: { ...updated[idx].roleRef, kind: e.target.value }
                                };
                                setDraftRbacEntries(updated);
                              }}
                            >
                              <option value="ClusterRole">ClusterRole</option>
                              <option value="Role">Role</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="filterInput"
                              value={entry.roleRef?.name || ""}
                              onChange={(e) => {
                                const updated = [...draftRbacEntries];
                                updated[idx] = {
                                  ...updated[idx],
                                  roleRef: { ...updated[idx].roleRef, name: e.target.value }
                                };
                                setDraftRbacEntries(updated);
                              }}
                              placeholder="e.g., cluster-admin, view"
                            />
                          </td>
                          <td>
                            <select
                              className="filterInput"
                              value={entry.subject?.kind || "User"}
                              onChange={(e) => {
                                const updated = [...draftRbacEntries];
                                updated[idx] = {
                                  ...updated[idx],
                                  subject: { ...updated[idx].subject, kind: e.target.value }
                                };
                                setDraftRbacEntries(updated);
                              }}
                            >
                              <option value="User">User</option>
                              <option value="Group">Group</option>
                              <option value="ServiceAccount">ServiceAccount</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="filterInput"
                              value={entry.subject?.name || ""}
                              onChange={(e) => {
                                const updated = [...draftRbacEntries];
                                updated[idx] = {
                                  ...updated[idx],
                                  subject: { ...updated[idx].subject, name: e.target.value }
                                };
                                setDraftRbacEntries(updated);
                              }}
                              placeholder="e.g., user@example.com"
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                className="iconBtn iconBtn-primary"
                                onClick={() => {
                                  const roleYaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ${namespaceName}-binding-${idx}
  namespace: ${namespaceName}
subjects:
- kind: ${entry.subject?.kind || "User"}
  name: ${entry.subject?.name || ""}
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ${entry.roleRef?.kind || "ClusterRole"}
  name: ${entry.roleRef?.name || ""}
  apiGroup: rbac.authorization.k8s.io`;
                                  const modal = document.createElement('div');
                                  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                                  const modalContent = document.createElement('div');
                                  modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                                  const header = document.createElement('div');
                                  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                                  header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">RBAC Role Details</h3>';

                                  const closeBtn = document.createElement('button');
                                  closeBtn.innerHTML = '&times;';
                                  closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                                  closeBtn.onclick = () => modal.remove();
                                  header.appendChild(closeBtn);

                                  const pre = document.createElement('pre');
                                  pre.textContent = roleYaml;
                                  pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                                  const footer = document.createElement('div');
                                  footer.style.cssText = 'margin-top: 16px; text-align: right;';

                                  const copyBtn = document.createElement('button');
                                  copyBtn.textContent = 'Copy';
                                  copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                                  copyBtn.onclick = () => {
                                    navigator.clipboard.writeText(roleYaml).then(() => alert('Copied to clipboard!'));
                                  };

                                  const closeBtn2 = document.createElement('button');
                                  closeBtn2.textContent = 'Close';
                                  closeBtn2.style.cssText = 'padding: 8px 16px; background: #0d6efd; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;';
                                  closeBtn2.onclick = () => modal.remove();

                                  footer.appendChild(copyBtn);
                                  footer.appendChild(closeBtn2);

                                  modalContent.appendChild(header);
                                  modalContent.appendChild(pre);
                                  modalContent.appendChild(footer);
                                  modal.appendChild(modalContent);

                                  document.body.appendChild(modal);
                                  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                                }}
                                aria-label="View YAML"
                                title="View YAML description"
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                                  <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                                </svg>
                              </button>
                              <button
                                className="iconBtn iconBtn-danger"
                                onClick={() => {
                                  const updated = draftRbacEntries.filter((_, i) => i !== idx);
                                  setDraftRbacEntries(updated);
                                }}
                                aria-label="Delete entry"
                                title="Delete RBAC entry"
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    Array.isArray(rbac) && rbac.length > 0 ? (
                      rbac.map((binding, idx) => (
                        <tr key={idx}>
                          <td>{binding.roleRef?.kind || "N/A"}</td>
                          <td>{binding.roleRef?.name || "N/A"}</td>
                          <td>{binding.subject?.kind || "N/A"}</td>
                          <td>{binding.subject?.name || "N/A"}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                className="iconBtn iconBtn-primary"
                                onClick={() => {
                                  const roleYaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ${namespaceName}-binding-${idx}
  namespace: ${namespaceName}
subjects:
- kind: ${binding.subject?.kind || ""}
  name: ${binding.subject?.name || ""}
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ${binding.roleRef?.kind || ""}
  name: ${binding.roleRef?.name || ""}
  apiGroup: rbac.authorization.k8s.io`;
                                  const modal = document.createElement('div');
                                  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                                  const modalContent = document.createElement('div');
                                  modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                                  const header = document.createElement('div');
                                  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                                  header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">RBAC Role Details</h3>';

                                  const closeBtn = document.createElement('button');
                                  closeBtn.innerHTML = '&times;';
                                  closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                                  closeBtn.onclick = () => modal.remove();
                                  header.appendChild(closeBtn);

                                  const pre = document.createElement('pre');
                                  pre.textContent = roleYaml;
                                  pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                                  const footer = document.createElement('div');
                                  footer.style.cssText = 'margin-top: 16px; text-align: right;';

                                  const copyBtn = document.createElement('button');
                                  copyBtn.textContent = 'Copy';
                                  copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                                  copyBtn.onclick = () => {
                                    navigator.clipboard.writeText(roleYaml).then(() => alert('Copied to clipboard!'));
                                  };

                                  const closeBtn2 = document.createElement('button');
                                  closeBtn2.textContent = 'Close';
                                  closeBtn2.style.cssText = 'padding: 8px 16px; background: #0d6efd; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;';
                                  closeBtn2.onclick = () => modal.remove();

                                  footer.appendChild(copyBtn);
                                  footer.appendChild(closeBtn2);

                                  modalContent.appendChild(header);
                                  modalContent.appendChild(pre);
                                  modalContent.appendChild(footer);
                                  modal.appendChild(modalContent);

                                  document.body.appendChild(modal);
                                  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                                }}
                                aria-label="View YAML"
                                title="View YAML description"
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                                  <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                          No RBAC information available
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resources Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
            </svg>
            <h3>Resources</h3>
          </div>
          <div className="dashboardCardBody">
            {editEnabled ? (
              <div>
                {/* ResourceQuota Section */}
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>ResourceQuota</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>CPU:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqCpu} onChange={(e) => setDraftReqCpu(e.target.value)} placeholder="e.g., 100m" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>Memory:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqMemory} onChange={(e) => setDraftReqMemory(e.target.value)} placeholder="e.g., 128Mi" />
                  </div>
                </div>
                {/* LimitRange Section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>LimitRange</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>CPU:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimCpu} onChange={(e) => setDraftLimCpu(e.target.value)} placeholder="e.g., 500m" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>Memory:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimMemory} onChange={(e) => setDraftLimMemory(e.target.value)} placeholder="e.g., 512Mi" />
                  </div>
                </div>
              </div>
            ) : Object.keys(resources).length > 0 ? (
              <div>
                {/* ResourceQuota Section */}
                {resources.requests && (
                  <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>ResourceQuota</h4>
                      <button
                        className="iconBtn iconBtn-primary"
                        onClick={() => {
                          const cpu = resources.requests?.cpu || "0";
                          const memory = resources.requests?.memory || "0";
                          const resourceQuotaYaml = `apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${namespaceName}-quota
  namespace: ${namespaceName}
spec:
  hard:
    requests.cpu: "${cpu}"
    requests.memory: "${memory}"`;
                          const modal = document.createElement('div');
                          modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                          const modalContent = document.createElement('div');
                          modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                          const header = document.createElement('div');
                          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                          header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">ResourceQuota Definition</h3>';

                          const closeBtn = document.createElement('button');
                          closeBtn.innerHTML = '&times;';
                          closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                          closeBtn.onclick = () => modal.remove();
                          header.appendChild(closeBtn);

                          const pre = document.createElement('pre');
                          pre.textContent = resourceQuotaYaml;
                          pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                          const footer = document.createElement('div');
                          footer.style.cssText = 'margin-top: 16px; text-align: right;';

                          const copyBtn = document.createElement('button');
                          copyBtn.textContent = 'Copy';
                          copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                          copyBtn.onclick = () => {
                            navigator.clipboard.writeText(resourceQuotaYaml).then(() => alert('Copied to clipboard!'));
                          };

                          const closeBtn2 = document.createElement('button');
                          closeBtn2.textContent = 'Close';
                          closeBtn2.style.cssText = 'padding: 8px 16px; background: #0d6efd; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;';
                          closeBtn2.onclick = () => modal.remove();

                          footer.appendChild(copyBtn);
                          footer.appendChild(closeBtn2);

                          modalContent.appendChild(header);
                          modalContent.appendChild(pre);
                          modalContent.appendChild(footer);
                          modal.appendChild(modalContent);

                          document.body.appendChild(modal);
                          modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                        }}
                        aria-label="View YAML"
                        title="View ResourceQuota YAML definition"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                          <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                      </button>
                    </div>
                    {Object.entries(resources.requests).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="attributeKey" style={{ minWidth: '80px' }}>{key}:</span>
                        <span className="attributeValue">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* LimitRange Section */}
                {resources.limits && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>LimitRange</h4>
                      <button
                        className="iconBtn iconBtn-primary"
                        onClick={() => {
                          const cpu = resources.limits?.cpu || "0";
                          const memory = resources.limits?.memory || "0";
                          const limitRangeYaml = `apiVersion: v1
kind: LimitRange
metadata:
  name: ${namespaceName}-limitrange
  namespace: ${namespaceName}
spec:
  limits:
  - max:
      cpu: "${cpu}"
      memory: "${memory}"
    type: Container`;
                          const modal = document.createElement('div');
                          modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                          const modalContent = document.createElement('div');
                          modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                          const header = document.createElement('div');
                          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                          header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">LimitRange Definition</h3>';

                          const closeBtn = document.createElement('button');
                          closeBtn.innerHTML = '&times;';
                          closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                          closeBtn.onclick = () => modal.remove();
                          header.appendChild(closeBtn);

                          const pre = document.createElement('pre');
                          pre.textContent = limitRangeYaml;
                          pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                          const footer = document.createElement('div');
                          footer.style.cssText = 'margin-top: 16px; text-align: right;';

                          const copyBtn = document.createElement('button');
                          copyBtn.textContent = 'Copy';
                          copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                          copyBtn.onclick = () => {
                            navigator.clipboard.writeText(limitRangeYaml).then(() => alert('Copied to clipboard!'));
                          };

                          const closeBtn2 = document.createElement('button');
                          closeBtn2.textContent = 'Close';
                          closeBtn2.style.cssText = 'padding: 8px 16px; background: #0d6efd; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;';
                          closeBtn2.onclick = () => modal.remove();

                          footer.appendChild(copyBtn);
                          footer.appendChild(closeBtn2);

                          modalContent.appendChild(header);
                          modalContent.appendChild(pre);
                          modalContent.appendChild(footer);
                          modal.appendChild(modalContent);

                          document.body.appendChild(modal);
                          modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                        }}
                        aria-label="View YAML"
                        title="View LimitRange YAML definition"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                          <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                      </button>
                    </div>
                    {Object.entries(resources.limits).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="attributeKey" style={{ minWidth: '80px' }}>{key}:</span>
                        <span className="attributeValue">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!resources.requests && !resources.limits && (
                  <p className="muted">No resource information available</p>
                )}
              </div>
            ) : (
              <p className="muted">No resource information available</p>
            )}
          </div>
        </div>

        {/* Policy Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
            </svg>
            <h3>Policy</h3>
          </div>
          <div className="dashboardCardBody">
            {Object.keys(policy).length > 0 ? (
              <div className="attributesGrid">
                {Object.entries(policy).map(([key, value]) => (
                  <div key={key} className="attributeItem">
                    <span className="attributeKey">{key}:</span>
                    <span className="attributeValue">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No policy information available</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
