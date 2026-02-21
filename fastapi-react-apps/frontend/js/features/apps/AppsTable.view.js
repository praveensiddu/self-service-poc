function AppsTableView({
  filteredRows,
  allSelected,
  filters,
  setFilters,
  env,
  clustersByApp,
  selectedApps,
  onToggleRow,
  onSelectAll,
  onDeleteApp,
  onViewDetails,
  onCreateApp,
  showCreate,
  onCloseCreate,
  requestsChanges,
  readonly,
  onCommitPush,
  showRequestAccess,
  requestAccessAppName,
  requestAccessRole,
  setRequestAccessRole,
  requestAccessUserid,
  setRequestAccessUserid,
  requestAccessGroup,
  setRequestAccessGroup,
  canSubmitRequestAccess,
  openRequestAccess,
  closeRequestAccess,
  onSubmitRequestAccess,
  requestAccessSuccessMessage,
  requestAccessErrorMessage,
  isPlatformAdmin,
  newAppName,
  setNewAppName,
  newDescription,
  setNewDescription,
  canSubmitCreate,
  showEdit,
  setShowEdit,
  editAppName,
  editDescription,
  setEditDescription,
  canSubmitEdit,
  openEditApp,
  onSubmitEdit,
  showArgoCd,
  argoCdAppName,
  argoCdExists,
  argoCdAdminGroups,
  setArgoCdAdminGroups,
  argoCdOperatorGroups,
  setArgoCdOperatorGroups,
  argoCdReadonlyGroups,
  setArgoCdReadonlyGroups,
  argoCdSyncStrategy,
  setArgoCdSyncStrategy,
  argoCdGitUrl,
  setArgoCdGitUrl,
  canSubmitArgoCd,
  openArgoCd,
  closeArgoCd,
  onSubmitArgoCd,
  onDeleteArgoCd,
}) {

  return (
    <div className="card">

      {showRequestAccess ? (
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
            if (e.target === e.currentTarget) closeRequestAccess();
          }}
          data-testid="request-access-overlay"
        >
          <div
            className="card"
            style={{
              maxWidth: "92vw",
              width: 520,
              padding: 16,
              overflow: "visible",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="request-access-panel"
          >
            {requestAccessSuccessMessage ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, marginTop: 8 }}>
                  <svg width="48" height="48" viewBox="0 0 16 16" fill="#28a745">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                </div>
                <div style={{ textAlign: "center", marginBottom: 16, fontSize: 15 }}>
                  {requestAccessSuccessMessage}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button className="btn btn-primary" type="button" onClick={closeRequestAccess} data-testid="close-request-access-success-btn">
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>{`Request access for ${requestAccessAppName || ""}`}</div>
                  <button className="btn" type="button" onClick={closeRequestAccess} data-testid="close-request-access-btn">
                    Close
                  </button>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="muted" style={{ marginBottom: 4 }}>AccessType</div>
                    <select
                      className="filterInput"
                      value={requestAccessRole}
                      onChange={(e) => setRequestAccessRole(e.target.value)}
                      data-testid="request-access-role"
                    >
                      <option value="viewer">viewer</option>
                      <option value="manager">manager</option>
                    </select>
                  </div>

                  <div className="muted" style={{ fontSize: 12, fontStyle: "italic", marginTop: 4 }}>
                    Fill either Userid or Group, but not both.
                  </div>

                  <div>
                    <div className="muted" style={{ marginBottom: 4 }}>Userid</div>
                    <input
                      className="filterInput"
                      value={requestAccessUserid}
                      onChange={(e) => setRequestAccessUserid(e.target.value)}
                      disabled={requestAccessGroup.length > 0}
                      style={{ opacity: requestAccessGroup.length > 0 ? 0.5 : 1 }}
                      placeholder={requestAccessGroup.length > 0 ? "Disabled - Group is filled" : "Enter userid"}
                      data-testid="request-access-userid"
                    />
                  </div>

                  <div>
                    <div className="muted" style={{ marginBottom: 4 }}>Group</div>
                    <input
                      className="filterInput"
                      value={requestAccessGroup}
                      onChange={(e) => setRequestAccessGroup(e.target.value)}
                      disabled={requestAccessUserid.length > 0}
                      style={{ opacity: requestAccessUserid.length > 0 ? 0.5 : 1 }}
                      placeholder={requestAccessUserid.length > 0 ? "Disabled - Userid is filled" : "Enter group"}
                      data-testid="request-access-group"
                    />
                  </div>

                  {requestAccessErrorMessage && (
                    <div style={{ color: "#dc3545", fontSize: 14, padding: "8px 12px", background: "#f8d7da", borderRadius: 4 }} data-testid="request-access-error">
                      {requestAccessErrorMessage}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={onSubmitRequestAccess}
                    disabled={!canSubmitRequestAccess}
                    data-testid="submit-request-access-btn"
                  >
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

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
          data-testid="create-app-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Create App</div>
              <button className="btn" type="button" onClick={onCloseCreate} data-testid="close-app-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">App Name</div>
                  <div className="muted" style={{ fontSize: 12 }}>Alphanumeric, lowercase, no special characters, max 22 characters</div>
                </div>
                <input
                  className="filterInput"
                  value={newAppName}
                  onChange={(e) => {
                    const v = String(e.target.value || "")
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "")
                      .slice(0, 22);
                    setNewAppName(v);
                  }}
                  data-testid="input-appname"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Description</div>
                  <div className="muted" style={{ fontSize: 12 }}>Short summary</div>
                </div>
                <input className="filterInput" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} data-testid="input-description" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onCreateApp}
                disabled={!canSubmitCreate}
                data-testid="submit-app-btn"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showArgoCd ? (
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
            if (e.target === e.currentTarget) closeArgoCd();
          }}
          data-testid="argocd-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""} App: {argoCdAppName || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>ArgoCD Details</div>
              <button className="btn" type="button" onClick={closeArgoCd} data-testid="close-argocd-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_admin_groups</div>
                  <div className="muted" style={{ fontSize: 12 }}>Groups which can perform admin actions on ArgoCD</div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdAdminGroups}
                  onChange={(e) => setArgoCdAdminGroups(e.target.value)}
                  placeholder="grp1"
                  data-testid="argocd-input-admin-groups"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_operator_groups</div>
                  <div className="muted" style={{ fontSize: 12 }}>Groups which can perform operator actions on ArgoCD</div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdOperatorGroups}
                  onChange={(e) => setArgoCdOperatorGroups(e.target.value)}
                  placeholder="grp1"
                  data-testid="argocd-input-operator-groups"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_readonly_groups</div>
                  <div className="muted" style={{ fontSize: 12 }}>Groups with readonly access to ArgoCD</div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdReadonlyGroups}
                  onChange={(e) => setArgoCdReadonlyGroups(e.target.value)}
                  placeholder="grp1"
                  data-testid="argocd-input-readonly-groups"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_sync_strategy</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    <a
                      href="https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
                    </a>
                  </div>
                </div>
                <select
                  className="filterInput"
                  value={argoCdSyncStrategy}
                  onChange={(e) => setArgoCdSyncStrategy(e.target.value)}
                  data-testid="argocd-input-sync-strategy"
                >
                  <option value="auto">auto</option>
                  <option value="manual">manual</option>
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">gitrepourl</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Git repository which contains application k8s manifests for each cluster and namespace. Example:{" "}
                    <a
                      href="https://github.com/praveensiddu/kselfservice-app1-argocd"
                      target="_blank"
                      rel="noreferrer"
                    >
                      https://github.com/praveensiddu/kselfservice-app1-argocd
                    </a>
                  </div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdGitUrl}
                  onChange={(e) => setArgoCdGitUrl(e.target.value)}
                  placeholder="https://github.com/praveensiddu/kselfservice-app1-argocd"
                  data-testid="argocd-input-gitrepourl"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              {argoCdExists ? (
                <button
                  className="btn"
                  type="button"
                  onClick={onDeleteArgoCd}
                  data-testid="delete-argocd-btn"
                >
                  Delete
                </button>
              ) : null}
              <button
                className="btn btn-primary"
                type="button"
                onClick={onSubmitArgoCd}
                disabled={!canSubmitArgoCd}
                data-testid="submit-argocd-btn"
              >
                Save
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
          data-testid="edit-app-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>{`Edit App: ${editAppName || ""}`}</div>
              <button className="btn" type="button" onClick={() => setShowEdit(false)} data-testid="close-edit-app-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Description</div>
                  <div className="muted" style={{ fontSize: 12 }}>Short summary</div>
                </div>
                <input className="filterInput" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} data-testid="edit-input-description" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onSubmitEdit}
                disabled={!canSubmitEdit}
                data-testid="submit-edit-app-btn"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <table data-testid="apps-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked, filteredRows.map((a) => a.appname))}
                aria-label="Select all rows"
                data-testid="select-all-apps-checkbox"
              />
            </th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>App Name</span>
                <HelpIconButton docPath="/static/help/appsTable/appName.html" title="App Name" />
              </span>
            </th>
            <th>Description</th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>Managed By</span>
                <HelpIconButton docPath="/static/help/appsTable/managedBy.html" title="Managed By" />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>Clusters</span>
                <HelpIconButton docPath="/static/help/appsTable/clusters.html" title="Clusters" />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>Namespaces</span>
                <HelpIconButton docPath="/static/help/appsTable/namespaces.html" title="Namespaces" />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>ArgoCD</span>
                <HelpIconButton docPath="/static/help/appsTable/argocd.html" title="ArgoCD" />
              </span>
            </th>
            {!readonly && (
              <th>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <span>Actions</span>
                  <HelpIconButton docPath="/static/help/appsTable/app_actions.html" title="Actions" />
                </span>
              </th>
            )}
          </tr>
          <tr>
            <th></th>
            <th>
              <input
                className="filterInput"
                value={filters.appname}
                onChange={(e) => setFilters((p) => ({ ...p, appname: e.target.value }))}
                data-testid="filter-appname"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.description}
                onChange={(e) => setFilters((p) => ({ ...p, description: e.target.value }))}
                data-testid="filter-description"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.managedby}
                onChange={(e) => setFilters((p) => ({ ...p, managedby: e.target.value }))}
                data-testid="filter-managedby"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.clusters}
                onChange={(e) => setFilters((p) => ({ ...p, clusters: e.target.value }))}
                data-testid="filter-clusters"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.namespaces}
                onChange={(e) => setFilters((p) => ({ ...p, namespaces: e.target.value }))}
                data-testid="filter-namespaces"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.argocd}
                onChange={(e) => setFilters((p) => ({ ...p, argocd: e.target.value }))}
                data-testid="filter-argocd"
              />
            </th>
            {!readonly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="muted" data-testid="no-apps-message">No apps found.</td>
            </tr>
          ) : (
            filteredRows.map((a) => {
              const hasViewPermission = a.permissions?.canView ?? true;
              const hasManagePermission = a.permissions?.canManage ?? true;
              const cellOpacity = hasViewPermission ? 1 : 0.4;
              const isDisabled = !hasViewPermission;

              return (
                <tr
                  key={a.appname}
                  data-testid={`app-row-${a.appname}`}
                  className={hasViewPermission ? "clickable-row" : ""}
                  onClick={(e) => {
                    // Don't trigger row click if clicking on checkbox or action buttons
                    if (e.target.closest('input[type="checkbox"]') || e.target.closest('button')) {
                      return;
                    }
                    // Only allow navigation if user has view permission
                    if (hasViewPermission) {
                      onViewDetails(a.appname);
                    }
                  }}
                  style={{
                    cursor: hasViewPermission ? 'pointer' : 'default',
                  }}
                >
                  <td onClick={(e) => e.stopPropagation()} style={{ opacity: cellOpacity }}>
                    <input
                      type="checkbox"
                      checked={selectedApps.has(a.appname)}
                      onChange={(e) => onToggleRow(a.appname, e.target.checked)}
                      aria-label={`Select ${a.appname}`}
                      data-testid={`app-checkbox-${a.appname}`}
                      disabled={isDisabled}
                    />
                  </td>
                  <td
                    style={{
                      opacity: cellOpacity,
                      ...(requestsChanges?.apps?.has
                        ? (requestsChanges.apps.has(`${String(env || "").toLowerCase()}/${String(a.appname || "")}`)
                          ? { background: "#fff3cd" }
                          : undefined)
                        : undefined)
                    }}
                  >
                    {a.appname}
                  </td>
                  <td className="muted" style={{ opacity: cellOpacity }}>{a.description || ""}</td>
                  <td style={{ opacity: cellOpacity }}>
                    {Array.isArray(a.managedby)
                      ? a.managedby.map((v) => safeTrim(v)).filter(Boolean).join(", ")
                      : (a.managedby || "")}
                  </td>
                  <td style={{ opacity: cellOpacity }}>{(clustersByApp?.[a.appname] || []).join(", ")}</td>
                  <td style={{ opacity: cellOpacity }}>{a.totalns ?? ""}</td>
                  <td style={{ opacity: cellOpacity }}>{String(Boolean(a?.argocd))}</td>
                  {!readonly && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <>
                          <button
                            className="iconBtn iconBtn-primary"
                            type="button"
                            onClick={() => onCommitPush(a)}
                            aria-label={`Commit/push request state for ${a.appname}`}
                            title={hasManagePermission ? "Commit/push and open PR" : "You don't have permission to commit/push for this application"}
                            data-testid={`commit-push-${a.appname}`}
                            disabled={!hasManagePermission}
                            style={{ opacity: hasManagePermission ? 1 : 0.5, cursor: hasManagePermission ? 'pointer' : 'not-allowed' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 1a.75.75 0 0 1 .75.75V7h5.25a.75.75 0 0 1 .53 1.28l-6 6a.75.75 0 0 1-1.06 0l-6-6A.75.75 0 0 1 2 7h5.25V1.75A.75.75 0 0 1 8 1z"/>
                            </svg>
                          </button>
                          {/* Request Access button is hidden for platform_admin since they already have full access */}
                          {!isPlatformAdmin && (
                            <button
                              className="iconBtn iconBtn-primary"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRequestAccess(a);
                              }}
                              aria-label={`Request access for ${a.appname}`}
                              title="Request access"
                              data-testid={`request-access-${a.appname}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                              </svg>
                            </button>
                          )}
                          <button
                            className="iconBtn iconBtn-primary"
                            type="button"
                            onClick={() => openEditApp(a)}
                            aria-label={`Edit ${a.appname}`}
                            title={hasManagePermission ? "Edit application" : "You don't have permission to edit this application"}
                            data-testid={`edit-app-${a.appname}`}
                            disabled={!hasManagePermission}
                            style={{ opacity: hasManagePermission ? 1 : 0.5, cursor: hasManagePermission ? 'pointer' : 'not-allowed' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z"/>
                              <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z"/>
                            </svg>
                          </button>
                          <button
                            className="iconBtn iconBtn-primary"
                            type="button"
                            onClick={() => openArgoCd(a)}
                            aria-label={`ArgoCD details for ${a.appname}`}
                            title={hasManagePermission ? "Add ArgoCD details" : "You don't have permission to manage ArgoCD for this application"}
                            data-testid={`argocd-app-${a.appname}`}
                            disabled={!hasManagePermission}
                            style={{ opacity: hasManagePermission ? 1 : 0.5, cursor: hasManagePermission ? 'pointer' : 'not-allowed' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 64 64" aria-hidden="true">
                              <circle cx="32" cy="32" r="29" fill="#e8f6ff" stroke="#7cc7ff" strokeWidth="3" />
                              <circle cx="23" cy="20" r="4" fill="#ffffff" opacity="0.8" />
                              <g>
                                <path
                                  d="M32 18c-9 0-16 6.3-16 14.1 0 5.4 3.2 9.1 7.2 11.4 2.8 1.6 6.3 2.5 8.8 2.5s6-.9 8.8-2.5c4-2.3 7.2-6 7.2-11.4C48 24.3 41 18 32 18z"
                                  fill="#ff6a3d"
                                />
                                <path
                                  d="M18 44c2.5 3.8 6.1 6.8 10.5 8.4 1 .4 2-.4 1.9-1.5-.2-1.8-1.1-3.2-2.1-4.7-.8-1.2-1.7-2.4-2.3-3.9"
                                  fill="none"
                                  stroke="#ff6a3d"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M26 46c.8 4.5 3.6 8.2 7.6 10.5 1 .6 2.3-.1 2.4-1.3.2-2.3-.2-4.2-.7-6.1-.4-1.5-.8-3.1-.8-5"
                                  fill="none"
                                  stroke="#ff6a3d"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M38 46c-.8 4.5-3.6 8.2-7.6 10.5-1 .6-2.3-.1-2.4-1.3-.2-2.3.2-4.2.7-6.1.4-1.5.8-3.1.8-5"
                                  fill="none"
                                  stroke="#ff6a3d"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M46 44c-2.5 3.8-6.1 6.8-10.5 8.4-1 .4-2-.4-1.9-1.5.2-1.8 1.1-3.2 2.1-4.7.8-1.2 1.7-2.4 2.3-3.9"
                                  fill="none"
                                  stroke="#ff6a3d"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />

                                <circle cx="26" cy="31" r="5" fill="#ffffff" />
                                <circle cx="38" cy="31" r="5" fill="#ffffff" />
                                <circle cx="26.5" cy="31.5" r="2" fill="#1a1a1a" />
                                <circle cx="38.5" cy="31.5" r="2" fill="#1a1a1a" />
                                <path
                                  d="M28 38c2 2.4 6 2.4 8 0"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                              </g>
                            </svg>
                          </button>
                          <button
                            className="iconBtn iconBtn-danger"
                            onClick={() => onDeleteApp(a.appname)}
                            aria-label={`Delete ${a.appname}`}
                            title={hasManagePermission ? "Delete application" : "You don't have permission to delete this application"}
                            data-testid={`delete-app-${a.appname}`}
                            disabled={!hasManagePermission}
                            style={{ opacity: hasManagePermission ? 1 : 0.5, cursor: hasManagePermission ? 'pointer' : 'not-allowed' }}
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
