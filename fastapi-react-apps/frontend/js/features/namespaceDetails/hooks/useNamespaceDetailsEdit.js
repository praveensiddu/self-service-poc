/**
 * useNamespaceDetailsEdit Hook - Manages edit state for namespace details.
 *
 * This hook provides:
 * - Edit mode state management
 * - Draft state for all editable blocks
 * - Draft reset logic
 * - Edit handlers (enable, discard, save)
 */

/**
 * Custom hook for namespace details edit state.
 * @param {Object} params - Hook parameters
 * @param {Object} params.namespace - Namespace data
 * @param {string} params.namespaceName - Namespace name
 * @param {Function} params.onUpdateNamespaceInfo - Update handler
 * @param {boolean} params.readonly - Readonly mode
 * @returns {Object} - Edit state and handlers
 */
function useNamespaceDetailsEdit({ namespace, namespaceName, onUpdateNamespaceInfo, readonly }) {
  // ============================================================================
  // EDIT MODE STATE
  // ============================================================================
  const [editBlock, setEditBlock] = React.useState(null);

  const editEnabled = Boolean(editBlock);
  const isEditingBasic = editBlock === "basic";
  const isEditingEgress = editBlock === "egress";
  const isEditingRoleBindings = editBlock === "rolebindings";
  const isEditingEgressFirewall = editBlock === "egressfirewall";
  const isEditingResourceQuota = editBlock === "resourcequota";
  const isEditingLimitRange = editBlock === "limitrange";

  // ============================================================================
  // DRAFT STATE - Basic Info
  // ============================================================================
  const [draftBasic, setDraftBasic] = React.useState({
    clustersList: [],
    managedByArgo: false,
    nsArgoSyncStrategy: "auto",
    nsArgoGitRepoUrl: "",
  });

  // ============================================================================
  // DRAFT STATE - Egress Config
  // ============================================================================
  const [draftEgress, setDraftEgress] = React.useState({
    egressNameId: "",
    enablePodBasedEgressIp: false,
  });

  // ============================================================================
  // DRAFT STATE - Resources (ResourceQuota & LimitRange)
  // ============================================================================
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

  // ============================================================================
  // DRAFT STATE - Role Bindings
  // ============================================================================
  const [draftRoleBindingsEntries, setDraftRoleBindingsEntries] = React.useState([]);

  // ============================================================================
  // DRAFT STATE - Egress Firewall
  // ============================================================================
  const [draftEgressFirewallEntries, setDraftEgressFirewallEntries] = React.useState([]);

  // ============================================================================
  // DRAFT RESET LOGIC
  // ============================================================================

  /**
   * Reset draft state from namespace data.
   */
  const resetDraftFromNamespace = React.useCallback(() => {
    // Reset Basic Info draft
    setDraftBasic({
      clustersList: Array.isArray(namespace?.clusters) ? namespace.clusters.map(String) : [],
      managedByArgo: Boolean(namespace?.need_argo || namespace?.generate_argo_app),
      nsArgoSyncStrategy: String(namespace?.argocd_sync_strategy || "auto") || "auto",
      nsArgoGitRepoUrl: String(namespace?.gitrepourl || ""),
    });

    // Reset Egress Config draft
    setDraftEgress({
      egressNameId: namespace?.egress_nameid == null ? "" : String(namespace.egress_nameid),
      enablePodBasedEgressIp: Boolean(namespace?.enable_pod_based_egress_ip),
    });

    // Reset Resources draft
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

    // Reset Role Bindings draft
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

    // Reset Egress Firewall draft
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
  }, [namespace]);

  // ============================================================================
  // EDIT HANDLERS
  // ============================================================================

  /**
   * Check if a block can start editing.
   */
  const canStartEditing = React.useCallback((block) => {
    if (readonly) return false;
    if (block === "egressfirewall" && Boolean(namespace?.allow_all_egress)) return false;
    if (!editBlock) return true;
    return editBlock === block;
  }, [readonly, editBlock, namespace?.allow_all_egress]);

  /**
   * Enable editing for a specific block.
   */
  const onEnableBlockEdit = React.useCallback((block) => {
    if (!canStartEditing(block)) return;
    resetDraftFromNamespace();
    setEditBlock(block);
  }, [canStartEditing, resetDraftFromNamespace]);

  /**
   * Discard edits and reset draft state.
   */
  const onDiscardBlockEdits = React.useCallback(() => {
    resetDraftFromNamespace();
    setEditBlock(null);
  }, [resetDraftFromNamespace]);

  // ============================================================================
  // SAVE HANDLERS
  // ============================================================================

  /**
   * Save block changes.
   */
  const onSaveBlock = React.useCallback(async (block) => {
    if (typeof onUpdateNamespaceInfo !== "function") {
      setEditBlock(null);
      return;
    }
    try {
      if (block === "basic") {
        await saveBasicInfo();
      } else if (block === "egress") {
        await saveEgressConfig();
      } else if (block === "rolebindings") {
        await saveRoleBindings();
      } else if (block === "egressfirewall") {
        await saveEgressFirewall();
      } else if (block === "resourcequota") {
        await saveResourceQuota();
      } else if (block === "limitrange") {
        await saveLimitRange();
      }

      setEditBlock(null);
    } catch (error) {
      const errorMessage = error?.message || String(error);
      alert(`Failed to save changes:\n\n${errorMessage}`);
    }
  }, [namespaceName, onUpdateNamespaceInfo, draftBasic, draftEgress, draftRoleBindingsEntries, draftEgressFirewallEntries, draftResources]);

  /**
   * Save basic info block.
   */
  async function saveBasicInfo() {
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
  }

  /**
   * Save egress config block.
   */
  async function saveEgressConfig() {
    const egress_nameid = (draftEgress?.egressNameId || "").trim();
    await onUpdateNamespaceInfo(namespaceName, {
      namespace_info: {
        egress_nameid: egress_nameid ? egress_nameid : null,
        enable_pod_based_egress_ip: Boolean(draftEgress?.enablePodBasedEgressIp),
      },
    });
  }

  /**
   * Save role bindings block.
   */
  async function saveRoleBindings() {
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

    console.log('[RoleBindings] Saving bindings:', JSON.stringify(bindings, null, 2));
    await onUpdateNamespaceInfo(namespaceName, {
      rolebindings: {
        bindings,
      },
    });
    console.log('[RoleBindings] Save completed successfully');
  }

  /**
   * Save egress firewall block.
   */
  async function saveEgressFirewall() {
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
  }

  /**
   * Save resource quota block.
   */
  async function saveResourceQuota() {
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
  }

  /**
   * Save limit range block.
   */
  async function saveLimitRange() {
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

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Reset drafts when namespace changes and not editing.
   */
  React.useEffect(() => {
    if (editEnabled) return;
    resetDraftFromNamespace();
  }, [namespace, namespaceName, editEnabled, resetDraftFromNamespace]);

  // ============================================================================
  // RETURN
  // ============================================================================
  return {
    // Edit mode state
    editBlock,
    isEditingBasic,
    isEditingEgress,
    isEditingRoleBindings,
    isEditingEgressFirewall,
    isEditingResourceQuota,
    isEditingLimitRange,

    // Draft states - Basic Info
    draftBasic,
    setDraftBasic,

    // Draft states - Egress Config
    draftEgress,
    setDraftEgress,

    // Draft states - Resources
    draftResources,
    setDraftResources,

    // Draft states - Role Bindings
    draftRoleBindingsEntries,
    setDraftRoleBindingsEntries,

    // Draft states - Egress Firewall
    draftEgressFirewallEntries,
    setDraftEgressFirewallEntries,

    // Edit handlers
    canStartEditing,
    onEnableBlockEdit,
    onDiscardBlockEdits,
    onSaveBlock,
    resetDraftFromNamespace,
  };
}
