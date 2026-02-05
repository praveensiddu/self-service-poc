function NamespaceDetailsView({ namespace, namespaceName, appname, env, onUpdateNamespaceInfo, readonly, renderHeaderButtons }) {
  if (!namespace) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p className="muted">No namespace data available.</p>
      </div>
    );
  }

  const [editEnabled, setEditEnabled] = React.useState(false);
  const [draftClusters, setDraftClusters] = React.useState("");
  const [draftClustersList, setDraftClustersList] = React.useState([]);
  const [clusterOptions, setClusterOptions] = React.useState([]);
  const [clusterQuery, setClusterQuery] = React.useState("");
  const [clusterPickerOpen, setClusterPickerOpen] = React.useState(false);
  const [draftManagedByArgo, setDraftManagedByArgo] = React.useState(false);
  const [draftNsArgoSyncStrategy, setDraftNsArgoSyncStrategy] = React.useState("auto");
  const [draftNsArgoGitRepoUrl, setDraftNsArgoGitRepoUrl] = React.useState("");
  const [draftEgressNameId, setDraftEgressNameId] = React.useState("");
  const [draftEgressFirewallEntries, setDraftEgressFirewallEntries] = React.useState([]);
  const [draftReqCpu, setDraftReqCpu] = React.useState("");
  const [draftReqMemory, setDraftReqMemory] = React.useState("");
  const [draftLimCpu, setDraftLimCpu] = React.useState("");
  const [draftLimMemory, setDraftLimMemory] = React.useState("");
  const [draftRoleBindingsEntries, setDraftRoleBindingsEntries] = React.useState([]);

  const [roleCatalogByKind, setRoleCatalogByKind] = React.useState({ Role: [], ClusterRole: [] });
  const [roleCatalogError, setRoleCatalogError] = React.useState("");

  React.useEffect(() => {
    // Don't reload draft state if we're in edit mode - this prevents losing unsaved changes
    // when the namespace prop updates (e.g., after a save or external update)
    if (editEnabled) {
      return;
    }

    const initialClusters = Array.isArray(namespace?.clusters) ? namespace.clusters.map(String).join(",") : "";
    setDraftClusters(initialClusters);
    setDraftClustersList(Array.isArray(namespace?.clusters) ? namespace.clusters.map(String) : []);
    setDraftManagedByArgo(Boolean(namespace?.need_argo || namespace?.generate_argo_app));
    setDraftNsArgoSyncStrategy(String(namespace?.argocd_sync_strategy || "auto") || "auto");
    setDraftNsArgoGitRepoUrl(String(namespace?.gitrepourl || ""));
    setDraftEgressNameId(namespace?.egress_nameid == null ? "" : String(namespace.egress_nameid));
    setDraftReqCpu(namespace?.resources?.requests?.cpu == null ? "" : String(namespace.resources.requests.cpu));
    setDraftReqMemory(namespace?.resources?.requests?.memory == null ? "" : String(namespace.resources.requests.memory));
    setDraftLimCpu(namespace?.resources?.limits?.cpu == null ? "" : String(namespace.resources.limits.cpu));
    setDraftLimMemory(namespace?.resources?.limits?.memory == null ? "" : String(namespace.resources.limits.memory));

    // Initialize RoleBindings draft values
    // Backend returns array of bindings with subjects array in each
    let rolebindingsEntries = [];

    if (Array.isArray(namespace?.rolebindings)) {
      rolebindingsEntries = namespace.rolebindings.map(binding => {
        // Handle both new format (subjects array) and legacy format (single subject)
        let subjects = [];
        if (Array.isArray(binding.subjects)) {
          subjects = binding.subjects.map(s => ({
            kind: s?.kind || "User",
            name: s?.name || ""
          }));
        } else if (binding.subject) {
          // Legacy support: convert single subject to array
          subjects = [{
            kind: binding.subject?.kind || "User",
            name: binding.subject?.name || ""
          }];
        }

        return {
          subjects: subjects.length > 0 ? subjects : [{ kind: "User", name: "" }],
          roleRef: {
            kind: binding.roleRef?.kind || "ClusterRole",
            name: binding.roleRef?.name || ""
          }
        };
      });
    }

    setDraftRoleBindingsEntries(rolebindingsEntries);

    let egressFirewallEntries = [];
    if (Array.isArray(namespace?.egress_firewall_rules)) {
      egressFirewallEntries = namespace.egress_firewall_rules
        .filter((r) => r && typeof r === "object")
        .map((r) => ({
          egressType: String(r.egressType || "dnsName"),
          egressValue: String(r.egressValue || ""),
          ports: Array.isArray(r.ports)
            ? r.ports
              .filter((p) => p && typeof p === "object")
              .map((p) => ({ protocol: String(p.protocol || ""), port: p.port == null ? "" : String(p.port) }))
            : [],
        }));
    }
    setDraftEgressFirewallEntries(egressFirewallEntries);
  }, [namespace, namespaceName, editEnabled]);

  React.useEffect(() => {
    let mounted = true;
    async function loadClusters() {
      try {
        if (!editEnabled) return;
        if (!env || !appname) return;
        const res = await fetch(
          `/api/clusters?env=${encodeURIComponent(env)}&app=${encodeURIComponent(appname)}`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status} ${res.statusText}: ${text}`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data.map(String) : [];
        if (!mounted) return;
        setClusterOptions(list);
      } catch {
        if (!mounted) return;
        setClusterOptions([]);
      }
    }
    loadClusters();
    return () => {
      mounted = false;
    };
  }, [editEnabled, env, appname]);

  React.useEffect(() => {
    let mounted = true;

    async function loadRoleCatalogs() {
      try {
        if (!editEnabled) return;
        setRoleCatalogError("");

        const [rolesRes, clusterRolesRes] = await Promise.all([
          fetch("/api/catalog/role_refs?kind=Role", { headers: { Accept: "application/json" } }),
          fetch("/api/catalog/role_refs?kind=ClusterRole", { headers: { Accept: "application/json" } }),
        ]);

        const parseList = async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data.map(String) : [];
        };

        const [roles, clusterRoles] = await Promise.all([parseList(rolesRes), parseList(clusterRolesRes)]);
        if (!mounted) return;
        setRoleCatalogByKind({ Role: roles, ClusterRole: clusterRoles });
      } catch (e) {
        if (!mounted) return;
        setRoleCatalogByKind({ Role: [], ClusterRole: [] });
        setRoleCatalogError(e?.message || String(e));
      }
    }

    loadRoleCatalogs();
    return () => {
      mounted = false;
    };
  }, [editEnabled]);

  async function fetchRoleBindingYaml({ subjects, roleRef, bindingIndex }) {
    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    const nsKey = String(namespaceName || "").trim();
    if (!envKey || !appKey || !nsKey) throw new Error("Missing env/app/namespace");

    const resp = await fetch(
      `/api/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/rolebindings/rolebinding_yaml?env=${encodeURIComponent(envKey)}`,
      {
        method: "POST",
        headers: { Accept: "text/yaml", "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: Array.isArray(subjects)
            ? subjects.map(s => ({
                kind: s?.kind || "",
                name: s?.name || "",
              }))
            : [],
          roleRef: {
            kind: roleRef?.kind || "",
            name: roleRef?.name || "",
          },
          binding_index: typeof bindingIndex === "number" ? bindingIndex : 0,
        }),
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
    }

    return await resp.text();
  }

  async function fetchEgressFirewallYaml(rules) {
    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    const nsKey = String(namespaceName || "").trim();
    if (!envKey || !appKey || !nsKey) throw new Error("Missing env/app/namespace");

    const resp = await fetch(
      `/api/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/egressfirewall/egressfirewall_yaml?env=${encodeURIComponent(envKey)}`,
      {
        method: "POST",
        headers: { Accept: "text/yaml", "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
    }

    return await resp.text();
  }

  async function fetchCurrentEgressFirewallRules() {
    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    const nsKey = String(namespaceName || "").trim();
    if (!envKey || !appKey || !nsKey) throw new Error("Missing env/app/namespace");

    const resp = await fetch(
      `/api/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/egressfirewall?env=${encodeURIComponent(envKey)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
    }

    const data = await resp.json();
    return Array.isArray(data.rules) ? data.rules : [];
  }

  async function previewEgressFirewallWithDraft() {
    try {
      // Fetch current saved rules from backend
      const currentRules = await fetchCurrentEgressFirewallRules();

      // Format draft entries
      const draftRules = draftEgressFirewallEntries
        .filter((r) => r && typeof r === "object")
        .map((r) => ({
          egressType: String(r.egressType || "dnsName"),
          egressValue: String(r.egressValue || ""),
          ports: Array.isArray(r.ports)
            ? r.ports
              .filter((p) => p && typeof p === "object")
              .map((p) => ({
                protocol: String(p.protocol || ""),
                port: p.port == null ? "" : String(p.port)
              }))
            : [],
        }));

      // Merge: current rules + draft rules (draft rules will be the final version)
      // Since we're replacing, we'll just use draft rules if they exist, otherwise current
      const mergedRules = draftRules.length > 0 ? draftRules : currentRules;

      // Generate YAML from merged rules
      const egressYaml = await fetchEgressFirewallYaml(mergedRules);

      // Show modal with preview
      const modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

      const modalContent = document.createElement('div');
      modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);';

      const header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
      header.innerHTML = '<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #ff8c00;">EgressFirewall Preview (Draft)</h3>';

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
      closeBtn.onclick = () => modal.remove();
      header.appendChild(closeBtn);

      const infoBox = document.createElement('div');
      infoBox.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #856404;';
      infoBox.innerHTML = '<strong>Preview Mode:</strong> This shows how the final EgressFirewall will look with your current changes. Save to apply these changes.';

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
      modalContent.appendChild(infoBox);
      modalContent.appendChild(pre);
      modalContent.appendChild(footer);
      modal.appendChild(modalContent);

      document.body.appendChild(modal);
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    } catch (err) {
      alert('Failed to generate preview: ' + String(err.message || err));
    }
  }

  function addCluster(name) {
    const v = String(name || "").trim();
    if (!v) return;
    setDraftClustersList((prev) => {
      const exists = (prev || []).some((x) => String(x).toLowerCase() === v.toLowerCase());
      const next = exists ? (prev || []) : [...(prev || []), v];
      setDraftClusters(next.join(","));
      return next;
    });
    setClusterQuery("");
    setClusterPickerOpen(true);
  }

  function removeCluster(name) {
    const v = String(name || "").trim();
    if (!v) return;
    setDraftClustersList((prev) => {
      const next = (prev || []).filter((x) => String(x).toLowerCase() !== v.toLowerCase());
      setDraftClusters(next.join(","));
      return next;
    });
  }

  const filteredClusterOptions = (clusterOptions || [])
    .filter((c) => !draftClustersList.some((x) => String(x).toLowerCase() === String(c).toLowerCase()))
    .filter((c) => {
      const q = String(clusterQuery || "").trim().toLowerCase();
      if (!q) return true;
      return String(c || "").toLowerCase().includes(q);
    })
    .slice(0, 100);

  // Helper function to format values
  function formatValue(val) {
    if (val === null || val === undefined) return "N/A";
    if (Array.isArray(val)) return val.join(", ") || "None";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  }

  const effectiveClusters = editEnabled
    ? (draftClustersList || [])
        .map((s) => String(s).trim())
        .filter(Boolean)
    : Array.isArray(namespace?.clusters)
      ? namespace.clusters
      : [];

  const effectiveNamespace = editEnabled
    ? {
        ...namespace,
        clusters: effectiveClusters,
        egress_nameid: draftEgressNameId ? draftEgressNameId : null,
        need_argo: Boolean(draftManagedByArgo),
        argocd_sync_strategy: String(draftNsArgoSyncStrategy || "auto") || "auto",
        gitrepourl: String(draftNsArgoGitRepoUrl || ""),
        generate_argo_app: false,
        status: Boolean(draftManagedByArgo) ? "Argo used" : "Argo not used",
        resources: {
          ...(namespace?.resources || {}),
          requests: {
            ...(namespace?.resources?.requests || {}),
            cpu: (draftReqCpu || "").trim(),
            memory: (draftReqMemory || "").trim(),
          },
          limits: {
            ...(namespace?.resources?.limits || {}),
            cpu: (draftLimCpu || "").trim(),
            memory: (draftLimMemory || "").trim(),
          },
        },
      }
    : namespace;

  const clusters = formatValue(effectiveNamespace?.clusters);
  const egressNameId = formatValue(effectiveNamespace?.egress_nameid);
  const podBasedEgress = effectiveNamespace?.enable_pod_based_egress_ip ? "Enabled" : "Disabled";

  // Use draft egress firewall entries for BOTH edit and view mode
  // This ensures view mode shows the most recent saved data
  const egressFirewallRules = draftEgressFirewallEntries;

  const managedByArgo = effectiveNamespace?.need_argo || effectiveNamespace?.generate_argo_app ? "Yes" : "No";

  // Extract detailed attributes
  const status = effectiveNamespace?.status || {};
  const resources = effectiveNamespace?.resources || {};
  const rolebindings = effectiveNamespace?.rolebindings || {};

  // Notify parent about header buttons
  React.useEffect(() => {
    if (typeof renderHeaderButtons === 'function' && !readonly) {
      renderHeaderButtons(
        !editEnabled ? (
          <button className="btn btn-primary" type="button" onClick={() => {
            // Reload draft states from current namespace prop
            const initialClusters = Array.isArray(namespace?.clusters) ? namespace.clusters.map(String).join(",") : "";
            setDraftClusters(initialClusters);
            setDraftClustersList(Array.isArray(namespace?.clusters) ? namespace.clusters.map(String) : []);
            setClusterQuery("");
            setClusterPickerOpen(false);
            setDraftManagedByArgo(Boolean(namespace?.need_argo || namespace?.generate_argo_app));
            setDraftNsArgoSyncStrategy(String(namespace?.argocd_sync_strategy || "auto") || "auto");
            setDraftNsArgoGitRepoUrl(String(namespace?.gitrepourl || ""));
            setDraftEgressNameId(namespace?.egress_nameid == null ? "" : String(namespace.egress_nameid));
            setDraftReqCpu(namespace?.resources?.requests?.cpu == null ? "" : String(namespace.resources.requests.cpu));
            setDraftReqMemory(namespace?.resources?.requests?.memory == null ? "" : String(namespace.resources.requests.memory));
            setDraftLimCpu(namespace?.resources?.limits?.cpu == null ? "" : String(namespace.resources.limits.cpu));
            setDraftLimMemory(namespace?.resources?.limits?.memory == null ? "" : String(namespace.resources.limits.memory));

            let rolebindingsEntries = [];
            if (Array.isArray(namespace?.rolebindings)) {
              rolebindingsEntries = namespace.rolebindings.map(binding => {
                let subjects = [];
                if (Array.isArray(binding.subjects)) {
                  subjects = binding.subjects.map(s => ({
                    kind: s?.kind || "User",
                    name: s?.name || ""
                  }));
                } else if (binding.subject) {
                  subjects = [{
                    kind: binding.subject?.kind || "User",
                    name: binding.subject?.name || ""
                  }];
                }
                return {
                  subjects: subjects.length > 0 ? subjects : [{ kind: "User", name: "" }],
                  roleRef: {
                    kind: binding.roleRef?.kind || "ClusterRole",
                    name: binding.roleRef?.name || ""
                  }
                };
              });
            }
            setDraftRoleBindingsEntries(rolebindingsEntries);

            let egressFirewallEntries = [];
            if (Array.isArray(namespace?.egress_firewall_rules)) {
              egressFirewallEntries = namespace.egress_firewall_rules
                .filter((r) => r && typeof r === "object")
                .map((r) => ({
                  egressType: String(r.egressType || "dnsName"),
                  egressValue: String(r.egressValue || ""),
                  ports: Array.isArray(r.ports)
                    ? r.ports
                      .filter((p) => p && typeof p === "object")
                      .map((p) => ({ protocol: String(p.protocol || ""), port: p.port == null ? "" : String(p.port) }))
                    : [],
                }));
            }
            setDraftEgressFirewallEntries(egressFirewallEntries);

            setEditEnabled(true);
          }}>
            Enable Edit
          </button>
        ) : (
          <>
            <button
              className="btn"
              type="button"
              onClick={() => {
                const initialClusters = Array.isArray(namespace?.clusters) ? namespace.clusters.map(String).join(",") : "";
                setDraftClusters(initialClusters);
                setDraftClustersList(Array.isArray(namespace?.clusters) ? namespace.clusters.map(String) : []);
                setClusterQuery("");
                setClusterPickerOpen(false);
                setDraftManagedByArgo(Boolean(namespace?.need_argo || namespace?.generate_argo_app));
                setDraftNsArgoSyncStrategy(String(namespace?.argocd_sync_strategy || "auto") || "auto");
                setDraftNsArgoGitRepoUrl(String(namespace?.gitrepourl || ""));
                setDraftEgressNameId(namespace?.egress_nameid == null ? "" : String(namespace.egress_nameid));
                setDraftReqCpu(namespace?.resources?.requests?.cpu == null ? "" : String(namespace.resources.requests.cpu));
                setDraftReqMemory(namespace?.resources?.requests?.memory == null ? "" : String(namespace.resources.requests.memory));
                setDraftLimCpu(namespace?.resources?.limits?.cpu == null ? "" : String(namespace.resources.limits.cpu));
                setDraftLimMemory(namespace?.resources?.limits?.memory == null ? "" : String(namespace.resources.limits.memory));

                let rolebindingsEntries = [];
                if (Array.isArray(namespace?.rolebindings)) {
                  rolebindingsEntries = namespace.rolebindings.map(binding => {
                    let subjects = [];
                    if (Array.isArray(binding.subjects)) {
                      subjects = binding.subjects.map(s => ({
                        kind: s?.kind || "User",
                        name: s?.name || ""
                      }));
                    } else if (binding.subject) {
                      subjects = [{
                        kind: binding.subject?.kind || "User",
                        name: binding.subject?.name || ""
                      }];
                    }
                    return {
                      subjects: subjects.length > 0 ? subjects : [{ kind: "User", name: "" }],
                      roleRef: {
                        kind: binding.roleRef?.kind || "ClusterRole",
                        name: binding.roleRef?.name || ""
                      }
                    };
                  });
                }
                setDraftRoleBindingsEntries(rolebindingsEntries);

                let egressFirewallEntries = [];
                if (Array.isArray(namespace?.egress_firewall_rules)) {
                  egressFirewallEntries = namespace.egress_firewall_rules
                    .filter((r) => r && typeof r === "object")
                    .map((r) => ({
                      egressType: String(r.egressType || "dnsName"),
                      egressValue: String(r.egressValue || ""),
                      ports: Array.isArray(r.ports)
                        ? r.ports
                          .filter((p) => p && typeof p === "object")
                          .map((p) => ({ protocol: String(p.protocol || ""), port: p.port == null ? "" : String(p.port) }))
                        : [],
                    }));
                }
                setDraftEgressFirewallEntries(egressFirewallEntries);
                setEditEnabled(false);
              }}
            >
              Discard Edits
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                if (typeof onUpdateNamespaceInfo !== "function") {
                  setEditEnabled(false);
                  return;
                }
                try {
                  const clusters = (draftClustersList || []).map((s) => String(s).trim()).filter(Boolean);
                  const egress_nameid = (draftEgressNameId || "").trim();

                  await onUpdateNamespaceInfo(namespaceName, {
                    clusters: { clusters },
                    egress_ip: { egress_nameid, enable_pod_based_egress_ip: Boolean(namespace?.enable_pod_based_egress_ip) },
                    status: Boolean(draftManagedByArgo) ? "Argo used" : "Argo not used",
                    nsargocd: {
                      need_argo: Boolean(draftManagedByArgo),
                      argocd_sync_strategy: String(draftNsArgoSyncStrategy || "").trim(),
                      gitrepourl: String(draftNsArgoGitRepoUrl || "").trim(),
                    },
                    resources: {
                      requests: { cpu: (draftReqCpu || "").trim(), memory: (draftReqMemory || "").trim() },
                      limits: { cpu: (draftLimCpu || "").trim(), memory: (draftLimMemory || "").trim() },
                    },
                    rolebindings: {
                      bindings: draftRoleBindingsEntries.map(entry => ({
                        subjects: Array.isArray(entry.subjects)
                          ? entry.subjects
                              .filter(s => (s?.kind && String(s.kind).trim()) || (s?.name && String(s.name).trim()))
                              .map(s => ({ kind: s?.kind || "User", name: s?.name || "" }))
                          : [],
                        roleRef: { kind: entry.roleRef?.kind || "ClusterRole", name: entry.roleRef?.name || "" }
                      })).filter(binding => binding.subjects.length > 0)
                    },
                    egressfirewall: {
                      rules: draftEgressFirewallEntries
                        .map((r) => ({
                          egressType: String(r.egressType || "").trim(),
                          egressValue: String(r.egressValue || "").trim(),
                          ports: String(r.egressType || "").trim() === "cidrSelector"
                            ? (Array.isArray(r.ports) ? r.ports : [])
                              .filter((p) => {
                                const portValue = p.port === "" || p.port == null ? "" : String(p.port).trim();
                                return p.protocol && portValue !== "" && !isNaN(Number(portValue));
                              })
                              .map((p) => ({
                                protocol: String(p.protocol || "").trim(),
                                port: Number(p.port)
                              }))
                            : undefined,
                        }))
                        .filter((r) => r.egressType && r.egressValue)
                    },
                  });

                  setEditEnabled(false);
                } catch (error) {
                  const errorMessage = error?.message || String(error);
                  alert(`Failed to save changes:\n\n${errorMessage}`);
                }
              }}
            >
              Submit
            </button>
          </>
        )
      );
    }
    return () => {
      if (typeof renderHeaderButtons === 'function') {
        renderHeaderButtons(null);
      }
    };
  }, [
    editEnabled,
    readonly,
    renderHeaderButtons,
    namespace,
    namespaceName,
    // Add all draft states so Submit button always has latest values
    draftEgressFirewallEntries,
    draftRoleBindingsEntries,
    draftClustersList,
    draftManagedByArgo,
    draftNsArgoSyncStrategy,
    draftNsArgoGitRepoUrl,
    draftEgressNameId,
    draftReqCpu,
    draftReqMemory,
    draftLimCpu,
    draftLimMemory
  ]);

  return (
    <div>
      {/* Overview Cards Grid */}
      <div className="dashboardGrid" style={{ marginTop: '12px' }}>
        {/* Basic Information Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            <h3>Basic Information</h3>
          </div>
          <div className="dashboardCardBody">
            <div className="detailRow">
              <span className="detailLabel">Clusters:</span>
              {editEnabled ? (
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
              {editEnabled ? (
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
              {editEnabled ? (
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
              {editEnabled ? (
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

        {/* Egress Configuration Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path fillRule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.854 10.803a.5.5 0 1 1-.708-.707L9.243 6H6.475a.5.5 0 1 1 0-1h3.975a.5.5 0 0 1 .5.5v3.975a.5.5 0 1 1-1 0V6.707l-4.096 4.096z"/>
            </svg>
            <h3>Egress Configuration</h3>
          </div>
          <div className="dashboardCardBody">
            <div className="detailRow">
              <span className="detailLabel">Egress Name ID:</span>
              {editEnabled ? (
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
              <span className={`detailBadge ${podBasedEgress === 'Enabled' ? 'detailBadgeSuccess' : 'detailBadgeWarning'}`}>
                {podBasedEgress}
              </span>
            </div>
          </div>
        </div>

        {/* Resources Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
            </svg>
            <h3>Resources</h3>
          </div>
          <div className="dashboardCardBody">
            {editEnabled ? (
              <div>
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>ResourceQuota</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>CPU:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqCpu} onChange={(e) => setDraftReqCpu(e.target.value)} placeholder="e.g., 100m" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>Memory:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftReqMemory} onChange={(e) => setDraftReqMemory(e.target.value)} placeholder="e.g., 128Mi" />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>LimitRange</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>CPU:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimCpu} onChange={(e) => setDraftLimCpu(e.target.value)} placeholder="e.g., 500m" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="attributeKey" style={{ minWidth: '80px' }}>Memory:</span>
                    <input className="filterInput" style={{ flex: 1 }} value={draftLimMemory} onChange={(e) => setDraftLimMemory(e.target.value)} placeholder="e.g., 512Mi" />
                  </div>
                </div>
              </div>
            ) : Object.keys(resources).length > 0 ? (
              <div>
                {resources.requests && (
                  <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>ResourceQuota</h4>
                      <button
                        className="iconBtn iconBtn-primary"
                        onClick={() => {
                          const cpu = resources.requests?.cpu || "0";
                          const memory = resources.requests?.memory || "0";
                          const resourceQuotaYaml = `apiVersion: v1\nkind: ResourceQuota\nmetadata:\n  name: ${namespaceName}-quota\n  namespace: ${namespaceName}\nspec:\n  hard:\n    requests.cpu: "${cpu}"\n    requests.memory: "${memory}"`;
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
                        }}
                        aria-label="View YAML"
                        title="View ResourceQuota YAML definition"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                          <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                      </button>
                    </div>
                    {Object.entries(resources.requests).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="attributeKey" style={{ minWidth: '80px' }}>{key}:</span>
                        <span className="attributeValue">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {resources.limits && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#495057' }}>LimitRange</h4>
                      <button
                        className="iconBtn iconBtn-primary"
                        onClick={() => {
                          const cpu = resources.limits?.cpu || "0";
                          const memory = resources.limits?.memory || "0";
                          const limitRangeYaml = `apiVersion: v1\nkind: LimitRange\nmetadata:\n  name: ${namespaceName}-limitrange\n  namespace: ${namespaceName}\nspec:\n  limits:\n  - max:\n      cpu: "${cpu}"\n      memory: "${memory}"\n    type: Container`;
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
                        }}
                        aria-label="View YAML"
                        title="View LimitRange YAML definition"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                          <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                      </button>
                    </div>
                    {Object.entries(resources.limits).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="attributeKey" style={{ minWidth: '80px' }}>{key}:</span>
                        <span className="attributeValue">{formatValue(value)}</span>
                      </div>
                    ))}
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
      </div>

      {/* Detailed Attributes Section */}
      <div className="dashboardGrid" style={{ marginTop: '20px' }}>

        {/* Role Binding Card - Takes 2/3 width */}
        <div className="dashboardCard" style={{ gridColumn: 'span 2' }}>
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
            </svg>
            <h3>Role Bindings</h3>
            {editEnabled && (
              <button
                className="btn btn-primary"
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setDraftRoleBindingsEntries([...draftRoleBindingsEntries, {
                    subjects: [{ kind: "User", name: "" }],
                    roleRef: { kind: "ClusterRole", name: "" }
                  }]);
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
                  {editEnabled ? (
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
                          // Empty subjects case
                          <tr key={idx}>
                            <td>
                              <select
                                className="filterInput"
                                value={entry.roleRef?.kind || "ClusterRole"}
                                onChange={(e) => {
                                  const updated = [...draftRoleBindingsEntries];
                                  updated[idx] = {
                                    ...updated[idx],
                                    roleRef: { ...updated[idx].roleRef, kind: e.target.value, name: "" }
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
                                    roleRef: { ...updated[idx].roleRef, name: e.target.value }
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
                                    <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                                    <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
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
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          // Render subjects with rowspan
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
                                          roleRef: { ...updated[idx].roleRef, kind: e.target.value, name: "" }
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
                                          roleRef: { ...updated[idx].roleRef, name: e.target.value }
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
                                        kind: e.target.value
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
                                        name: e.target.value
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
                                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
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
                                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
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
                                        <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                                        <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
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
                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
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
                        // Handle both old format (single subject) and new format (subjects array)
                        let subjects = [];
                        if (Array.isArray(binding.subjects)) {
                          subjects = binding.subjects;
                        } else if (binding.subject) {
                          // Legacy support: convert single subject to array
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
                                    <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                                    <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
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
                                        <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                                        <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
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

        <div className="dashboardCard" style={{ gridColumn: 'span 2' }}>
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path fillRule="evenodd" d="M2.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-11zM3 2h10v12H3V2zm2 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 4.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 6.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8.5z"/>
            </svg>
            <h3>Egress Firewall</h3>
            {editEnabled && draftEgressFirewallEntries.length > 0 && (
              <button
                className="iconBtn iconBtn-warning"
                style={{ marginLeft: 'auto' }}
                onClick={previewEgressFirewallWithDraft}
                aria-label="Preview YAML"
                title="Preview EgressFirewall YAML with current draft changes"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                  <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                </svg>
              </button>
            )}
            {!editEnabled && egressFirewallRules.length > 0 && (
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
                  <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                  <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                </svg>
              </button>
            )}
          </div>
          <div className="dashboardCardBody">
            {editEnabled ? (
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* DNS Names Table - Left Side (40%) */}
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
                                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
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

                {/* CIDR Blocks Table - Right Side (60%) */}
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
                                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
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
                                                const ports = Array.isArray(updated[idx].ports) ? updated[idx].ports.filter((_, i) => i !== pidx) : [];
                                                updated[idx] = { ...updated[idx], ports };
                                                setDraftEgressFirewallEntries(updated);
                                              }}
                                              aria-label="Delete port"
                                              title="Delete port"
                                              style={{ padding: '4px', minWidth: '24px' }}
                                            >
                                              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
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
                                                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
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
                                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
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
                {/* DNS Names Table - Left Side (40%) */}
                <div style={{ flex: '0 0 40%', minWidth: 0 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#495057', marginBottom: '12px', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}>
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

                {/* CIDR Blocks Table - Right Side (60%) */}
                <div style={{ flex: '0 0 calc(60% - 8px)', minWidth: 0 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#495057', marginBottom: '12px', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}>
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

      </div>

    </div>
  );
}
