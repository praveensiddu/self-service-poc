/**
 * useNamespaceDetailsLogic Hook - Manages namespace details computed values.
 *
 * This hook provides:
 * - Computed values for namespace display
 * - Data transformations and formatting
 * - Effective namespace with draft changes
 */

/**
 * Custom hook for namespace details logic.
 * @param {Object} params - Hook parameters
 * @param {Object} params.namespace - Namespace data
 * @param {Object} params.draftBasic - Draft basic info
 * @param {Object} params.draftEgress - Draft egress config
 * @param {Object} params.draftResources - Draft resources
 * @param {Array} params.draftEgressFirewallEntries - Draft egress firewall rules
 * @param {string} params.editBlock - Currently editing block
 * @param {Array} params.clusterOptions - Available cluster options
 * @param {string} params.clusterQuery - Cluster search query
 * @returns {Object} - Computed values and utilities
 */
function useNamespaceDetailsLogic({
  namespace,
  draftBasic,
  draftEgress,
  draftResources,
  draftEgressFirewallEntries,
  editBlock,
  clusterOptions,
  clusterQuery,
}) {
  // ============================================================================
  // EDIT MODE FLAGS
  // ============================================================================
  const isEditingBasic = editBlock === "basic";
  const isEditingEgress = editBlock === "egress";
  const isEditingResourceQuota = editBlock === "resourcequota";
  const isEditingLimitRange = editBlock === "limitrange";
  const isEditingEgressFirewall = editBlock === "egressfirewall";

  // ============================================================================
  // FORMATTING UTILITIES
  // ============================================================================

  /**
   * Format a value for display.
   * @param {*} val - Value to format
   * @returns {string} - Formatted value
   */
  const formatValue = React.useCallback((val) => {
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
  }, []);

  // ============================================================================
  // CLUSTER OPTIONS
  // ============================================================================

  /**
   * Filter cluster options based on search query and already selected clusters.
   */
  const filteredClusterOptions = React.useMemo(() => {
    return (clusterOptions || [])
      .filter((c) => !(draftBasic?.clustersList || []).some((x) => String(x).toLowerCase() === String(c).toLowerCase()))
      .filter((c) => {
        const q = String(clusterQuery || "").trim().toLowerCase();
        if (!q) return true;
        return String(c || "").toLowerCase().includes(q);
      })
      .slice(0, 100);
  }, [clusterOptions, draftBasic?.clustersList, clusterQuery]);

  /**
   * Get effective clusters based on edit mode.
   */
  const effectiveClusters = React.useMemo(() => {
    if (isEditingBasic) {
      return (draftBasic?.clustersList || [])
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
    return Array.isArray(namespace?.clusters) ? namespace.clusters : [];
  }, [isEditingBasic, draftBasic?.clustersList, namespace?.clusters]);

  // ============================================================================
  // EFFECTIVE NAMESPACE (with draft changes)
  // ============================================================================

  /**
   * Build effective namespace with draft changes applied.
   */
  const effectiveNamespace = React.useMemo(() => {
    let result = namespace;

    if (isEditingBasic) {
      result = {
        ...namespace,
        clusters: effectiveClusters,
        need_argo: Boolean(draftBasic?.managedByArgo),
        argocd_sync_strategy: String(draftBasic?.nsArgoSyncStrategy || "auto") || "auto",
        gitrepourl: String(draftBasic?.nsArgoGitRepoUrl || ""),
        generate_argo_app: true,
        status: Boolean(draftBasic?.managedByArgo) ? "Argo used" : "Argo not used",
      };
    } else if (isEditingEgress) {
      result = {
        ...namespace,
        egress_nameid: draftEgress?.egressNameId ? draftEgress.egressNameId : null,
        enable_pod_based_egress_ip: Boolean(draftEgress?.enablePodBasedEgressIp),
      };
    } else if (isEditingResourceQuota || isEditingLimitRange) {
      result = {
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

    return result;
  }, [
    namespace,
    isEditingBasic,
    isEditingEgress,
    isEditingResourceQuota,
    isEditingLimitRange,
    effectiveClusters,
    draftBasic,
    draftEgress,
    draftResources,
  ]);

  // ============================================================================
  // DISPLAY VALUES
  // ============================================================================

  /**
   * Get formatted display values.
   */
  const displayValues = React.useMemo(() => {
    return {
      clusters: formatValue(effectiveNamespace?.clusters),
      egressNameId: formatValue(effectiveNamespace?.egress_nameid),
      allocatedEgressIps: formatValue(effectiveNamespace?.allocated_egress_ips),
      podBasedEgress: effectiveNamespace?.enable_pod_based_egress_ip ? "Enabled" : "Disabled",
      managedByArgo: effectiveNamespace?.need_argo || effectiveNamespace?.generate_argo_app ? "Yes" : "No",
      resources: effectiveNamespace?.resources || {},
      rolebindings: effectiveNamespace?.rolebindings || {},
    };
  }, [effectiveNamespace, formatValue]);

  // ============================================================================
  // EGRESS FIREWALL
  // ============================================================================

  /**
   * Get egress firewall rules based on edit mode.
   */
  const egressFirewallRules = React.useMemo(() => {
    if (isEditingEgressFirewall) {
      return draftEgressFirewallEntries;
    }
    return Array.isArray(namespace?.egress_firewall_rules) ? namespace.egress_firewall_rules : [];
  }, [isEditingEgressFirewall, draftEgressFirewallEntries, namespace?.egress_firewall_rules]);

  // ============================================================================
  // RETURN
  // ============================================================================
  return {
    // Formatting
    formatValue,
    // Cluster options
    filteredClusterOptions,
    effectiveClusters,
    // Effective namespace
    effectiveNamespace,
    // Display values
    displayValues,
    // Egress firewall
    egressFirewallRules,
  };
}
