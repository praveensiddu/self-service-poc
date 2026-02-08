function NamespaceDetailsView({ namespace, namespaceName, appname, env, onUpdateNamespaceInfo, readonly, renderHeaderButtons }) {
  if (!namespace) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p className="muted">No namespace data available.</p>
      </div>
    );
  }

  const [editBlock, setEditBlock] = React.useState(null);
  const [draftBasic, setDraftBasic] = React.useState({
    clustersList: [],
    managedByArgo: false,
    nsArgoSyncStrategy: "auto",
    nsArgoGitRepoUrl: "",
  });

  const [clusterOptions, setClusterOptions] = React.useState([]);
  const [clusterQuery, setClusterQuery] = React.useState("");
  const [clusterPickerOpen, setClusterPickerOpen] = React.useState(false);

  const [draftEgress, setDraftEgress] = React.useState({
    egressNameId: "",
    enablePodBasedEgressIp: false,
  });

  const [draftEgressFirewallEntries, setDraftEgressFirewallEntries] = React.useState([]);

  const [draftResources, setDraftResources] = React.useState({
    requests: { cpu: "", memory: "", "ephemeral-storage": "" },
    quota_limits: { memory: "", "ephemeral-storage": "" },
    limits: {
      cpu: "",
      memory: "",
      "ephemeral-storage": "",
      default: { cpu: "", memory: "", "ephemeral-storage": "" },
    },
  });

  const [draftRoleBindingsEntries, setDraftRoleBindingsEntries] = React.useState([]);

  const [roleCatalogByKind, setRoleCatalogByKind] = React.useState({ Role: [], ClusterRole: [] });
  const [roleCatalogError, setRoleCatalogError] = React.useState("");

  const editEnabled = Boolean(editBlock);

  const isEditingBasic = editBlock === "basic";
  const isEditingEgress = editBlock === "egress";
  const isEditingRoleBindings = editBlock === "rolebindings";
  const isEditingEgressFirewall = editBlock === "egressfirewall";
  const isEditingResourceQuota = editBlock === "resourcequota";
  const isEditingLimitRange = editBlock === "limitrange";

  function canStartEditing(block) {
    if (readonly) return false;
    if (!editBlock) return true;
    return editBlock === block;
  }

  function onEnableBlockEdit(block) {
    if (!canStartEditing(block)) return;
    resetDraftFromNamespace();
    setEditBlock(block);
  }

  function onDiscardBlockEdits() {
    resetDraftFromNamespace();
    setEditBlock(null);
  }

  async function onSaveBlock(block) {
    if (typeof onUpdateNamespaceInfo !== "function") {
      setEditBlock(null);
      return;
    }
    try {
      if (block === "basic") {
        const clusters = (draftBasic?.clustersList || []).map((s) => String(s).trim()).filter(Boolean);
        const needArgo = Boolean(draftBasic?.managedByArgo);
        const nsargocd = {
          argocd_sync_strategy: String(draftBasic?.nsArgoSyncStrategy || "").trim(),
          gitrepourl: String(draftBasic?.nsArgoGitRepoUrl || "").trim(),
        };
        await onUpdateNamespaceInfo(namespaceName, {
          namespace_info: {
            clusters,
            need_argo: needArgo,
          },
          nsargocd,
        });
      } else if (block === "egress") {
        const egress_nameid = (draftEgress?.egressNameId || "").trim();
        await onUpdateNamespaceInfo(namespaceName, {
          namespace_info: {
            egress_nameid: egress_nameid ? egress_nameid : null,
            enable_pod_based_egress_ip: Boolean(draftEgress?.enablePodBasedEgressIp),
          },
        });
      } else if (block === "rolebindings") {
        const bindings = (draftRoleBindingsEntries || [])
          .map((entry) => ({
            subjects: Array.isArray(entry?.subjects)
              ? entry.subjects
                  .filter((s) => (s?.kind && String(s.kind).trim()) || (s?.name && String(s.name).trim()))
                  .map((s) => ({ kind: s?.kind || "User", name: s?.name || "" }))
              : [],
            roleRef: {
              kind: entry?.roleRef?.kind || "ClusterRole",
              name: entry?.roleRef?.name || "",
            },
          }))
          .filter((b) => Array.isArray(b.subjects) && b.subjects.length > 0);

        await onUpdateNamespaceInfo(namespaceName, {
          rolebindings: {
            bindings,
          },
        });
      } else if (block === "egressfirewall") {
        const rules = (draftEgressFirewallEntries || [])
          .map((r) => ({
            egressType: String(r?.egressType || "").trim(),
            egressValue: String(r?.egressValue || "").trim(),
            ports: String(r?.egressType || "").trim() === "cidrSelector"
              ? (Array.isArray(r?.ports) ? r.ports : [])
                  .filter((p) => {
                    const portValue = p?.port === "" || p?.port == null ? "" : String(p.port).trim();
                    return p?.protocol && portValue !== "" && !isNaN(Number(portValue));
                  })
                  .map((p) => ({
                    protocol: String(p?.protocol || "").trim(),
                    port: Number(p.port),
                  }))
              : undefined,
          }))
          .filter((r) => r.egressType && r.egressValue);

        await onUpdateNamespaceInfo(namespaceName, {
          egressfirewall: {
            rules,
          },
        });
      } else if (block === "resourcequota") {
        const nextRequests = {
          cpu: String(draftResources?.requests?.cpu || "").trim(),
          memory: String(draftResources?.requests?.memory || "").trim(),
          "ephemeral-storage": String(draftResources?.requests?.["ephemeral-storage"] || "").trim(),
        };
        const nextQuotaLimits = {
          memory: String(draftResources?.quota_limits?.memory || "").trim(),
          "ephemeral-storage": String(draftResources?.quota_limits?.["ephemeral-storage"] || "").trim(),
        };
        await onUpdateNamespaceInfo(namespaceName, {
          resources: {
            requests: nextRequests,
            quota_limits: nextQuotaLimits,
          },
        });
      } else if (block === "limitrange") {
        const nextLimits = {
          cpu: String(draftResources?.limits?.cpu || "").trim(),
          memory: String(draftResources?.limits?.memory || "").trim(),
          "ephemeral-storage": String(draftResources?.limits?.["ephemeral-storage"] || "").trim(),
          default: {
            cpu: String(draftResources?.limits?.default?.cpu || "").trim(),
            memory: String(draftResources?.limits?.default?.memory || "").trim(),
            "ephemeral-storage": String(draftResources?.limits?.default?.["ephemeral-storage"] || "").trim(),
          },
        };
        await onUpdateNamespaceInfo(namespaceName, {
          resources: {
            limits: nextLimits,
          },
        });
      }

      setEditBlock(null);
    } catch (error) {
      const errorMessage = error?.message || String(error);
      alert(`Failed to save changes:\n\n${errorMessage}`);
    }
  }

  function resetDraftFromNamespace() {
    setClusterQuery("");
    setClusterPickerOpen(false);

    setDraftBasic({
      clustersList: Array.isArray(namespace?.clusters) ? namespace.clusters.map(String) : [],
      managedByArgo: Boolean(namespace?.need_argo || namespace?.generate_argo_app),
      nsArgoSyncStrategy: String(namespace?.argocd_sync_strategy || "auto") || "auto",
      nsArgoGitRepoUrl: String(namespace?.gitrepourl || ""),
    });

    setDraftEgress({
      egressNameId: namespace?.egress_nameid == null ? "" : String(namespace.egress_nameid),
      enablePodBasedEgressIp: Boolean(namespace?.enable_pod_based_egress_ip),
    });

    setDraftResources({
      requests: {
        cpu: namespace?.resources?.requests?.cpu == null ? "" : String(namespace.resources.requests.cpu),
        memory: namespace?.resources?.requests?.memory == null ? "" : String(namespace.resources.requests.memory),
        "ephemeral-storage": namespace?.resources?.requests?.["ephemeral-storage"] == null
          ? ""
          : String(namespace.resources.requests["ephemeral-storage"]),
      },
      quota_limits: {
        memory: namespace?.resources?.quota_limits?.memory == null ? "" : String(namespace.resources.quota_limits.memory),
        "ephemeral-storage": namespace?.resources?.quota_limits?.["ephemeral-storage"] == null
          ? ""
          : String(namespace.resources.quota_limits["ephemeral-storage"]),
      },
      limits: {
        cpu: namespace?.resources?.limits?.cpu == null ? "" : String(namespace.resources.limits.cpu),
        memory: namespace?.resources?.limits?.memory == null ? "" : String(namespace.resources.limits.memory),
        "ephemeral-storage": namespace?.resources?.limits?.["ephemeral-storage"] == null
          ? ""
          : String(namespace.resources.limits["ephemeral-storage"]),
        default: {
          cpu: namespace?.resources?.limits?.default?.cpu == null ? "" : String(namespace.resources.limits.default.cpu),
          memory: namespace?.resources?.limits?.default?.memory == null ? "" : String(namespace.resources.limits.default.memory),
          "ephemeral-storage": namespace?.resources?.limits?.default?.["ephemeral-storage"] == null
            ? ""
            : String(namespace.resources.limits.default["ephemeral-storage"]),
        },
      },
    });

    let rolebindingsEntries = [];
    if (Array.isArray(namespace?.rolebindings)) {
      rolebindingsEntries = namespace.rolebindings.map(binding => {
        let subjects = [];
        if (Array.isArray(binding.subjects)) {
          subjects = binding.subjects.map(s => ({
            kind: s?.kind || "User",
            name: s?.name || "",
          }));
        } else if (binding.subject) {
          subjects = [{
            kind: binding.subject?.kind || "User",
            name: binding.subject?.name || "",
          }];
        }
        return {
          subjects: subjects.length > 0 ? subjects : [{ kind: "User", name: "" }],
          roleRef: {
            kind: binding.roleRef?.kind || "ClusterRole",
            name: binding.roleRef?.name || "",
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
  }

  React.useEffect(() => {
    // Don't reload draft state if we're in edit mode - this prevents losing unsaved changes
    // when the namespace prop updates (e.g., after a save or external update)
    if (editEnabled) {
      return;
    }
    resetDraftFromNamespace();
  }, [namespace, namespaceName, editEnabled]);

  React.useEffect(() => {
    let mounted = true;
    async function loadClusters() {
      try {
        if (editBlock !== "basic") return;
        if (!env || !appname) return;
        const res = await fetch(
          `/api/v1/clusters?env=${encodeURIComponent(env)}&app=${encodeURIComponent(appname)}`,
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
  }, [editBlock, env, appname]);

  React.useEffect(() => {
    let mounted = true;

    async function loadRoleCatalogs() {
      try {
        if (editBlock !== "rolebindings") return;
        setRoleCatalogError("");

        const envKey = String(env || "").trim();
        const envParam = envKey ? `&env=${encodeURIComponent(envKey)}` : "";

        const [rolesRes, clusterRolesRes] = await Promise.all([
          fetch(`/api/v1/catalog/role_refs?kind=Role${envParam}`, { headers: { Accept: "application/json" } }),
          fetch(`/api/v1/catalog/role_refs?kind=ClusterRole${envParam}`, { headers: { Accept: "application/json" } }),
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
  }, [editBlock, env]);

  async function fetchRoleBindingYaml({ subjects, roleRef, bindingIndex }) {
    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    const nsKey = String(namespaceName || "").trim();
    if (!envKey || !appKey || !nsKey) throw new Error("Missing env/app/namespace");

    const resp = await fetch(
      `/api/v1/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/rolebindings/rolebinding_yaml?env=${encodeURIComponent(envKey)}`,
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

  async function fetchResourceQuotaYaml(resources) {
    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    const nsKey = String(namespaceName || "").trim();
    if (!envKey || !appKey || !nsKey) throw new Error("Missing env/app/namespace");

    const resp = await fetch(
      `/api/v1/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/resources/resourcequota_yaml?env=${encodeURIComponent(envKey)}`,
      {
        method: "POST",
        headers: { Accept: "text/yaml", "Content-Type": "application/json" },
        body: JSON.stringify({ resources }),
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
    }

    return await resp.text();
  }

  async function fetchLimitRangeYaml(resources) {
    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    const nsKey = String(namespaceName || "").trim();
    if (!envKey || !appKey || !nsKey) throw new Error("Missing env/app/namespace");

    const resp = await fetch(
      `/api/v1/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/resources/limitrange_yaml?env=${encodeURIComponent(envKey)}`,
      {
        method: "POST",
        headers: { Accept: "text/yaml", "Content-Type": "application/json" },
        body: JSON.stringify({ resources }),
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
      `/api/v1/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/egressfirewall/egressfirewall_yaml?env=${encodeURIComponent(envKey)}`,
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
      `/api/v1/apps/${encodeURIComponent(appKey)}/namespaces/${encodeURIComponent(nsKey)}/egressfirewall?env=${encodeURIComponent(envKey)}`,
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

  const filteredClusterOptions = (clusterOptions || [])
    .filter((c) => !(draftBasic?.clustersList || []).some((x) => String(x).toLowerCase() === String(c).toLowerCase()))
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

  const effectiveClusters = isEditingBasic
    ? (draftBasic?.clustersList || [])
        .map((s) => String(s).trim())
        .filter(Boolean)
    : Array.isArray(namespace?.clusters)
      ? namespace.clusters
      : [];

  let effectiveNamespace = namespace;
  if (isEditingBasic) {
    effectiveNamespace = {
      ...namespace,
      clusters: effectiveClusters,
      need_argo: Boolean(draftBasic?.managedByArgo),
      argocd_sync_strategy: String(draftBasic?.nsArgoSyncStrategy || "auto") || "auto",
      gitrepourl: String(draftBasic?.nsArgoGitRepoUrl || ""),
      generate_argo_app: false,
      status: Boolean(draftBasic?.managedByArgo) ? "Argo used" : "Argo not used",
    };
  } else if (isEditingEgress) {
    effectiveNamespace = {
      ...namespace,
      egress_nameid: draftEgress?.egressNameId ? draftEgress.egressNameId : null,
      enable_pod_based_egress_ip: Boolean(draftEgress?.enablePodBasedEgressIp),
    };
  } else if (isEditingResourceQuota || isEditingLimitRange) {
    effectiveNamespace = {
      ...namespace,
      resources: {
        ...(namespace?.resources || {}),
        requests: {
          ...(namespace?.resources?.requests || {}),
          cpu: String(draftResources?.requests?.cpu || "").trim(),
          memory: String(draftResources?.requests?.memory || "").trim(),
          "ephemeral-storage": String(draftResources?.requests?.["ephemeral-storage"] || "").trim(),
        },
        quota_limits: {
          memory: String(draftResources?.quota_limits?.memory || "").trim(),
          "ephemeral-storage": String(draftResources?.quota_limits?.["ephemeral-storage"] || "").trim(),
        },
        limits: {
          ...(namespace?.resources?.limits || {}),
          cpu: String(draftResources?.limits?.cpu || "").trim(),
          memory: String(draftResources?.limits?.memory || "").trim(),
          "ephemeral-storage": String(draftResources?.limits?.["ephemeral-storage"] || "").trim(),
          default: {
            cpu: String(draftResources?.limits?.default?.cpu || "").trim(),
            memory: String(draftResources?.limits?.default?.memory || "").trim(),
            "ephemeral-storage": String(draftResources?.limits?.default?.["ephemeral-storage"] || "").trim(),
          },
        },
      },
    };
  }

  const clusters = formatValue(effectiveNamespace?.clusters);
  const egressNameId = formatValue(effectiveNamespace?.egress_nameid);
  const podBasedEgress = effectiveNamespace?.enable_pod_based_egress_ip ? "Enabled" : "Disabled";

  const egressFirewallRules = isEditingEgressFirewall
    ? draftEgressFirewallEntries
    : (Array.isArray(namespace?.egress_firewall_rules) ? namespace.egress_firewall_rules : []);

  const managedByArgo = effectiveNamespace?.need_argo || effectiveNamespace?.generate_argo_app ? "Yes" : "No";

  // Extract detailed attributes
  const status = effectiveNamespace?.status || {};
  const resources = effectiveNamespace?.resources || {};
  const rolebindings = effectiveNamespace?.rolebindings || {};

  // Notify parent about header buttons
  React.useEffect(() => {
    if (typeof renderHeaderButtons === 'function' && !readonly) {
      renderHeaderButtons(null);
    }
    return () => {
      if (typeof renderHeaderButtons === 'function') {
        renderHeaderButtons(null);
      }
    };
  }, [readonly, renderHeaderButtons]);

  function getHeaderProps(blockKey, isEditing) {
    return {
      readonly,
      isEditing,
      blockKey,
      canStartEditing,
      onEnableBlockEdit,
      onDiscardBlockEdits,
      onSaveBlock,
    };
  }

  return (
    <div>
      {/* Overview Cards Grid - Two Column Layout: 3/4 and 1/4 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', marginTop: '12px', alignItems: 'start' }}>
        {/* Left Column - Basic Information, Egress Configuration, and Role Bindings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Row: Basic Information and Egress Configuration side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <NamespaceBasicInfoCard
              header={getHeaderProps("basic", isEditingBasic)}
              clusters={clusters}
              managedByArgo={managedByArgo}
              effectiveNamespace={effectiveNamespace}
              clusterQuery={clusterQuery}
              setClusterQuery={setClusterQuery}
              clusterPickerOpen={clusterPickerOpen}
              setClusterPickerOpen={setClusterPickerOpen}
              filteredClusterOptions={filteredClusterOptions}
              draft={draftBasic}
              setDraft={setDraftBasic}
              formatValue={formatValue}
            />

            <NamespaceEgressConfigCard
              header={getHeaderProps("egress", isEditingEgress)}
              egressNameId={egressNameId}
              podBasedEgress={podBasedEgress}
              draft={draftEgress}
              setDraft={setDraftEgress}
            />
          </div>
          <NamespaceRoleBindingsCard
            header={getHeaderProps("rolebindings", isEditingRoleBindings)}
            draftRoleBindingsEntries={draftRoleBindingsEntries}
            setDraftRoleBindingsEntries={setDraftRoleBindingsEntries}
            roleCatalogByKind={roleCatalogByKind}
            fetchRoleBindingYaml={fetchRoleBindingYaml}
            rolebindings={rolebindings}
          />

          <NamespaceEgressFirewallCard
            header={getHeaderProps("egressfirewall", isEditingEgressFirewall)}
            draftEgressFirewallEntries={draftEgressFirewallEntries}
            setDraftEgressFirewallEntries={setDraftEgressFirewallEntries}
            previewEgressFirewallWithDraft={previewEgressFirewallWithDraft}
            egressFirewallRules={egressFirewallRules}
            fetchEgressFirewallYaml={fetchEgressFirewallYaml}
            formatValue={formatValue}
          />
        </div>

        {/* Right Column - Resources (1/3 width) */}
        <div>
          <NamespaceResourceQuotaCard
            header={getHeaderProps("resourcequota", isEditingResourceQuota)}
            resources={resources}
            formatValue={formatValue}
            draft={draftResources}
            setDraft={setDraftResources}
            fetchResourceQuotaYaml={fetchResourceQuotaYaml}
          />

          <div style={{ height: 16 }} />

          <NamespaceLimitRangeCard
            header={getHeaderProps("limitrange", isEditingLimitRange)}
            resources={resources}
            formatValue={formatValue}
            draft={draftResources}
            setDraft={setDraftResources}
            fetchLimitRangeYaml={fetchLimitRangeYaml}
          />
        </div>
      </div>
    </div>
  );
}
