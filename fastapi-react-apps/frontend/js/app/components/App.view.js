function AppView({
  bannerColor,
  bannerTitle,
  currentUser,
  currentUserContext,
  demoMode,
  showChangeLoginUser,
  demoUsers,
  demoUsersLoading,
  demoUsersError,
  onOpenChangeLoginUser,
  onCloseChangeLoginUser,
  onSelectDemoUser,
  envKeys,
  activeEnv,
  loading,
  view,
  error,
  showErrorModal,
  onCloseErrorModal,
  showDeleteWarningModal,
  deleteWarningData,
  onCloseDeleteWarningModal,
  topTab,
  configComplete,
  readonly,
  envConfigured,
  allowAdminPages,
  onTopTabChange,
  accessRequests,
  accessRequestStatusByKey,
  onGrantAccessRequest,
  getAccessRequestKey,
  clustersByEnv,
  onAddCluster,
  onDeleteCluster,
  showCreateCluster,
  onOpenCreateCluster,
  onCloseCreateCluster,
  workspace,
  setWorkspace,
  requestsRepo,
  setRequestsRepo,
  templatesRepo,
  setTemplatesRepo,
  renderedManifestsRepo,
  setRenderedManifestsRepo,
  controlRepo,
  setControlRepo,
  onSaveConfig,
  onUseDefaults,
  enforcementSettings,
  draftEnforcementSettings,
  setDraftEnforcementSettings,
  enforcementSettingsError,
  enforcementSettingsLoading,
  onSaveEnforcementSettings,
  onEnvClick,
  onViewL4Ingress,
  onViewEgressIps,
  onViewNamespaces,
  onBackToApps,
  onBackFromNamespaceDetails,
  appRows,
  clustersByApp,
  apps,
  selectedApps,
  toggleRow,
  onSelectAllFromFiltered,
  deleteApp,
  updateApp,
  openNamespaces,
  onCreateApp,
  showCreateApp,
  onOpenCreateApp,
  onCloseCreateApp,
  detailNamespace,
  detailNamespaceName,
  namespaces,
  selectedNamespaces,
  toggleNamespace,
  onSelectAllNamespaces,
  deleteNamespace,
  onCopyNamespace,
  viewNamespaceDetails,
  onUpdateNamespaceInfo,
  onCreateNamespace,
  showCreateNamespace,
  onOpenCreateNamespace,
  onCloseCreateNamespace,
  detailAppName,
  argocdEnabled,
  requestsChanges,
  l4IngressItems,
  l4IngressAppName,
  egressIpItems,
  egressIpsAppName,
  namespaceDetailsHeaderButtons,
  onSetNamespaceDetailsHeaderButtons,
  l4IngressAddButton,
  onSetL4IngressAddButton,
}) {
  // Validation for config save button
  const canSaveConfig = Boolean(
    (workspace || "").trim() &&
      (requestsRepo || "").trim() &&
      (renderedManifestsRepo || "").trim() &&
      (controlRepo || "").trim(),
  );

  // Check if enforcement settings have unsaved changes
  const hasUnsavedEnforcementSettings = Boolean(
    String(draftEnforcementSettings?.enforce_egress_firewall || "") !==
      String(enforcementSettings?.enforce_egress_firewall || "") ||
      String(draftEnforcementSettings?.enforce_egress_ip || "") !== String(enforcementSettings?.enforce_egress_ip || ""),
  );

  return (
    <div>
      <div className="topbar" style={{ background: bannerColor }}>
        <div>
          <div className="title">{bannerTitle}</div>
        </div>
        <div className="topbarCenter">
          {demoMode ? <div className="demoMode">DEMO MODE</div> : null}
        </div>
        <div className="user">
          {demoMode ? (
            <button className="btn" type="button" onClick={() => onOpenChangeLoginUser && onOpenChangeLoginUser()}>
              Change Login User
            </button>
          ) : null}
          {currentUser ? `Logged in as ${currentUser}` : ""}
        </div>
      </div>

      {demoMode && showChangeLoginUser ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modalCard">
            <div className="modalHeader">
              <div style={{ fontWeight: 700 }}>Change Login User</div>
              <button className="btn" type="button" onClick={() => onCloseChangeLoginUser && onCloseChangeLoginUser()}>
                Close
              </button>
            </div>

            {demoUsersError ? <div className="status">Error: {demoUsersError}</div> : null}
            {demoUsersLoading ? <div className="muted">Loading…</div> : null}

            {!demoUsersLoading ? (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {(demoUsers || []).map((u) => (
                  <button
                    key={u?.user || ""}
                    className="btn"
                    type="button"
                    onClick={() => onSelectDemoUser && onSelectDemoUser(u?.user)}
                    style={{ textAlign: "left" }}
                  >
                    <div style={{ fontWeight: 700 }}>{u?.name || u?.user || ""}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {u?.description || u?.user || ""}
                    </div>
                  </button>
                ))}
                {(demoUsers || []).length === 0 ? <div className="muted">No demo users found.</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="container">
        <div className="tabs">
          <button
            className={topTab === "Home" ? "tab active" : "tab"}
            onClick={() => onTopTabChange("Home")}
            type="button"
          >
            Home
          </button>
          {allowAdminPages ? (
            <button
              className={topTab === "Settings" ? "tab active" : "tab"}
              onClick={() => onTopTabChange("Settings")}
              type="button"
            >
              Settings
            </button>
          ) : null}
          {configComplete ? (
            <>
              <button
                className={topTab === "Request provisioning" ? "tab active" : "tab"}
                onClick={() => onTopTabChange("Request provisioning")}
                type="button"
              >
                Request provisioning
              </button>
              <button
                className={topTab === "PRs and Approval" ? "tab active" : "tab"}
                onClick={() => onTopTabChange("PRs and Approval")}
                type="button"
              >
                PRs and Approval
              </button>
              <button
                className={topTab === "Clusters" ? "tab active" : "tab"}
                onClick={() => onTopTabChange("Clusters")}
                type="button"
              >
                Clusters
              </button>
              {allowAdminPages ? (
                <button
                  className={topTab === "Access Requests" ? "tab active" : "tab"}
                  onClick={() => onTopTabChange("Access Requests")}
                  type="button"
                >
                  Access Requests
                </button>
              ) : null}
            </>
          ) : null}
        </div>


        {topTab === "Home" ? (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>
              This Kubernetes provisioning tool enables application teams to request resources on demand, while enforcing platform and security standards through GitOps-based automation. The result is faster delivery, reduced manual effort, and consistent governance across all Kubernetes clusters.
            </div>

            <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
                  <div className="muted" style={{ fontWeight: 700 }}>WORKSPACE</div>
                  <div className="muted">Local folder used by the tool to clone repos and process requests.</div>
                </div>
                <input className="filterInput" placeholder="~/workspace" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
              </div>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
                  <div className="muted" style={{ fontWeight: 700 }}>RequestsRepo</div>
                  <div className="muted">
                    Git repo where incoming provisioning requests are stored (for example:{" "}
                    <a href="https://github.com/praveensiddu/kselfservice-requests" target="_blank" rel="noreferrer">
                      https://github.com/praveensiddu/kselfservice-requests
                    </a>
                    ).
                  </div>
                </div>
                <input className="filterInput" value={requestsRepo} onChange={(e) => setRequestsRepo(e.target.value)} />
              </div>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
                  <div className="muted" style={{ fontWeight: 700 }}>TemplatesRepo</div>
                  <div className="muted">
                    Git repo which contains templates used for provisioning.
                    (for example:{" "}
                    <a href="https://github.com/praveensiddu/kselfservice-templates" target="_blank" rel="noreferrer">
                      https://github.com/praveensiddu/kselfservice-templates
                    </a>
                    ).
                    </div>
                </div>
                <input className="filterInput" value={templatesRepo} onChange={(e) => setTemplatesRepo(e.target.value)} />
              </div>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
                  <div className="muted" style={{ fontWeight: 700 }}>RenderedManifestsRepo</div>
                  <div className="muted">
                    Git repo which contains the kubernetes rendered manifests ready for ArgoCD to apply to the clusters(for example:{" "}
                    <a href="https://github.com/praveensiddu/kselfservice-rendered" target="_blank" rel="noreferrer">
                      https://github.com/praveensiddu/kselfservice-rendered
                    </a>
                    ).
                  </div>
                </div>
                <input className="filterInput" value={renderedManifestsRepo} onChange={(e) => setRenderedManifestsRepo(e.target.value)} />
              </div>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
                  <div className="muted" style={{ fontWeight: 700 }}>ControlRepo</div>
                  <div className="muted">
                    Git repo used for control-plane automation (for example:{" "}
                    <a href="https://github.com/praveensiddu/kselfservice-control" target="_blank" rel="noreferrer">
                      https://github.com/praveensiddu/kselfservice-control
                    </a>
                    ).
                  </div>
                </div>
                <input className="filterInput" value={controlRepo} onChange={(e) => setControlRepo(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn" type="button" onClick={onUseDefaults} disabled={loading || envConfigured}>
                  Use Pre-prepared Samples
                </button>
                <button className="btn btn-primary" type="button" onClick={onSaveConfig} disabled={!canSaveConfig || loading}>
                  Save
                </button>
                {!configComplete ? (
                  <span className="muted">Set all fields to enable provisioning tabs.</span>
                ) : null}
              </div>
            </div>
          </div>
        ) : topTab === "Settings" ? (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
              {enforcementSettingsError ? (
                <div className="status">Error: {enforcementSettingsError}</div>
              ) : null}

              <div>
                <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                  ENFORCEMENT SETTINGS
                </div>
                <div className="muted" style={{ marginBottom: 12 }}>
                  These values are read from and written to <code>control/settings/settings.yaml</code>.
                </div>
              </div>

              <div>
                <div className="muted" style={{ fontWeight: 700, marginBottom: 4 }}>
                  enforce_egress_firewall
                </div>
                <select
                  className="filterInput"
                  value={String(draftEnforcementSettings?.enforce_egress_firewall || "yes")}
                  disabled={readonly || enforcementSettingsLoading}
                  onChange={(e) =>
                    setDraftEnforcementSettings({
                      ...(draftEnforcementSettings || {}),
                      enforce_egress_firewall: e.target.value,
                    })
                  }
                >
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
              </div>

              <div>
                <div className="muted" style={{ fontWeight: 700, marginBottom: 4 }}>
                  enforce_egress_ip
                </div>
                <select
                  className="filterInput"
                  value={String(draftEnforcementSettings?.enforce_egress_ip || "yes")}
                  disabled={readonly || enforcementSettingsLoading}
                  onChange={(e) =>
                    setDraftEnforcementSettings({
                      ...(draftEnforcementSettings || {}),
                      enforce_egress_ip: e.target.value,
                    })
                  }
                >
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={readonly || enforcementSettingsLoading || !hasUnsavedEnforcementSettings}
                  onClick={() => onSaveEnforcementSettings()}
                >
                  Save
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={enforcementSettingsLoading || !hasUnsavedEnforcementSettings}
                  onClick={() => setDraftEnforcementSettings(enforcementSettings)}
                >
                  Cancel
                </button>
                {readonly ? <span className="muted">Read-only mode enabled.</span> : null}
                {enforcementSettingsLoading ? <span className="muted">Loading…</span> : null}
              </div>
            </div>
          </div>
        ) : topTab === "PRs and Approval" ? (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted">Coming soon.</div>
          </div>
        ) : topTab === "Clusters" ? (
          <>
            <div className="row">
              <div className="muted">{loading ? "Loading…" : ""}</div>
            </div>

            <ClustersTable
              envKeys={envKeys}
              activeEnv={activeEnv}
              clustersByEnv={clustersByEnv}
              onEnvClick={onEnvClick}
              onAddCluster={onAddCluster}
              onDeleteCluster={onDeleteCluster}
              loading={loading}
              showCreate={showCreateCluster}
              onOpenCreate={onOpenCreateCluster}
              onCloseCreate={onCloseCreateCluster}
              readonly={readonly}
              apps={apps}
            />
          </>
        ) : topTab === "Access Requests" ? (
          <AccessRequestsTable
            accessRequests={accessRequests}
            accessRequestStatusByKey={accessRequestStatusByKey}
            onGrantAccessRequest={onGrantAccessRequest}
            getAccessRequestKey={getAccessRequestKey}
          />
        ) : (
          <>
            <div className="row">
              <div className="muted">{loading ? "Loading…" : ""}</div>
            </div>

            <div className="tabs">
              {envKeys.map((env) => (
                <button
                  key={env}
                  className={env === activeEnv ? "tab active" : "tab"}
                  onClick={() => onEnvClick(env)}
                  type="button"
                >
                  {env}
                </button>
              ))}
            </div>

            <div className="actions" style={view === "apps" ? { display: "flex", justifyContent: "space-between", alignItems: "center" } : {}}>
              {view === "apps" ? (
                <>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn" type="button" onClick={onViewL4Ingress}>
                      View L4 ingress IPs
                    </button>
                    <button className="btn" type="button" onClick={onViewEgressIps}>
                      View Egress IPs
                    </button>
                  </div>
                  {!readonly && (
                    <button className="btn btn-primary" type="button" onClick={onOpenCreateApp} data-testid="add-app-btn">
                      Add App
                    </button>
                  )}
                </>
              ) : view === "namespaceDetails" ? (
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", gap: "8px", zIndex: 1 }}>
                    <button className="btn" type="button" onClick={onBackFromNamespaceDetails}>
                      ← Back to Namespaces
                    </button>
                  </div>
                  <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
                    <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#0d6efd", whiteSpace: "nowrap" }}>
                      {`${detailAppName || ""} / ${detailNamespaceName}`}
                    </h2>
                  </div>
                  <div style={{ display: "flex", gap: "8px", zIndex: 1 }}>
                    {namespaceDetailsHeaderButtons}
                  </div>
                </div>
              ) : view === "namespaces" ? (
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", gap: "8px", zIndex: 1 }}>
                    <button className="btn" type="button" onClick={onBackToApps}>
                      ← Back to App
                    </button>
                    <button className="btn" type="button" onClick={onViewL4Ingress}>
                      View L4 ingress IPs
                    </button>
                    <button className="btn" type="button" onClick={onViewEgressIps}>
                      View Egress IPs
                    </button>
                  </div>
                  <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
                    <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#0d6efd", whiteSpace: "nowrap" }}>
                      {detailAppName}
                    </h2>
                  </div>
                  <div style={{ zIndex: 1 }}>
                    {!readonly && (
                      <button className="btn btn-primary" type="button" onClick={onOpenCreateNamespace} data-testid="add-namespace-btn">
                        Add Namespace
                      </button>
                    )}
                  </div>
                </div>
              ) : view === "l4ingress" ? (
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", gap: "8px", zIndex: 1 }}>
                    <button className="btn" type="button" onClick={onBackToApps}>
                      ← Back to App
                    </button>
                    <button className="btn" type="button" onClick={onViewNamespaces}>
                      View Namespaces
                    </button>
                    <button className="btn" type="button" onClick={onViewEgressIps}>
                      View Egress IPs
                    </button>
                  </div>
                  <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
                    <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#0d6efd", whiteSpace: "nowrap" }}>
                      {`${l4IngressAppName} - L4 Ingress IPs`}
                    </h2>
                  </div>
                  <div style={{ zIndex: 1 }}>
                    {!readonly && l4IngressAddButton}
                  </div>
                </div>
              ) : view === "egressips" ? (
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", gap: "8px", zIndex: 1 }}>
                    <button className="btn" type="button" onClick={onBackToApps}>
                      ← Back to App
                    </button>
                    <button className="btn" type="button" onClick={onViewNamespaces}>
                      View Namespaces
                    </button>
                    <button className="btn" type="button" onClick={onViewL4Ingress}>
                      View L4 Ingress IPs
                    </button>
                  </div>
                  <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
                    <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#0d6efd", whiteSpace: "nowrap" }}>
                      {`${egressIpsAppName} - Egress IPs`}
                    </h2>
                  </div>
                  <div style={{ zIndex: 1 }}>
                  </div>
                </div>
              ) : null}
            </div>

            {view === "apps" ? (
              <AppsTable
                rows={appRows}
                env={activeEnv}
                clustersByApp={clustersByApp}
                selectedApps={selectedApps}
                currentUserContext={currentUserContext}
                onToggleRow={toggleRow}
                onSelectAll={onSelectAllFromFiltered}
                onDeleteApp={deleteApp}
                onUpdateApp={updateApp}
                onViewDetails={(appname) => openNamespaces(appname, true)}
                onCreateApp={onCreateApp}
                showCreate={showCreateApp}
                onCloseCreate={onCloseCreateApp}
                requestsChanges={requestsChanges}
                readonly={readonly}
              />
            ) : view === "namespaceDetails" ? (
              <NamespaceDetails
                namespace={detailNamespace}
                namespaceName={detailNamespaceName}
                appname={detailAppName}
                env={activeEnv}
                currentUserContext={currentUserContext}
                onUpdateNamespaceInfo={onUpdateNamespaceInfo}
                readonly={readonly}
                renderHeaderButtons={onSetNamespaceDetailsHeaderButtons}
              />
            ) : view === "namespaces" ? (
              <NamespacesTable
                namespaces={namespaces}
                selectedNamespaces={selectedNamespaces}
                onToggleNamespace={toggleNamespace}
                onSelectAll={onSelectAllNamespaces}
                onDeleteNamespace={deleteNamespace}
                onCopyNamespace={onCopyNamespace}
                onViewDetails={viewNamespaceDetails}
                onCreateNamespace={onCreateNamespace}
                env={activeEnv}
                envKeys={envKeys}
                appname={detailAppName}
                showCreate={showCreateNamespace}
                onOpenCreate={onOpenCreateNamespace}
                onCloseCreate={onCloseCreateNamespace}
                argocdEnabled={argocdEnabled}
                requestsChanges={requestsChanges}
                readonly={readonly}
              />
            ) : view === "l4ingress" ? (
              <L4IngressTable items={l4IngressItems} appname={detailAppName} env={activeEnv} renderAddButton={onSetL4IngressAddButton} readonly={readonly} />
            ) : (
              <EgressIpTable
                items={egressIpItems}
              />
            )}
          </>
        )}
      </div>

      {showErrorModal && error ? (
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
            if (e.target === e.currentTarget) onCloseErrorModal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCloseErrorModal();
          }}
          data-testid="error-modal"
        >
          <div
            className="card"
            style={{
              width: 480,
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
                background: "rgba(220, 53, 69, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="#dc3545">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "#212529" }}>
                  Error
                </h3>
                <p style={{ margin: 0, color: "rgba(0,0,0,0.7)", lineHeight: "1.5" }}>
                  {error}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onCloseErrorModal}
                data-testid="close-error-modal-btn"
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteWarningModal && deleteWarningData ? (
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
            if (e.target === e.currentTarget) onCloseDeleteWarningModal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCloseDeleteWarningModal();
          }}
          data-testid="delete-warning-modal"
        >
          <div
            className="card"
            style={{
              width: 600,
              maxWidth: "92vw",
              maxHeight: "90vh",
              overflow: "auto",
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
                  Cannot Delete Cluster
                </h3>
                <p style={{ margin: "0 0 16px 0", color: "rgba(0,0,0,0.7)", lineHeight: "1.5" }}>
                  The cluster <strong>{deleteWarningData.clustername}</strong> in environment <strong>{deleteWarningData.env}</strong> cannot be deleted because it is currently in use.
                </p>

                {deleteWarningData.namespaces && deleteWarningData.namespaces.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: "#212529" }}>
                      Used by Namespaces ({deleteWarningData.namespaces.length}):
                    </div>
                    <div style={{
                      maxHeight: "150px",
                      overflow: "auto",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      background: "#f8f9fa"
                    }}>
                      <table style={{ width: "100%", fontSize: "14px" }}>
                        <thead style={{ background: "#e9ecef", position: "sticky", top: 0 }}>
                          <tr>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Application</th>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Namespace</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deleteWarningData.namespaces.map((ns, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < deleteWarningData.namespaces.length - 1 ? "1px solid #dee2e6" : "none" }}>
                              <td style={{ padding: "8px" }}>{ns.app}</td>
                              <td style={{ padding: "8px" }}>{ns.namespace}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {deleteWarningData.l4_ingress_allocations && deleteWarningData.l4_ingress_allocations.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: "#212529" }}>
                      Has L4 Ingress IP Allocations ({deleteWarningData.l4_ingress_allocations.length}):
                    </div>
                    <div style={{
                      maxHeight: "150px",
                      overflow: "auto",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      background: "#f8f9fa"
                    }}>
                      <table style={{ width: "100%", fontSize: "14px" }}>
                        <thead style={{ background: "#e9ecef", position: "sticky", top: 0 }}>
                          <tr>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Application</th>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Cluster</th>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deleteWarningData.l4_ingress_allocations.map((alloc, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < deleteWarningData.l4_ingress_allocations.length - 1 ? "1px solid #dee2e6" : "none" }}>
                              <td style={{ padding: "8px" }}>{alloc.app}</td>
                              <td style={{ padding: "8px" }}>{alloc.cluster}</td>
                              <td style={{ padding: "8px" }}>{alloc.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {deleteWarningData.egress_allocations && deleteWarningData.egress_allocations.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: "#212529" }}>
                      Has Egress IP Allocations ({deleteWarningData.egress_allocations.length}):
                    </div>
                    <div style={{
                      maxHeight: "150px",
                      overflow: "auto",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      background: "#f8f9fa"
                    }}>
                      <table style={{ width: "100%", fontSize: "14px" }}>
                        <thead style={{ background: "#e9ecef", position: "sticky", top: 0 }}>
                          <tr>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Application</th>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Cluster</th>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deleteWarningData.egress_allocations.map((alloc, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < deleteWarningData.egress_allocations.length - 1 ? "1px solid #dee2e6" : "none" }}>
                              <td style={{ padding: "8px" }}>{alloc.app}</td>
                              <td style={{ padding: "8px" }}>{alloc.cluster}</td>
                              <td style={{ padding: "8px" }}>{alloc.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <div style={{ padding: "12px", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "4px", fontSize: "14px" }}>
                  <strong>Action Required:</strong> Please remove this cluster from all namespaces and deallocate all IP addresses before attempting to delete it.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onCloseDeleteWarningModal}
                data-testid="close-delete-warning-modal-btn"
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
