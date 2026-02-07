function NamespaceEgressFirewallCard({
  header,
  draftEgressFirewallEntries,
  setDraftEgressFirewallEntries,
  previewEgressFirewallWithDraft,
  egressFirewallRules,
  fetchEgressFirewallYaml,
  formatValue,
}) {
  const readonly = Boolean(header?.readonly);
  const isEditingEgressFirewall = Boolean(header?.isEditing);
  return (
    <div className="dashboardCard">
      <NamespaceBlockHeader
        icon={(
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
            <path fillRule="evenodd" d="M2.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-11zM3 2h10v12H3V2zm2 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 4.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 6.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8.5z" />
          </svg>
        )}
        title="Egress Firewall"
        readonly={readonly}
        isEditing={isEditingEgressFirewall}
        blockKey={header?.blockKey || "egressfirewall"}
        canStartEditing={header?.canStartEditing}
        onEnableBlockEdit={header?.onEnableBlockEdit}
        onDiscardBlockEdits={header?.onDiscardBlockEdits}
        onSaveBlock={header?.onSaveBlock}
        helpDocPath="/static/help/namespaceDetails/egressFirewall.html"
        helpTitle="Egress Firewall"
        right={
          <>
            {isEditingEgressFirewall && draftEgressFirewallEntries.length > 0 && (
              <button
                className="iconBtn iconBtn-warning"
                style={{ marginLeft: (!readonly && isEditingEgressFirewall) ? 0 : 'auto' }}
                onClick={previewEgressFirewallWithDraft}
                aria-label="Preview YAML"
                title="Preview EgressFirewall YAML with current draft changes"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
                  <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
                </svg>
              </button>
            )}
            {!isEditingEgressFirewall && egressFirewallRules.length > 0 && (
              <button
                className="iconBtn iconBtn-primary"
                style={{ marginLeft: 'auto' }}
                onClick={async () => {
                  try {
                    const egressYaml = await fetchEgressFirewallYaml(egressFirewallRules);

                    const modal = document.createElement('div');
                    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                    const modalContent = document.createElement('div');
                    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);';

                    const header = document.createElement('div');
                    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                    header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">EgressFirewall Details</h3>';

                    const closeBtn = document.createElement('button');
                    closeBtn.innerHTML = '&times;';
                    closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                    closeBtn.onclick = () => modal.remove();
                    header.appendChild(closeBtn);

                    const pre = document.createElement('pre');
                    pre.textContent = egressYaml;
                    pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                    const footer = document.createElement('div');
                    footer.style.cssText = 'margin-top: 16px; text-align: right;';

                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = 'Copy';
                    copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                    copyBtn.onclick = () => {
                      navigator.clipboard.writeText(egressYaml).then(() => alert('Copied to clipboard!'));
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
                  } catch (err) {
                    alert('Failed to load EgressFirewall YAML: ' + String(err.message || err));
                  }
                }}
                aria-label="View YAML"
                title="View EgressFirewall YAML definition"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                  <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                </svg>
              </button>
            )}
          </>
        }
      />

      <div className="dashboardCardBody">
        {isEditingEgressFirewall ? (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: '0 0 40%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#495057' }}>DNS Names</h4>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setDraftEgressFirewallEntries([
                      ...draftEgressFirewallEntries,
                      { egressType: "dnsName", egressValue: "", ports: [] },
                    ]);
                  }}
                >
                  + Add DNS
                </button>
              </div>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>DNS Name</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const dnsEntries = draftEgressFirewallEntries
                      .map((entry, idx) => ({ entry, idx }))
                      .filter(({ entry }) => entry.egressType === "dnsName");

                    return dnsEntries.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="muted" style={{ textAlign: 'center' }}>
                          No DNS entries. Click "+ Add DNS" to add one.
                        </td>
                      </tr>
                    ) : (
                      dnsEntries.map(({ entry, idx }) => (
                        <tr key={idx}>
                          <td>
                            <input
                              className="filterInput"
                              value={entry.egressValue || ""}
                              onChange={(e) => {
                                const updated = [...draftEgressFirewallEntries];
                                updated[idx] = { ...updated[idx], egressValue: e.target.value };
                                setDraftEgressFirewallEntries(updated);
                              }}
                              placeholder="e.g., github.com"
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="iconBtn iconBtn-danger"
                              type="button"
                              onClick={() => {
                                const updated = draftEgressFirewallEntries.filter((_, i) => i !== idx);
                                setDraftEgressFirewallEntries(updated);
                              }}
                              aria-label="Delete entry"
                              title="Delete DNS entry"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div style={{ flex: '0 0 calc(60% - 8px)', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#495057' }}>CIDR Blocks</h4>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setDraftEgressFirewallEntries([
                      ...draftEgressFirewallEntries,
                      { egressType: "cidrSelector", egressValue: "", ports: [] },
                    ]);
                  }}
                >
                  + Add CIDR
                </button>
              </div>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>CIDR Block</th>
                    <th style={{ width: '55%' }}>Ports</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const cidrEntries = draftEgressFirewallEntries
                      .map((entry, idx) => ({ entry, idx }))
                      .filter(({ entry }) => entry.egressType === "cidrSelector");

                    return cidrEntries.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="muted" style={{ textAlign: 'center' }}>
                          No CIDR entries. Click "+ Add CIDR" to add one.
                        </td>
                      </tr>
                    ) : (
                      cidrEntries.map(({ entry, idx }) => (
                        <tr key={idx}>
                          <td>
                            <input
                              className="filterInput"
                              value={entry.egressValue || ""}
                              onChange={(e) => {
                                const updated = [...draftEgressFirewallEntries];
                                updated[idx] = { ...updated[idx], egressValue: e.target.value };
                                setDraftEgressFirewallEntries(updated);
                              }}
                              placeholder="e.g., 10.0.0.0/8"
                            />
                          </td>
                          <td>
                            <div style={{ padding: '8px 0' }}>
                              {(Array.isArray(entry.ports) ? entry.ports : []).length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span className="muted" style={{ fontSize: '12px' }}>No ports</span>
                                  <button
                                    className="iconBtn iconBtn-sm iconBtn-success"
                                    type="button"
                                    onClick={() => {
                                      const updated = [...draftEgressFirewallEntries];
                                      const ports = Array.isArray(updated[idx].ports) ? [...updated[idx].ports] : [];
                                      ports.push({ protocol: "TCP", port: "" });
                                      updated[idx] = { ...updated[idx], ports };
                                      setDraftEgressFirewallEntries(updated);
                                    }}
                                    aria-label="Add port"
                                    title="Add port"
                                    style={{ padding: '4px', minWidth: '24px', background: '#28a745', color: 'white' }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <div style={{ paddingBottom: '8px' }}>
                                  {(entry.ports || []).map((p, pidx) => (
                                    <div key={pidx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                                      <select
                                        className="filterInput"
                                        style={{ width: 70, fontSize: '13px' }}
                                        value={p.protocol || "TCP"}
                                        onChange={(e) => {
                                          const updated = [...draftEgressFirewallEntries];
                                          const ports = Array.isArray(updated[idx].ports) ? [...updated[idx].ports] : [];
                                          ports[pidx] = { ...(ports[pidx] || {}), protocol: e.target.value };
                                          updated[idx] = { ...updated[idx], ports };
                                          setDraftEgressFirewallEntries(updated);
                                        }}
                                      >
                                        <option value="TCP">TCP</option>
                                        <option value="UDP">UDP</option>
                                      </select>
                                      <input
                                        className="filterInput"
                                        style={{ width: 70, fontSize: '13px' }}
                                        value={p.port == null ? "" : String(p.port)}
                                        onChange={(e) => {
                                          const updated = [...draftEgressFirewallEntries];
                                          const ports = Array.isArray(updated[idx].ports) ? [...updated[idx].ports] : [];
                                          ports[pidx] = { ...(ports[pidx] || {}), port: e.target.value };
                                          updated[idx] = { ...updated[idx], ports };
                                          setDraftEgressFirewallEntries(updated);
                                        }}
                                        placeholder="Port"
                                      />
                                      <button
                                        className="iconBtn iconBtn-sm iconBtn-danger"
                                        type="button"
                                        onClick={() => {
                                          const updated = [...draftEgressFirewallEntries];
                                          const ports = Array.isArray(updated[idx].ports)
                                            ? updated[idx].ports.filter((_, i) => i !== pidx)
                                            : [];
                                          updated[idx] = { ...updated[idx], ports };
                                          setDraftEgressFirewallEntries(updated);
                                        }}
                                        aria-label="Delete port"
                                        title="Delete port"
                                        style={{ padding: '4px', minWidth: '24px' }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                                        </svg>
                                      </button>
                                      {pidx === (entry.ports || []).length - 1 && (
                                        <button
                                          className="iconBtn iconBtn-sm iconBtn-success"
                                          type="button"
                                          onClick={() => {
                                            const updated = [...draftEgressFirewallEntries];
                                            const ports = Array.isArray(updated[idx].ports) ? [...updated[idx].ports] : [];
                                            ports.push({ protocol: "TCP", port: "" });
                                            updated[idx] = { ...updated[idx], ports };
                                            setDraftEgressFirewallEntries(updated);
                                          }}
                                          aria-label="Add port"
                                          title="Add another port"
                                          style={{ padding: '4px', minWidth: '24px', background: '#28a745', color: 'white' }}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="iconBtn iconBtn-danger"
                              type="button"
                              onClick={() => {
                                const updated = draftEgressFirewallEntries.filter((_, i) => i !== idx);
                                setDraftEgressFirewallEntries(updated);
                              }}
                              aria-label="Delete entry"
                              title="Delete CIDR entry"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: '0 0 40%', minWidth: 0 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#495057', margin: '0 0 12px 0', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}>
                DNS Names ({egressFirewallRules.filter(r => r.egressType === 'dnsName').length})
              </h4>
              {egressFirewallRules.filter(r => r.egressType === 'dnsName').length === 0 ? (
                <p className="muted">No DNS entries</p>
              ) : (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>DNS Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {egressFirewallRules
                      .filter(r => r.egressType === 'dnsName')
                      .map((r, idx) => (
                        <tr key={idx}>
                          <td>{formatValue(r.egressValue)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ flex: '0 0 calc(60% - 8px)', minWidth: 0 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#495057', margin: '0 0 12px 0', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}>
                CIDR Blocks ({egressFirewallRules.filter(r => r.egressType === 'cidrSelector').length})
              </h4>
              {egressFirewallRules.filter(r => r.egressType === 'cidrSelector').length === 0 ? (
                <p className="muted">No CIDR entries</p>
              ) : (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>CIDR Block</th>
                      <th>Ports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {egressFirewallRules
                      .filter(r => r.egressType === 'cidrSelector')
                      .map((r, idx) => (
                        <tr key={idx}>
                          <td>{formatValue(r.egressValue)}</td>
                          <td>
                            {r.ports && r.ports.length > 0 ? (
                              <span style={{ fontSize: '13px' }}>
                                {r.ports.map(p => `${p.protocol}/${p.port}`).join(', ')}
                              </span>
                            ) : (
                              <span className="muted" style={{ fontSize: '12px' }}>No ports</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
