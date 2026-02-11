function NamespaceLimitRangeCard({
  header,
  resources,
  formatValue,
  draft,
  setDraft,
  fetchLimitRangeYaml,
}) {
  const readonly = Boolean(header?.readonly);
  const isEditing = Boolean(header?.isEditing);

  // YAML preview modal state
  const [yamlPreview, setYamlPreview] = React.useState({ isOpen: false, yaml: "" });

  const draftLimCpu = String(draft?.limits?.cpu || "");
  const draftLimMemory = String(draft?.limits?.memory || "");
  const draftLimEphemeralStorage = String(draft?.limits?.["ephemeral-storage"] || "");
  const draftLimDefaultCpu = String(draft?.limits?.default?.cpu || "");
  const draftLimDefaultMemory = String(draft?.limits?.default?.memory || "");
  const draftLimDefaultEphemeralStorage = String(draft?.limits?.default?.["ephemeral-storage"] || "");

  function setDraftLimCpu(val) {
    setDraft((prev) => ({ ...prev, limits: { ...(prev?.limits || {}), cpu: val } }));
  }
  function setDraftLimMemory(val) {
    setDraft((prev) => ({ ...prev, limits: { ...(prev?.limits || {}), memory: val } }));
  }
  function setDraftLimEphemeralStorage(val) {
    setDraft((prev) => ({ ...prev, limits: { ...(prev?.limits || {}), "ephemeral-storage": val } }));
  }
  function setDraftLimDefaultCpu(val) {
    setDraft((prev) => ({
      ...prev,
      limits: {
        ...(prev?.limits || {}),
        default: { ...(prev?.limits?.default || {}), cpu: val },
      },
    }));
  }
  function setDraftLimDefaultMemory(val) {
    setDraft((prev) => ({
      ...prev,
      limits: {
        ...(prev?.limits || {}),
        default: { ...(prev?.limits?.default || {}), memory: val },
      },
    }));
  }
  function setDraftLimDefaultEphemeralStorage(val) {
    setDraft((prev) => ({
      ...prev,
      limits: {
        ...(prev?.limits || {}),
        default: { ...(prev?.limits?.default || {}), "ephemeral-storage": val },
      },
    }));
  }

  async function handleViewYaml() {
    try {
      const limitRangeYaml = await fetchLimitRangeYaml({
        requests: resources?.requests || {},
        quota_limits: resources?.quota_limits || {},
        limits: resources?.limits || {},
      });
      setYamlPreview({ isOpen: true, yaml: limitRangeYaml });
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  return (
    <div className="dashboardCard">
      <YamlPreviewModal
        isOpen={yamlPreview.isOpen}
        onClose={() => setYamlPreview({ isOpen: false, yaml: "" })}
        title="LimitRange Definition"
        yaml={yamlPreview.yaml}
        titleColor="#0d6efd"
      />
      <NamespaceBlockHeader
        icon={(
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z" />
          </svg>
        )}
        title="LimitRange"
        readonly={readonly}
        isEditing={isEditing}
        blockKey={header?.blockKey || "limitrange"}
        canStartEditing={header?.canStartEditing || (() => false)}
        onEnableBlockEdit={header?.onEnableBlockEdit || (() => {})}
        onDiscardBlockEdits={header?.onDiscardBlockEdits || (() => {})}
        onSaveBlock={header?.onSaveBlock || (() => {})}
        helpDocPath="/static/help/namespaceDetails/limitRange.html"
        helpTitle="LimitRange"
      />
      <div className="dashboardCardBody" style={{ position: 'relative' }}>
        {!isEditing && (
          <button
            className="iconBtn iconBtn-plain"
            type="button"
            style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1 }}
            onClick={handleViewYaml}
            aria-label="View Details"
            title="View LimitRange Details"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
              <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
            </svg>
          </button>
        )}
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #dee2e6' }}>
          <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Default Request</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>CPU:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftLimCpu} onChange={(e) => setDraftLimCpu(e.target.value)} placeholder="e.g., 50m" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.limits?.cpu || "")}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftLimMemory} onChange={(e) => setDraftLimMemory(e.target.value)} placeholder="e.g., 100Mi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.limits?.memory || "")}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftLimEphemeralStorage} onChange={(e) => setDraftLimEphemeralStorage(e.target.value)} placeholder="e.g., 50Mi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.limits?.["ephemeral-storage"] || "")}</span>
            )}
          </div>
        </div>

        <div>
          <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Default</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>CPU:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftLimDefaultCpu} onChange={(e) => setDraftLimDefaultCpu(e.target.value)} placeholder="e.g., 10Gi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.limits?.default?.cpu || "")}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftLimDefaultMemory} onChange={(e) => setDraftLimDefaultMemory(e.target.value)} placeholder="e.g., 10Gi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.limits?.default?.memory || "")}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftLimDefaultEphemeralStorage} onChange={(e) => setDraftLimDefaultEphemeralStorage(e.target.value)} placeholder="e.g., 350Mi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.limits?.default?.["ephemeral-storage"] || "")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
