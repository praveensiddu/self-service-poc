function NamespaceResourcesCard({
  readonly,
  isEditingResourceQuota,
  isEditingLimitRange,
  canStartEditing,
  onEnableBlockEdit,
  onDiscardBlockEdits,
  onSaveBlock,
  resources,
  formatValue,
  draftQuotaLimEphemeralStorage,
  setDraftQuotaLimEphemeralStorage,
  draftQuotaLimMemory,
  setDraftQuotaLimMemory,
  draftReqCpu,
  setDraftReqCpu,
  draftReqMemory,
  setDraftReqMemory,
  draftReqEphemeralStorage,
  setDraftReqEphemeralStorage,
  draftLimCpu,
  setDraftLimCpu,
  draftLimMemory,
  setDraftLimMemory,
  draftLimEphemeralStorage,
  setDraftLimEphemeralStorage,
  draftLimDefaultCpu,
  setDraftLimDefaultCpu,
  draftLimDefaultMemory,
  setDraftLimDefaultMemory,
  draftLimDefaultEphemeralStorage,
  setDraftLimDefaultEphemeralStorage,
  fetchResourceQuotaYaml,
  fetchLimitRangeYaml,
}) {
  return (
    <div className="dashboardCard">
      <div className="dashboardCardHeader">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
          <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z" />
        </svg>
        <h3>Resources</h3>
      </div>
      <div className="dashboardCardBody">
        {isEditingResourceQuota || isEditingLimitRange ? (
          <div>
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>ResourceQuota</h4>
                {!readonly && !isEditingResourceQuota ? (
                  <button
                    className="iconBtn iconBtn-primary"
                    type="button"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => onEnableBlockEdit("resourcequota")}
                    disabled={!canStartEditing("resourcequota")}
                    aria-label="Enable edit"
                    title="Enable edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
                      <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
                    </svg>
                  </button>
                ) : null}
                {!readonly && isEditingResourceQuota ? (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn" type="button" onClick={onDiscardBlockEdits}>
                      Discard Edits
                    </button>
                    <button className="btn btn-primary" type="button" onClick={() => onSaveBlock("resourcequota")}>
                      Submit
                    </button>
                  </div>
                ) : null}
              </div>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #dee2e6' }}>
                <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Limits</h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
                  {isEditingResourceQuota ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftQuotaLimEphemeralStorage} onChange={(e) => setDraftQuotaLimEphemeralStorage(e.target.value)} placeholder="e.g., 2Gi" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.quota_limits?.["ephemeral-storage"] || "")}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
                  {isEditingResourceQuota ? (
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
                  {isEditingResourceQuota ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqCpu} onChange={(e) => setDraftReqCpu(e.target.value)} placeholder="e.g., 8" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.requests?.cpu || "")}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
                  {isEditingResourceQuota ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqMemory} onChange={(e) => setDraftReqMemory(e.target.value)} placeholder="e.g., 64Gi" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.requests?.memory || "")}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
                  {isEditingResourceQuota ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqEphemeralStorage} onChange={(e) => setDraftReqEphemeralStorage(e.target.value)} placeholder="e.g., 1Gi" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.requests?.["ephemeral-storage"] || "")}</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>LimitRange</h4>
                {!readonly && !isEditingLimitRange ? (
                  <button
                    className="iconBtn iconBtn-primary"
                    type="button"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => onEnableBlockEdit("limitrange")}
                    disabled={!canStartEditing("limitrange")}
                    aria-label="Enable edit"
                    title="Enable edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
                      <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
                    </svg>
                  </button>
                ) : null}
                {!readonly && isEditingLimitRange ? (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn" type="button" onClick={onDiscardBlockEdits}>
                      Discard Edits
                    </button>
                    <button className="btn btn-primary" type="button" onClick={() => onSaveBlock("limitrange")}>
                      Submit
                    </button>
                  </div>
                ) : null}
              </div>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #dee2e6' }}>
                <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Default Request</h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>CPU:</span>
                  {isEditingLimitRange ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimCpu} onChange={(e) => setDraftLimCpu(e.target.value)} placeholder="e.g., 50m" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.limits?.cpu || "")}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
                  {isEditingLimitRange ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimMemory} onChange={(e) => setDraftLimMemory(e.target.value)} placeholder="e.g., 100Mi" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.limits?.memory || "")}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
                  {isEditingLimitRange ? (
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
                  {isEditingLimitRange ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimDefaultCpu} onChange={(e) => setDraftLimDefaultCpu(e.target.value)} placeholder="e.g., 10Gi" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.limits?.default?.cpu || "")}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Memory:</span>
                  {isEditingLimitRange ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimDefaultMemory} onChange={(e) => setDraftLimDefaultMemory(e.target.value)} placeholder="e.g., 10Gi" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.limits?.default?.memory || "")}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="attributeKey" style={{ minWidth: '150px' }}>Ephemeral Storage:</span>
                  {isEditingLimitRange ? (
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimDefaultEphemeralStorage} onChange={(e) => setDraftLimDefaultEphemeralStorage(e.target.value)} placeholder="e.g., 350Mi" />
                  ) : (
                    <span className="attributeValue">{formatValue(resources?.limits?.default?.["ephemeral-storage"] || "")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : Object.keys(resources).length > 0 ? (
          <div>
            {(resources.requests || resources.quota_limits) && (
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>ResourceQuota</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!readonly ? (
                      <button
                        className="iconBtn iconBtn-primary"
                        type="button"
                        onClick={() => onEnableBlockEdit("resourcequota")}
                        disabled={!canStartEditing("resourcequota")}
                        aria-label="Enable edit"
                        title="Enable edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
                          <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
                        </svg>
                      </button>
                    ) : null}
                    <button
                      className="iconBtn iconBtn-primary"
                      onClick={() => {
                        (async () => {
                          const resourceQuotaYaml = await fetchResourceQuotaYaml({
                            requests: resources.requests || {},
                            quota_limits: resources.quota_limits || {},
                            limits: resources.limits || {},
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
                  </div>
                </div>
                {(() => {
                  const quotaLimitsFields = [];
                  const quotaLimitsData = resources.quota_limits || {};

                  if (quotaLimitsData['ephemeral-storage'] && quotaLimitsData['ephemeral-storage'] !== "") {
                    quotaLimitsFields.push({ key: 'Ephemeral Storage', value: quotaLimitsData['ephemeral-storage'] });
                  }
                  if (quotaLimitsData.memory && quotaLimitsData.memory !== "") {
                    quotaLimitsFields.push({ key: 'Memory', value: quotaLimitsData.memory });
                  }

                  if (quotaLimitsFields.length === 0) return null;

                  return (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #dee2e6' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Limits</h5>
                      {quotaLimitsFields.map((field, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span className="attributeKey" style={{ minWidth: '150px' }}>{field.key}:</span>
                          <span className="attributeValue">{formatValue(field.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {(() => {
                  const requestsFields = [];
                  const requestsData = resources.requests || {};

                  if (requestsData.cpu && requestsData.cpu !== "") {
                    requestsFields.push({ key: 'CPU', value: requestsData.cpu });
                  }
                  if (requestsData.memory && requestsData.memory !== "") {
                    requestsFields.push({ key: 'Memory', value: requestsData.memory });
                  }
                  if (requestsData['ephemeral-storage'] && requestsData['ephemeral-storage'] !== "") {
                    requestsFields.push({ key: 'Ephemeral Storage', value: requestsData['ephemeral-storage'] });
                  }

                  if (requestsFields.length === 0) return null;

                  return (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Requests</h5>
                      {requestsFields.map((field, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span className="attributeKey" style={{ minWidth: '150px' }}>{field.key}:</span>
                          <span className="attributeValue">{formatValue(field.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
            {resources.limits && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>LimitRange</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!readonly ? (
                      <button
                        className="iconBtn iconBtn-primary"
                        type="button"
                        onClick={() => onEnableBlockEdit("limitrange")}
                        disabled={!canStartEditing("limitrange")}
                        aria-label="Enable edit"
                        title="Enable edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
                          <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
                        </svg>
                      </button>
                    ) : null}
                    <button
                      className="iconBtn iconBtn-primary"
                      onClick={() => {
                        (async () => {
                          const limitRangeYaml = await fetchLimitRangeYaml({
                            requests: resources.requests || {},
                            quota_limits: resources.quota_limits || {},
                            limits: resources.limits || {},
                          });

                          const modal = document.createElement('div');
                          modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                          const modalContent = document.createElement('div');
                          modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                          const header = document.createElement('div');
                          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                          header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">LimitRange Definition</h3>';

                          const closeBtn = document.createElement('button');
                          closeBtn.innerHTML = '&times;';
                          closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                          closeBtn.onclick = () => modal.remove();
                          header.appendChild(closeBtn);

                          const pre = document.createElement('pre');
                          pre.textContent = limitRangeYaml;
                          pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                          const footer = document.createElement('div');
                          footer.style.cssText = 'margin-top: 16px; text-align: right;';

                          const copyBtn = document.createElement('button');
                          copyBtn.textContent = 'Copy';
                          copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                          copyBtn.onclick = () => {
                            navigator.clipboard.writeText(limitRangeYaml).then(() => alert('Copied to clipboard!'));
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
                      title="View LimitRange YAML definition"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                        <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {(() => {
                  const defaultRequestFields = [];
                  const limitsData = resources.limits || {};

                  if (limitsData.cpu && limitsData.cpu !== "") {
                    defaultRequestFields.push({ key: 'CPU', value: limitsData.cpu });
                  }
                  if (limitsData.memory && limitsData.memory !== "") {
                    defaultRequestFields.push({ key: 'Memory', value: limitsData.memory });
                  }
                  if (limitsData['ephemeral-storage'] && limitsData['ephemeral-storage'] !== "") {
                    defaultRequestFields.push({ key: 'Ephemeral Storage', value: limitsData['ephemeral-storage'] });
                  }

                  if (defaultRequestFields.length === 0) return null;

                  return (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #dee2e6' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Default Request</h5>
                      {defaultRequestFields.map((field, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span className="attributeKey" style={{ minWidth: '150px' }}>{field.key}:</span>
                          <span className="attributeValue">{formatValue(field.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {(() => {
                  const defaultFields = [];
                  const defaultData = resources.limits?.default || {};

                  if (defaultData.cpu && defaultData.cpu !== "") {
                    defaultFields.push({ key: 'CPU', value: defaultData.cpu });
                  }
                  if (defaultData.memory && defaultData.memory !== "") {
                    defaultFields.push({ key: 'Memory', value: defaultData.memory });
                  }
                  if (defaultData['ephemeral-storage'] && defaultData['ephemeral-storage'] !== "") {
                    defaultFields.push({ key: 'Ephemeral Storage', value: defaultData['ephemeral-storage'] });
                  }

                  if (defaultFields.length === 0) return null;

                  return (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#6c757d' }}>Default</h5>
                      {defaultFields.map((field, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span className="attributeKey" style={{ minWidth: '150px' }}>{field.key}:</span>
                          <span className="attributeValue">{formatValue(field.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
            {!resources.requests && !resources.limits && (
              <p className="muted">No resource information available</p>
            )}
          </div>
        ) : (
          <p className="muted">No resource information available</p>
        )}
      </div>
    </div>
  );
}
