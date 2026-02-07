function NamespaceBasicInfoCard({
  readonly,
  isEditingBasic,
  canStartEditing,
  onEnableBlockEdit,
  onDiscardBlockEdits,
  onSaveBlock,
  clusters,
  managedByArgo,
  effectiveNamespace,
  draftClustersList,
  removeCluster,
  clusterQuery,
  setClusterQuery,
  clusterPickerOpen,
  setClusterPickerOpen,
  filteredClusterOptions,
  addCluster,
  draftManagedByArgo,
  setDraftManagedByArgo,
  draftNsArgoSyncStrategy,
  setDraftNsArgoSyncStrategy,
  draftNsArgoGitRepoUrl,
  setDraftNsArgoGitRepoUrl,
  formatValue,
}) {
  return (
    <div className="dashboardCard">
      <div className="dashboardCardHeader">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
        </svg>
        <h3>Basic Information</h3>
        {!readonly && !isEditingBasic ? (
          <button
            className="iconBtn iconBtn-primary"
            type="button"
            style={{ marginLeft: 'auto' }}
            onClick={() => onEnableBlockEdit("basic")}
            disabled={!canStartEditing("basic")}
            aria-label="Enable edit"
            title="Enable edit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
              <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
            </svg>
          </button>
        ) : null}
        {!readonly && isEditingBasic ? (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" type="button" onClick={onDiscardBlockEdits}>
              Discard Edits
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onSaveBlock("basic")}>
              Submit
            </button>
          </div>
        ) : null}
      </div>
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
                  placeholder={(draftClustersList || []).length ? "" : "Type to search clusters..."}
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
          <span className="detailLabel">Managed by ArgoCD:</span>
          {isEditingBasic ? (
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

        <div className="detailRow">
          <span className="detailLabel">ArgoCD Sync Strategy:</span>
          {isEditingBasic ? (
            <select
              className="filterInput"
              value={draftNsArgoSyncStrategy}
              onChange={(e) => setDraftNsArgoSyncStrategy(e.target.value)}
              disabled={!draftManagedByArgo}
            >
              <option value="auto">auto</option>
              <option value="manual">manual</option>
            </select>
          ) : (
            <span className="detailValue">{formatValue(effectiveNamespace?.argocd_sync_strategy || "")}</span>
          )}
        </div>

        <div className="detailRow">
          <span className="detailLabel">ArgoCD Git Repo URL:</span>
          {isEditingBasic ? (
            <input
              className="filterInput"
              value={draftNsArgoGitRepoUrl}
              onChange={(e) => setDraftNsArgoGitRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              disabled={!draftManagedByArgo}
            />
          ) : (
            <span className="detailValue">{formatValue(effectiveNamespace?.gitrepourl || "")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

