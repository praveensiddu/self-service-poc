function NamespaceEgressConfigCard({
  readonly,
  isEditingEgress,
  canStartEditing,
  onEnableBlockEdit,
  onDiscardBlockEdits,
  onSaveBlock,
  draftEgressNameId,
  setDraftEgressNameId,
  egressNameId,
  draftEnablePodBasedEgressIp,
  setDraftEnablePodBasedEgressIp,
  podBasedEgress,
}) {
  return (
    <div className="dashboardCard">
      <div className="dashboardCardHeader">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
          <path fillRule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.854 10.803a.5.5 0 1 1-.708-.707L9.243 6H6.475a.5.5 0 1 1 0-1h3.975a.5.5 0 0 1 .5.5v3.975a.5.5 0 1 1-1 0V6.707l-4.096 4.096z" />
        </svg>
        <h3>Egress Configuration</h3>
        {!readonly && !isEditingEgress ? (
          <button
            className="iconBtn iconBtn-primary"
            type="button"
            style={{ marginLeft: 'auto' }}
            onClick={() => onEnableBlockEdit("egress")}
            disabled={!canStartEditing("egress")}
            aria-label="Enable edit"
            title="Enable edit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
              <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
            </svg>
          </button>
        ) : null}
        {!readonly && isEditingEgress ? (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" type="button" onClick={onDiscardBlockEdits}>
              Discard Edits
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onSaveBlock("egress")}>
              Submit
            </button>
          </div>
        ) : null}
      </div>
      <div className="dashboardCardBody">
        <div className="detailRow">
          <span className="detailLabel">Egress Name ID:</span>
          {isEditingEgress ? (
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
          {isEditingEgress ? (
            <select
              className="filterInput"
              value={draftEnablePodBasedEgressIp ? "Enabled" : "Disabled"}
              onChange={(e) => setDraftEnablePodBasedEgressIp(e.target.value === "Enabled")}
            >
              <option value="Enabled">Enabled</option>
              <option value="Disabled">Disabled</option>
            </select>
          ) : (
            <span className={`detailBadge ${podBasedEgress === 'Enabled' ? 'detailBadgeSuccess' : 'detailBadgeWarning'}`}>
              {podBasedEgress}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

