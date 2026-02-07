function NamespaceBasicInfoCard({
  header,
  clusters,
  managedByArgo,
  effectiveNamespace,
  clusterQuery,
  setClusterQuery,
  clusterPickerOpen,
  setClusterPickerOpen,
  filteredClusterOptions,
  draft,
  setDraft,
  formatValue,
}) {
  const readonly = Boolean(header?.readonly);
  const isEditingBasic = Boolean(header?.isEditing);

  const draftClustersList = Array.isArray(draft?.clustersList) ? draft.clustersList : [];
  const draftManagedByArgo = Boolean(draft?.managedByArgo);
  const draftNsArgoSyncStrategy = String(draft?.nsArgoSyncStrategy || "auto");
  const draftNsArgoGitRepoUrl = String(draft?.nsArgoGitRepoUrl || "");

  function addCluster(name) {
    const v = String(name || "").trim();
    if (!v) return;
    setDraft((prev) => {
      const list = Array.isArray(prev?.clustersList) ? prev.clustersList : [];
      const exists = list.some((x) => String(x).toLowerCase() === v.toLowerCase());
      const nextList = exists ? list : [...list, v];
      return { ...prev, clustersList: nextList };
    });
    setClusterQuery("");
    setClusterPickerOpen(true);
  }

  function removeCluster(name) {
    const v = String(name || "").trim();
    if (!v) return;
    setDraft((prev) => {
      const list = Array.isArray(prev?.clustersList) ? prev.clustersList : [];
      const nextList = list.filter((x) => String(x).toLowerCase() !== v.toLowerCase());
      return { ...prev, clustersList: nextList };
    });
  }

  return (
    <div className="dashboardCard">
      <NamespaceBlockHeader
        icon={(
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
        )}
        title="Basic Information"
        readonly={readonly}
        isEditing={isEditingBasic}
        blockKey={header?.blockKey || "basic"}
        canStartEditing={header?.canStartEditing}
        onEnableBlockEdit={header?.onEnableBlockEdit}
        onDiscardBlockEdits={header?.onDiscardBlockEdits}
        onSaveBlock={header?.onSaveBlock}
      />
      <div className="dashboardCardBody">
        <div className="detailRow">
          <span className="detailLabel">Clusters:</span>
          {isEditingBasic ? (
            <div
              style={{ position: "relative", flex: 1 }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setClusterPickerOpen(false);
              }}
            >
              <div
                className="filterInput"
                style={{
                  minHeight: 36,
                  height: "auto",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                  padding: "6px 8px",
                }}
                onMouseDown={() => setClusterPickerOpen(true)}
              >
                {(draftClustersList || []).map((c) => (
                  <span
                    key={c}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.06)",
                      fontSize: 12,
                    }}
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "0 6px", lineHeight: "16px" }}
                      onClick={() => removeCluster(c)}
                      aria-label={`Remove ${c}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="filterInput"
                  style={{
                    border: "none",
                    outline: "none",
                    boxShadow: "none",
                    flex: 1,
                    minWidth: 160,
                    padding: 0,
                    margin: 0,
                    height: 22,
                  }}
                  value={clusterQuery}
                  onChange={(e) => {
                    setClusterQuery(e.target.value);
                    setClusterPickerOpen(true);
                  }}
                  onFocus={() => setClusterPickerOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const first = filteredClusterOptions[0];
                      if (first) addCluster(first);
                      return;
                    }
                    if (e.key === "Backspace" && !clusterQuery && (draftClustersList || []).length > 0) {
                      const last = (draftClustersList || [])[(draftClustersList || []).length - 1];
                      removeCluster(last);
                    }
                    if (e.key === "Escape") {
                      setClusterPickerOpen(false);
                    }
                  }}
                  placeholder="Add cluster..."
                  data-testid="ns-edit-input-clusters"
                />
              </div>

              {clusterPickerOpen ? (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 10001,
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 8,
                    maxHeight: 220,
                    overflow: "auto",
                  }}
                  tabIndex={-1}
                >
                  {filteredClusterOptions.length === 0 ? (
                    <div className="muted" style={{ padding: 10 }}>No matches</div>
                  ) : (
                    filteredClusterOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="btn"
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          borderRadius: 0,
                          padding: "10px 10px",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addCluster(c);
                        }}
                      >
                        {c}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <span className="detailValue detailValueHighlight">{clusters}</span>
          )}
        </div>
        <div className="detailRow">
          <span className="detailLabel">Managed By Argo:</span>
          {isEditingBasic ? (
            <select
              className="filterInput"
              value={draftManagedByArgo ? "Yes" : "No"}
              onChange={(e) => setDraft((prev) => ({ ...prev, managedByArgo: e.target.value === "Yes" }))}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          ) : (
            <span className={`detailBadge ${managedByArgo === 'Yes' ? 'detailBadgeSuccess' : 'detailBadgeWarning'}`}>
              {managedByArgo}
            </span>
          )}
        </div>

        <div className="detailRow">
          <span className="detailLabel">Argo Sync Strategy:</span>
          {isEditingBasic ? (
            <input
              className="filterInput"
              value={draftNsArgoSyncStrategy}
              onChange={(e) => setDraft((prev) => ({ ...prev, nsArgoSyncStrategy: e.target.value }))}
            />
          ) : (
            <span className="detailValue">{formatValue(effectiveNamespace?.argocd_sync_strategy)}</span>
          )}
        </div>
        <div className="detailRow">
          <span className="detailLabel">Argo Git Repo URL:</span>
          {isEditingBasic ? (
            <input
              className="filterInput"
              value={draftNsArgoGitRepoUrl}
              onChange={(e) => setDraft((prev) => ({ ...prev, nsArgoGitRepoUrl: e.target.value }))}
            />
          ) : (
            <span className="detailValue">{formatValue(effectiveNamespace?.gitrepourl)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

