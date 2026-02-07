function NamespaceRoleBindingsCard({
  readonly,
  isEditingRoleBindings,
  canStartEditing,
  onEnableBlockEdit,
  onDiscardBlockEdits,
  onSaveBlock,
  draftRoleBindingsEntries,
  setDraftRoleBindingsEntries,
  roleCatalogByKind,
  fetchRoleBindingYaml,
  rolebindings,
}) {
  return (
    <div className="dashboardCard">
      <div className="dashboardCardHeader">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
        </svg>
        <h3>Role Bindings</h3>
        {!readonly && !isEditingRoleBindings ? (
          <button
            className="iconBtn iconBtn-primary"
            type="button"
            style={{ marginLeft: 'auto' }}
            onClick={() => onEnableBlockEdit("rolebindings")}
            disabled={!canStartEditing("rolebindings")}
            aria-label="Enable edit"
            title="Enable edit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
              <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
            </svg>
          </button>
        ) : null}
        {!readonly && isEditingRoleBindings ? (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" type="button" onClick={onDiscardBlockEdits}>
              Discard Edits
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onSaveBlock("rolebindings")}>
              Submit
            </button>
          </div>
        ) : null}
        {isEditingRoleBindings && (
          <button
            className="btn btn-primary"
            style={{ marginLeft: (!readonly && isEditingRoleBindings) ? 0 : 'auto' }}
            onClick={() => {
              setDraftRoleBindingsEntries([
                ...draftRoleBindingsEntries,
                {
                  subjects: [{ kind: "User", name: "" }],
                  roleRef: { kind: "ClusterRole", name: "" },
                },
              ]);
            }}
          >
            + Add RoleBinding Entry
          </button>
        )}
      </div>
      <div className="dashboardCardBody">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Role Type</th>
                <th>Role Reference</th>
                <th>Subject Kind</th>
                <th>Subject Name</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isEditingRoleBindings ? (
                draftRoleBindingsEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                      No RoleBinding entries. Click "+ Add RoleBinding Entry" to add one.
                    </td>
                  </tr>
                ) : (
                  draftRoleBindingsEntries.map((entry, idx) => {
                    const subjects = Array.isArray(entry.subjects) ? entry.subjects : [];
                    const rowSpan = Math.max(subjects.length, 1);

                    const roleKind = entry.roleRef?.kind === "Role" ? "Role" : "ClusterRole";
                    const catalog = Array.isArray(roleCatalogByKind?.[roleKind]) ? roleCatalogByKind[roleKind] : [];
                    const roleRefName = String(entry.roleRef?.name || "");
                    const roleRefOptions = catalog.includes(roleRefName) || !roleRefName
                      ? catalog
                      : [roleRefName, ...catalog];

                    return subjects.length === 0 ? (
                      <tr key={idx}>
                        <td>
                          <select
                            className="filterInput"
                            value={entry.roleRef?.kind || "ClusterRole"}
                            onChange={(e) => {
                              const updated = [...draftRoleBindingsEntries];
                              updated[idx] = {
                                ...updated[idx],
                                roleRef: { ...updated[idx].roleRef, kind: e.target.value, name: "" },
                              };
                              setDraftRoleBindingsEntries(updated);
                            }}
                          >
                            <option value="ClusterRole">ClusterRole</option>
                            <option value="Role">Role</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="filterInput"
                            value={roleRefName}
                            onChange={(e) => {
                              const updated = [...draftRoleBindingsEntries];
                              updated[idx] = {
                                ...updated[idx],
                                roleRef: { ...updated[idx].roleRef, name: e.target.value },
                              };
                              setDraftRoleBindingsEntries(updated);
                            }}
                          >
                            <option value="">Select...</option>
                            {roleRefOptions.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </td>
                        <td colSpan={2} style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              const updated = [...draftRoleBindingsEntries];
                              updated[idx].subjects = [{ kind: "User", name: "" }];
                              setDraftRoleBindingsEntries(updated);
                            }}
                          >
                            + Add Subject
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button
                              className="iconBtn iconBtn-primary"
                              onClick={async () => {
                                const roleYaml = await fetchRoleBindingYaml({
                                  subjects: entry.subjects || [],
                                  roleRef: entry.roleRef,
                                  bindingIndex: idx,
                                });

                                const modal = document.createElement('div');
                                modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                                const modalContent = document.createElement('div');
                                modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                                const header = document.createElement('div');
                                header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                                header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">RoleBinding Details</h3>';

                                const closeBtn = document.createElement('button');
                                closeBtn.innerHTML = '&times;';
                                closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                                closeBtn.onclick = () => modal.remove();
                                header.appendChild(closeBtn);

                                const pre = document.createElement('pre');
                                pre.textContent = roleYaml;
                                pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                                const footer = document.createElement('div');
                                footer.style.cssText = 'margin-top: 16px; text-align: right;';

                                const copyBtn = document.createElement('button');
                                copyBtn.textContent = 'Copy';
                                copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                                copyBtn.onclick = () => {
                                  navigator.clipboard.writeText(roleYaml).then(() => alert('Copied to clipboard!'));
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
                              }}
                              aria-label="View YAML"
                              title="View YAML description"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                              </svg>
                            </button>
                            <button
                              className="iconBtn iconBtn-danger"
                              onClick={() => {
                                const updated = draftRoleBindingsEntries.filter((_, i) => i !== idx);
                                setDraftRoleBindingsEntries(updated);
                              }}
                              aria-label="Delete entry"
                              title="Delete RoleBinding entry"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subjects.map((subject, subIdx) => (
                        <tr key={`${idx}-${subIdx}`}>
                          {subIdx === 0 && (
                            <>
                              <td rowSpan={rowSpan}>
                                <select
                                  className="filterInput"
                                  value={entry.roleRef?.kind || "ClusterRole"}
                                  onChange={(e) => {
                                    const updated = [...draftRoleBindingsEntries];
                                    updated[idx] = {
                                      ...updated[idx],
                                      roleRef: { ...updated[idx].roleRef, kind: e.target.value, name: "" },
                                    };
                                    setDraftRoleBindingsEntries(updated);
                                  }}
                                >
                                  <option value="ClusterRole">ClusterRole</option>
                                  <option value="Role">Role</option>
                                </select>
                              </td>
                              <td rowSpan={rowSpan}>
                                <select
                                  className="filterInput"
                                  value={roleRefName}
                                  onChange={(e) => {
                                    const updated = [...draftRoleBindingsEntries];
                                    updated[idx] = {
                                      ...updated[idx],
                                      roleRef: { ...updated[idx].roleRef, name: e.target.value },
                                    };
                                    setDraftRoleBindingsEntries(updated);
                                  }}
                                >
                                  <option value="">Select...</option>
                                  {roleRefOptions.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                              </td>
                            </>
                          )}
                          <td>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <select
                                className="filterInput"
                                value={subject?.kind || "User"}
                                onChange={(e) => {
                                  const updated = [...draftRoleBindingsEntries];
                                  updated[idx].subjects[subIdx] = {
                                    ...updated[idx].subjects[subIdx],
                                    kind: e.target.value,
                                  };
                                  setDraftRoleBindingsEntries(updated);
                                }}
                              >
                                <option value="User">User</option>
                                <option value="Group">Group</option>
                                <option value="ServiceAccount">ServiceAccount</option>
                              </select>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                className="filterInput"
                                value={subject?.name || ""}
                                onChange={(e) => {
                                  const updated = [...draftRoleBindingsEntries];
                                  updated[idx].subjects[subIdx] = {
                                    ...updated[idx].subjects[subIdx],
                                    name: e.target.value,
                                  };
                                  setDraftRoleBindingsEntries(updated);
                                }}
                                placeholder="e.g., user@example.com"
                                style={{ flex: 1 }}
                              />
                              <button
                                className="iconBtn iconBtn-sm iconBtn-danger"
                                onClick={() => {
                                  const updated = [...draftRoleBindingsEntries];
                                  updated[idx].subjects = updated[idx].subjects.filter((_, i) => i !== subIdx);
                                  setDraftRoleBindingsEntries(updated);
                                }}
                                aria-label="Remove subject"
                                title="Remove this subject"
                                style={{ padding: '4px', minWidth: '24px' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                                </svg>
                              </button>
                              {subIdx === subjects.length - 1 && (
                                <button
                                  className="iconBtn iconBtn-sm iconBtn-success"
                                  onClick={() => {
                                    const updated = [...draftRoleBindingsEntries];
                                    updated[idx].subjects.push({ kind: "User", name: "" });
                                    setDraftRoleBindingsEntries(updated);
                                  }}
                                  aria-label="Add subject"
                                  title="Add another subject"
                                  style={{ padding: '4px', minWidth: '24px', background: '#28a745', color: 'white' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          {subIdx === 0 && (
                            <td rowSpan={rowSpan} style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                  className="iconBtn iconBtn-primary"
                                  onClick={async () => {
                                    const roleYaml = await fetchRoleBindingYaml({
                                      subjects: entry.subjects || [],
                                      roleRef: entry.roleRef,
                                      bindingIndex: idx,
                                    });

                                    const modal = document.createElement('div');
                                    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                                    const modalContent = document.createElement('div');
                                    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                                    const header = document.createElement('div');
                                    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                                    header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">RoleBinding Details</h3>';

                                    const closeBtn = document.createElement('button');
                                    closeBtn.innerHTML = '&times;';
                                    closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                                    closeBtn.onclick = () => modal.remove();
                                    header.appendChild(closeBtn);

                                    const pre = document.createElement('pre');
                                    pre.textContent = roleYaml;
                                    pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                                    const footer = document.createElement('div');
                                    footer.style.cssText = 'margin-top: 16px; text-align: right;';

                                    const copyBtn = document.createElement('button');
                                    copyBtn.textContent = 'Copy';
                                    copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                                    copyBtn.onclick = () => {
                                      navigator.clipboard.writeText(roleYaml).then(() => alert('Copied to clipboard!'));
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
                                  }}
                                  aria-label="View YAML"
                                  title="View YAML description"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                                    <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                                  </svg>
                                </button>
                                <button
                                  className="iconBtn iconBtn-danger"
                                  onClick={() => {
                                    const updated = draftRoleBindingsEntries.filter((_, i) => i !== idx);
                                    setDraftRoleBindingsEntries(updated);
                                  }}
                                  aria-label="Delete entry"
                                  title="Delete RoleBinding entry"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    );
                  })
                )
              ) : (
                Array.isArray(rolebindings) && rolebindings.length > 0 ? (
                  rolebindings.map((binding, idx) => {
                    let subjects = [];
                    if (Array.isArray(binding.subjects)) {
                      subjects = binding.subjects;
                    } else if (binding.subject) {
                      subjects = [binding.subject];
                    }
                    const rowSpan = Math.max(subjects.length, 1);

                    return subjects.length === 0 ? (
                      <tr key={idx}>
                        <td>{binding.roleRef?.kind || "N/A"}</td>
                        <td>{binding.roleRef?.name || "N/A"}</td>
                        <td colSpan={2} style={{ textAlign: 'center', fontStyle: 'italic', color: '#6c757d' }}>
                          No subjects defined
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button
                              className="iconBtn iconBtn-primary"
                              onClick={async () => {
                                const roleYaml = await fetchRoleBindingYaml({
                                  subjects: subjects,
                                  roleRef: binding.roleRef,
                                  bindingIndex: idx,
                                });

                                const modal = document.createElement('div');
                                modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                                const modalContent = document.createElement('div');
                                modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                                const header = document.createElement('div');
                                header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                                header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">RoleBinding Details</h3>';

                                const closeBtn = document.createElement('button');
                                closeBtn.innerHTML = '&times;';
                                closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                                closeBtn.onclick = () => modal.remove();
                                header.appendChild(closeBtn);

                                const pre = document.createElement('pre');
                                pre.textContent = roleYaml;
                                pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                                const footer = document.createElement('div');
                                footer.style.cssText = 'margin-top: 16px; text-align: right;';

                                const copyBtn = document.createElement('button');
                                copyBtn.textContent = 'Copy';
                                copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                                copyBtn.onclick = () => {
                                  navigator.clipboard.writeText(roleYaml).then(() => alert('Copied to clipboard!'));
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
                              }}
                              aria-label="View YAML"
                              title="View YAML description"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subjects.map((subject, subIdx) => (
                        <tr key={`${idx}-${subIdx}`}>
                          {subIdx === 0 && (
                            <>
                              <td rowSpan={rowSpan}>{binding.roleRef?.kind || "N/A"}</td>
                              <td rowSpan={rowSpan}>{binding.roleRef?.name || "N/A"}</td>
                            </>
                          )}
                          <td>{subject?.kind || "N/A"}</td>
                          <td>{subject?.name || "N/A"}</td>
                          {subIdx === 0 && (
                            <td rowSpan={rowSpan} style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                  className="iconBtn iconBtn-primary"
                                  onClick={async () => {
                                    const roleYaml = await fetchRoleBindingYaml({
                                      subjects: subjects,
                                      roleRef: binding.roleRef,
                                      bindingIndex: idx,
                                    });

                                    const modal = document.createElement('div');
                                    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

                                    const modalContent = document.createElement('div');
                                    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

                                    const header = document.createElement('div');
                                    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
                                    header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">RoleBinding Details</h3>';

                                    const closeBtn = document.createElement('button');
                                    closeBtn.innerHTML = '&times;';
                                    closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
                                    closeBtn.onclick = () => modal.remove();
                                    header.appendChild(closeBtn);

                                    const pre = document.createElement('pre');
                                    pre.textContent = roleYaml;
                                    pre.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;';

                                    const footer = document.createElement('div');
                                    footer.style.cssText = 'margin-top: 16px; text-align: right;';

                                    const copyBtn = document.createElement('button');
                                    copyBtn.textContent = 'Copy';
                                    copyBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;';
                                    copyBtn.onclick = () => {
                                      navigator.clipboard.writeText(roleYaml).then(() => alert('Copied to clipboard!'));
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
                                  }}
                                  aria-label="View YAML"
                                  title="View YAML description"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                                    <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                      No RoleBinding information available
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
