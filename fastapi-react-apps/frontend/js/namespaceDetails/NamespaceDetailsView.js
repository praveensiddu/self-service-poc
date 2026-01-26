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
  const [draftRbacSubjects, setDraftRbacSubjects] = React.useState([]);
  const [draftRbacRoleRefKind, setDraftRbacRoleRefKind] = React.useState("");
  const [draftRbacRoleRefName, setDraftRbacRoleRefName] = React.useState("");

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
    const rbacSubjects = namespace?.rbac?.subjects && Array.isArray(namespace.rbac.subjects) ? namespace.rbac.subjects : [];
    setDraftRbacSubjects(rbacSubjects);
    setDraftRbacRoleRefKind(namespace?.rbac?.roleRef?.kind || "");
    setDraftRbacRoleRefName(namespace?.rbac?.roleRef?.name || "");

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
              {`ENV: ${env || ""} APP: ${appname || ""} namespace: ${namespaceName}`}
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
                    const rbacSubjects = namespace?.rbac?.subjects && Array.isArray(namespace.rbac.subjects) ? namespace.rbac.subjects : [];
                    setDraftRbacSubjects(rbacSubjects);
                    setDraftRbacRoleRefKind(namespace?.rbac?.roleRef?.kind || "");
                    setDraftRbacRoleRefName(namespace?.rbac?.roleRef?.name || "");

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
                        subjects: draftRbacSubjects,
                        roleRef: {
                          kind: (draftRbacRoleRefKind || "").trim(),
                          name: (draftRbacRoleRefName || "").trim(),
                        },
                      },
                    });
                    setEditEnabled(false);
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
                {/* Requests Section */}
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Requests</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>CPU:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqCpu} onChange={(e) => setDraftReqCpu(e.target.value)} placeholder="e.g., 100m" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>Memory:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqMemory} onChange={(e) => setDraftReqMemory(e.target.value)} placeholder="e.g., 128Mi" />
                  </div>
                </div>
                {/* Limits Section */}
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Limits</h4>
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
                {/* Requests Section */}
                {resources.requests && (
                  <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Requests</h4>
                    {Object.entries(resources.requests).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="attributeKey" style={{ minWidth: '80px' }}>{key}:</span>
                        <span className="attributeValue">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Limits Section */}
                {resources.limits && (
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Limits</h4>
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

        {/* RBAC Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
            </svg>
            <h3>RBAC</h3>
          </div>
          <div className="dashboardCardBody">
            {editEnabled ? (
              <div>
                {/* Subjects Section - Edit Mode */}
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Subjects</h4>
                  {draftRbacSubjects.map((subject, idx) => (
                    <div key={idx} style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="attributeKey" style={{ minWidth: '80px' }}>Kind:</span>
                        <select
                          className="filterInput"
                          style={{ flex: 1 }}
                          value={subject.kind || "User"}
                          onChange={(e) => {
                            const updated = [...draftRbacSubjects];
                            updated[idx] = { ...updated[idx], kind: e.target.value };
                            setDraftRbacSubjects(updated);
                          }}
                        >
                          <option value="User">User</option>
                          <option value="Group">Group</option>
                          <option value="ServiceAccount">ServiceAccount</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="attributeKey" style={{ minWidth: '80px' }}>Name:</span>
                        <input
                          className="filterInput"
                          style={{ flex: 1 }}
                          value={subject.name || ""}
                          onChange={(e) => {
                            const updated = [...draftRbacSubjects];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setDraftRbacSubjects(updated);
                          }}
                          placeholder="e.g., user@example.com"
                        />
                      </div>
                      {draftRbacSubjects.length > 1 && (
                        <button
                          className="btn btn-sm"
                          style={{ position: 'absolute', top: '8px', right: '8px', padding: '2px 8px', fontSize: '12px' }}
                          onClick={() => {
                            const updated = draftRbacSubjects.filter((_, i) => i !== idx);
                            setDraftRbacSubjects(updated);
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: '8px' }}
                    onClick={() => {
                      setDraftRbacSubjects([...draftRbacSubjects, { kind: "User", name: "" }]);
                    }}
                  >
                    + Add Subject
                  </button>
                </div>
                {/* RoleRef Section - Edit Mode */}
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Role Reference</h4>
                  <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span className="attributeKey" style={{ minWidth: '80px' }}>Kind:</span>
                      <select
                        className="filterInput"
                        style={{ flex: 1 }}
                        value={draftRbacRoleRefKind || "ClusterRole"}
                        onChange={(e) => setDraftRbacRoleRefKind(e.target.value)}
                      >
                        <option value="ClusterRole">ClusterRole</option>
                        <option value="Role">Role</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="attributeKey" style={{ minWidth: '80px' }}>Name:</span>
                      <input
                        className="filterInput"
                        style={{ flex: 1 }}
                        value={draftRbacRoleRefName}
                        onChange={(e) => setDraftRbacRoleRefName(e.target.value)}
                        placeholder="e.g., cluster-admin, view"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              Object.keys(rbac).length > 0 ? (
                <div>
                  {/* Subjects Section */}
                  {rbac.subjects && Array.isArray(rbac.subjects) && rbac.subjects.length > 0 && (
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Subjects</h4>
                      {rbac.subjects.map((subject, idx) => (
                        <div key={idx} style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                          {Object.entries(subject).map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <span className="attributeKey" style={{ minWidth: '80px' }}>{key}:</span>
                              <span className="attributeValue">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* RoleRef Section */}
                  {rbac.roleRef && typeof rbac.roleRef === 'object' && (
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Role Reference</h4>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        {Object.entries(rbac.roleRef).map(([key, value]) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span className="attributeKey" style={{ minWidth: '80px' }}>{key}:</span>
                            <span className="attributeValue">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Other RBAC fields */}
                  {Object.entries(rbac).filter(([key]) => key !== 'subjects' && key !== 'roleRef').length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e9ecef' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Other</h4>
                      <div className="attributesGrid">
                        {Object.entries(rbac).filter(([key]) => key !== 'subjects' && key !== 'roleRef').map(([key, value]) => (
                          <div key={key} className="attributeItem">
                            <span className="attributeKey">{key}:</span>
                            <span className="attributeValue">{formatValue(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="muted">No RBAC information available</p>
              )
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
