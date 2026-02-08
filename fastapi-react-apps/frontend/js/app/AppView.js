function AppView({
  bannerColor,
  bannerTitle,
  deploymentEnv,
  currentUser,
  envKeys,
  activeEnv,
  loading,
  view,
  error,
  topTab,
  configComplete,
  readonly,
  onTopTabChange,
  clustersByEnv,
  availableClusters,
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
  onEnvClick,
  onViewL4Ingress,
  onViewEgressIps,
  onBackToApps,
  onBackFromNamespaceDetails,
  appRows,
  clustersByApp,
  l4IpsByApp,
  egressIpsByApp,
  selectedApps,
  toggleRow,
  onSelectAllFromFiltered,
  deleteApp,
  openNamespaces,
  onCreateApp,
  onUpdateApp,
  onRefreshApps,
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
  egressIpItems,
  selectedEgressIps,
  toggleEgressIp,
  onSelectAllEgressIps,
  namespaceDetailsHeaderButtons,
  onSetNamespaceDetailsHeaderButtons,
}) {
  const showProvisioningTabs = Boolean(configComplete);
  const canSaveConfig = Boolean(
    (workspace || "").trim() &&
      (requestsRepo || "").trim() &&
      (renderedManifestsRepo || "").trim() &&
      (controlRepo || "").trim(),
  );

  return (
    <div>
      <div className="topbar" style={{ background: bannerColor }}>
        <div>
          <div className="title">{bannerTitle}</div>
        </div>
        <div className="user">{currentUser ? `Logged in as ${currentUser}` : ""}</div>
      </div>

      <div className="container">
        <div className="tabs">
          <button
            className={topTab === "Home" ? "tab active" : "tab"}
            onClick={() => onTopTabChange("Home")}
            type="button"
          >
            Home
          </button>
          <button
            className={topTab === "Settings" ? "tab active" : "tab"}
            onClick={() => onTopTabChange("Settings")}
            type="button"
          >
            Settings
          </button>
          {showProvisioningTabs ? (
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
            </>
          ) : null}
        </div>

        {error ? <div className="status">Error: {error}</div> : null}

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
                <button className="btn" type="button" onClick={onUseDefaults} disabled={loading}>
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
            <div className="muted">Coming soon.</div>
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
            />
          </>
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
                <>
                  <button className="btn" type="button" onClick={onBackToApps}>
                    ← Back to App
                  </button>
                  <button className="btn" type="button" onClick={onViewEgressIps}>
                    View Egress IPs
                  </button>
                </>
              ) : view === "egressips" ? (
                <>
                  <button className="btn" type="button" onClick={onBackToApps}>
                    ← Back to App
                  </button>
                  <button className="btn" type="button" onClick={onViewL4Ingress}>
                    View L4 ingress IPs
                  </button>
                </>
              ) : (
                <button className="btn" type="button" onClick={onBackToApps}>
                  ← Back to App
                </button>
              )}
            </div>

            {view === "apps" ? (
              <AppsTable
                rows={appRows}
                env={activeEnv}
                onRefreshApps={onRefreshApps}
                clustersByApp={clustersByApp}
                l4IpsByApp={l4IpsByApp}
                egressIpsByApp={egressIpsByApp}
                availableClusters={availableClusters}
                selectedApps={selectedApps}
                onToggleRow={toggleRow}
                onSelectAll={onSelectAllFromFiltered}
                onDeleteApp={deleteApp}
                onViewDetails={(appname) => openNamespaces(appname, true)}
                onCreateApp={onCreateApp}
                onUpdateApp={onUpdateApp}
                showCreate={showCreateApp}
                onOpenCreate={onOpenCreateApp}
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
              <div>
                <div style={{ marginTop: 8, marginBottom: 10, fontWeight: 600 }}>
                  {`L4 ingress IPs allocated in different cluster for ${detailAppName || ""}`}
                </div>
                <L4IngressTable items={l4IngressItems} />
              </div>
            ) : (
              <div>
                <div style={{ marginTop: 8, marginBottom: 10, fontWeight: 600 }}>
                  {`Egress IPs allocated in different cluster for ${detailAppName || ""}`}
                </div>
                <EgressIpTable
                  items={egressIpItems}
                  selectedItems={selectedEgressIps}
                  onToggleRow={toggleEgressIp}
                  onSelectAll={onSelectAllEgressIps}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
