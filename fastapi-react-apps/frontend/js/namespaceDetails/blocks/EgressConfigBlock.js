function NamespaceEgressConfigCard({
  header,
  egressNameId,
  podBasedEgress,
  draft,
  setDraft,
}) {
  const readonly = Boolean(header?.readonly);
  const isEditingEgress = Boolean(header?.isEditing);

  const draftEgressNameId = String(draft?.egressNameId || "");
  const draftEnablePodBasedEgressIp = Boolean(draft?.enablePodBasedEgressIp);

  return (
    <div className="dashboardCard">
      <NamespaceBlockHeader
        icon={(
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
            <path fillRule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.854 10.803a.5.5 0 1 1-.708-.707L9.243 6H6.475a.5.5 0 1 1 0-1h3.975a.5.5 0 0 1 .5.5v3.975a.5.5 0 1 1-1 0V6.707l-4.096 4.096z" />
          </svg>
        )}
        title="Egress Configuration"
        readonly={readonly}
        isEditing={isEditingEgress}
        blockKey={header?.blockKey || "egress"}
        canStartEditing={header?.canStartEditing}
        onEnableBlockEdit={header?.onEnableBlockEdit}
        onDiscardBlockEdits={header?.onDiscardBlockEdits}
        onSaveBlock={header?.onSaveBlock}
      />
      <div className="dashboardCardBody">
        <div className="detailRow">
          <span className="detailLabel">Egress Name ID:</span>
          {isEditingEgress ? (
            <input
              className="filterInput"
              value={draftEgressNameId}
              onChange={(e) => setDraft((prev) => ({ ...prev, egressNameId: e.target.value }))}
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
              onChange={(e) => setDraft((prev) => ({ ...prev, enablePodBasedEgressIp: e.target.value === "Enabled" }))}
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

