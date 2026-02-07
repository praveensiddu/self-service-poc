function NamespaceResourceQuotaCard({
  header,
  resources,
  formatValue,
  draft,
  setDraft,
  fetchResourceQuotaYaml,
}) {
  const readonly = Boolean(header?.readonly);
  const isEditing = Boolean(header?.isEditing);

  const draftQuotaLimEphemeralStorage = String(draft?.quota_limits?.["ephemeral-storage"] || "");
  const draftQuotaLimMemory = String(draft?.quota_limits?.memory || "");
  const draftReqCpu = String(draft?.requests?.cpu || "");
  const draftReqMemory = String(draft?.requests?.memory || "");
  const draftReqEphemeralStorage = String(draft?.requests?.["ephemeral-storage"] || "");

  function setDraftQuotaLimEphemeralStorage(val) {
    setDraft((prev) => ({ ...prev, quota_limits: { ...(prev?.quota_limits || {}), "ephemeral-storage": val } }));
  }
  function setDraftQuotaLimMemory(val) {
    setDraft((prev) => ({ ...prev, quota_limits: { ...(prev?.quota_limits || {}), memory: val } }));
  }
  function setDraftReqCpu(val) {
    setDraft((prev) => ({ ...prev, requests: { ...(prev?.requests || {}), cpu: val } }));
  }
  function setDraftReqMemory(val) {
    setDraft((prev) => ({ ...prev, requests: { ...(prev?.requests || {}), memory: val } }));
  }
  function setDraftReqEphemeralStorage(val) {
    setDraft((prev) => ({ ...prev, requests: { ...(prev?.requests || {}), "ephemeral-storage": val } }));
  }

  return (
    <div className="dashboardCard">
      <NamespaceBlockHeader
        icon={(
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z" />
          </svg>
        )}
        title="ResourceQuota"
        readonly={readonly}
        isEditing={isEditing}
        blockKey={header?.blockKey || "resourcequota"}
        canStartEditing={header?.canStartEditing || (() => false)}
        onEnableBlockEdit={header?.onEnableBlockEdit || (() => {})}
        onDiscardBlockEdits={header?.onDiscardBlockEdits || (() => {})}
        onSaveBlock={header?.onSaveBlock || (() => {})}
        right={
          !readonly && !isEditing ? (
            <button
              className="iconBtn iconBtn-primary"
              type="button"
              onClick={() => {
                (async () => {
                  const resourceQuotaYaml = await fetchResourceQuotaYaml({
                    requests: resources?.requests || {},
                    quota_limits: resources?.quota_limits || {},
                    limits: resources?.limits || {},
                  });

                  const modal = document.createElement('div');
                  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                  const modalContent = document.createElement('div');
                  modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                  const header = document.createElement('div');
                  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                  header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">ResourceQuota Definition</h3>';

                  const closeBtn = document.createElement('button');
                  closeBtn.innerHTML = '&times;';
                  closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                  closeBtn.onclick = () => modal.remove();
                  header.appendChild(closeBtn);

                  const pre = document.createElement('pre');
                  pre.textContent = resourceQuotaYaml;
                  pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                  const footer = document.createElement('div');
                  footer.style.cssText = 'margin-top: 16px; text-align: right;';

                  const copyBtn = document.createElement('button');
                  copyBtn.textContent = 'Copy';
                  copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                  copyBtn.onclick = () => {
                    navigator.clipboard.writeText(resourceQuotaYaml).then(() => alert('Copied to clipboard!'));
                  };

                  const closeBtn2 = document.createElement('button');
                  closeBtn2.textContent = 'Close';
                  closeBtn2.style.cssText = 'padding: 8px 16px; background: #0d6efd; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;';
                  closeBtn2.onclick = () => modal.remove();

                  footer.appendChild(copyBtn);
                  footer.appendChild(closeBtn2);

                  modalContent.appendChild(header);
                  modalContent.appendChild(pre);
                  modalContent.appendChild(footer);
                  modal.appendChild(modalContent);

                  document.body.appendChild(modal);
                  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                })().catch((e) => alert(e?.message || String(e)));
              }}
              aria-label="View YAML"
              title="View ResourceQuota YAML definition"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
              </svg>
            </button>
          ) : null
        }
      />
      <div className="dashboardCardBody">
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #dee2e6' }}>
          <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Limits</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftQuotaLimEphemeralStorage} onChange={(e) => setDraftQuotaLimEphemeralStorage(e.target.value)} placeholder="e.g., 2Gi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.quota_limits?.["ephemeral-storage"] || "")}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftQuotaLimMemory} onChange={(e) => setDraftQuotaLimMemory(e.target.value)} placeholder="e.g., 64Gi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.quota_limits?.memory || "")}</span>
            )}
          </div>
        </div>

        <div>
          <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Requests</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>CPU:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftReqCpu} onChange={(e) => setDraftReqCpu(e.target.value)} placeholder="e.g., 8" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.requests?.cpu || "")}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftReqMemory} onChange={(e) => setDraftReqMemory(e.target.value)} placeholder="e.g., 64Gi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.requests?.memory || "")}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
            {isEditing ? (
              <input className="filterInput" style={{ flex: 1 }} value={draftReqEphemeralStorage} onChange={(e) => setDraftReqEphemeralStorage(e.target.value)} placeholder="e.g., 1Gi" />
            ) : (
              <span className="attributeValue">{formatValue(resources?.requests?.["ephemeral-storage"] || "")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
