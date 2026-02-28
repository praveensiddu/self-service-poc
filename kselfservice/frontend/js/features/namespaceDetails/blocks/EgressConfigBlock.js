function NamespaceEgressConfigCard({
  header,
  egressNameId,
  allocatedEgressIps,
  podBasedEgress,
  draft,
  setDraft,
}) {
  const readonly = Boolean(header?.readonly);
  const isEditingEgress = Boolean(header?.isEditing);

  const [showAllAllocatedEgressIps, setShowAllAllocatedEgressIps] = React.useState(false);

  const draftEgressNameId = String(draft?.egressNameId || "");
  const draftEnablePodBasedEgressIp = Boolean(draft?.enablePodBasedEgressIp);
  const allocatedRows = Array.isArray(allocatedEgressIps)
    ? allocatedEgressIps
        .flatMap((item) => {
          if (typeof item === "string") {
            const s = String(item || "");
            const idx = s.indexOf(":");
            if (idx < 0) return [{ cluster: s.trim(), ip: "" }];
            return [{ cluster: s.slice(0, idx).trim(), ip: s.slice(idx + 1).trim() }];
          }
          if (item && typeof item === "object") {
            const entries = Object.entries(item);
            return entries.map(([cluster, ip]) => ({
              cluster: String(cluster || "").trim(),
              ip: String(ip || "").trim(),
            }));
          }
          return [];
        })
        .filter((r) => Boolean(r.cluster))
    : [];

  const inlineRows = allocatedRows.slice(0, 3);

  return (
    <div className="dashboardCard">
      {showAllAllocatedEgressIps && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllAllocatedEgressIps(false);
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              width: 'min(720px, calc(100vw - 32px))',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '2px solid #e9ecef',
                paddingBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0d6efd' }}>
                Allocated Egress IPs
              </h3>
              <button
                onClick={() => setShowAllAllocatedEgressIps(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                }}
              >
                &times;
              </button>
            </div>

            {allocatedRows.length === 0 ? (
              <div className="muted">None</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {allocatedRows.map((r) => (
                    <tr key={r.cluster}>
                      <td style={{ paddingRight: 12 }}>CL {r.cluster}</td>
                      <td>{r.ip || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

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
        helpDocPath="/static/help/namespaceDetails/egress.html"
        helpTitle="Egress Configuration"
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
          <span className="detailLabel">Allocated Egress IPs:</span>
          <span className="detailValue">
            {allocatedRows.length === 0 ? (
              "None"
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {inlineRows.map((r) => (
                    <tr key={r.cluster}>
                      <td style={{ paddingRight: 12 }}>CL {r.cluster}</td>
                      <td>{r.ip || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </span>
          {allocatedRows.length > 3 && (
            <button
              type="button"
              className="iconBtn"
              style={{ marginLeft: 8 }}
              onClick={() => setShowAllAllocatedEgressIps(true)}
              disabled={isEditingEgress}
              title={isEditingEgress ? "Save or discard changes to view full list" : "Show all allocated egress IPs"}
            >
              showall
            </button>
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

