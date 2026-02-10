/**
 * useNamespaces Hook - Manages namespaces state and operations.
 *
 * This hook provides:
 * - Namespaces list state
 * - CRUD operations for namespaces
 * - Namespace details state
 * - Selection state for namespaces
 * - L4 Ingress and Egress IP state
 *
 * Note: Uses global functions from services/namespacesService.js
 */

/**
 * Custom hook for managing namespaces.
 * @param {Object} params - Hook parameters
 * @param {string} params.activeEnv - Currently active environment
 * @returns {Object} - Namespaces state and operations
 */
function useNamespaces({ activeEnv }) {
  const [namespaces, setNamespaces] = React.useState({});
  const [selectedNamespaces, setSelectedNamespaces] = React.useState(() => new Set());
  const [detailAppName, setDetailAppName] = React.useState("");
  const [detailNamespace, setDetailNamespace] = React.useState(null);
  const [detailNamespaceName, setDetailNamespaceName] = React.useState("");
  const [l4IngressItems, setL4IngressItems] = React.useState([]);
  const [egressIpItems, setEgressIpItems] = React.useState([]);

  /**
   * Load namespaces for an application.
   * @param {string} appname - Application name
   * @returns {Promise<Object>} - Namespaces data
   */
  const loadNamespacesData = React.useCallback(async (appname) => {
    if (!activeEnv || !appname) return {};

    const resp = await loadNamespaces(activeEnv, appname);
    setNamespaces(resp || {});
    setSelectedNamespaces(new Set());

    return resp || {};
  }, [activeEnv]);

  /**
   * Create a new namespace.
   * @param {string} appname - Application name
   * @param {{namespace: string, clusters?: string[], need_argo?: boolean, egress_nameid?: string}} payload
   */
  const createNamespace = React.useCallback(async (appname, payload) => {
    if (!appname) throw new Error("No application selected.");

    await createNamespaceApi(activeEnv, appname, payload);

    // Refresh namespaces list
    const resp = await loadNamespaces(activeEnv, appname);
    setNamespaces(resp || {});

    return resp;
  }, [activeEnv]);

  /**
   * Delete a namespace.
   * @param {string} appname - Application name
   * @param {string} namespaceName - Namespace name
   * @returns {Promise<boolean>} - Whether deletion was confirmed and completed
   */
  const deleteNamespace = React.useCallback(async (appname, namespaceName) => {
    if (!appname) throw new Error("No application selected.");

    const confirmMsg = `Are you sure you want to delete namespace "${namespaceName}" from ${appname}?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) {
      return false;
    }

    await deleteNamespaceApi(activeEnv, appname, namespaceName);

    // Refresh namespaces list
    const resp = await loadNamespaces(activeEnv, appname);
    setNamespaces(resp || {});

    return true;
  }, [activeEnv]);

  /**
   * Copy a namespace to another environment.
   * @param {string} appname - Application name
   * @param {string} fromNamespace - Source namespace name
   * @param {{from_env: string, to_env: string, to_namespace: string}} payload
   */
  const copyNamespace = React.useCallback(async (appname, fromNamespace, payload) => {
    if (!appname) throw new Error("No application selected.");

    await copyNamespaceApi(activeEnv, appname, fromNamespace, payload);

    // Refresh namespaces list
    const resp = await loadNamespaces(activeEnv, appname);
    setNamespaces(resp || {});
  }, [activeEnv]);

  /**
   * Load namespace details.
   * @param {string} appname - Application name
   * @param {string} namespaceName - Namespace name
   * @returns {Promise<Object>} - Namespace details
   */
  const loadNamespaceDetailsData = React.useCallback(async (appname, namespaceName) => {
    if (!appname) throw new Error("No application selected.");
    if (!namespaceName) throw new Error("No namespace selected.");

    const details = await loadNamespaceDetails(activeEnv, appname, namespaceName);

    setDetailAppName(appname);
    setDetailNamespace(details);
    setDetailNamespaceName(namespaceName);

    return details;
  }, [activeEnv]);

  /**
   * Update namespace info with complex payload handling.
   * @param {string} appname - Application name
   * @param {string} namespaceName - Namespace name
   * @param {Object} updates - Update payload
   * @returns {Promise<Object>} - Updated namespace
   */
  const updateNamespaceInfo = React.useCallback(async (appname, namespaceName, updates) => {
    if (!appname) throw new Error("No application selected.");
    if (!namespaceName) throw new Error("No namespace selected.");

    const nextUpdates = { ...(updates || {}) };
    const ni = nextUpdates?.namespace_info ? { ...(nextUpdates.namespace_info || {}) } : null;
    const nextNeedArgo = ni && Object.prototype.hasOwnProperty.call(ni, "need_argo")
      ? Boolean(ni.need_argo)
      : null;
    if (ni && Object.prototype.hasOwnProperty.call(ni, "need_argo")) {
      delete ni.need_argo;
      nextUpdates.namespace_info = ni;
    }

    const nsargocdUpdates = nextUpdates && nextUpdates.nsargocd ? { ...(nextUpdates.nsargocd || {}) } : null;
    if (nextUpdates && Object.prototype.hasOwnProperty.call(nextUpdates, "nsargocd")) {
      delete nextUpdates.nsargocd;
    }

    const egressFirewallUpdates = nextUpdates && nextUpdates.egressfirewall ? { ...(nextUpdates.egressfirewall || {}) } : null;
    if (nextUpdates && Object.prototype.hasOwnProperty.call(nextUpdates, "egressfirewall")) {
      delete nextUpdates.egressfirewall;
    }

    let updated = null;

    const hasNamespaceInfo = Boolean(nextUpdates && nextUpdates.namespace_info);
    const hasResources = Boolean(nextUpdates && nextUpdates.resources);
    const hasRoleBindings = Boolean(nextUpdates && nextUpdates.rolebindings);

    if (hasNamespaceInfo) {
      const nsInfo = nextUpdates.namespace_info || {};
      const hasClusters = Object.prototype.hasOwnProperty.call(nsInfo, "clusters");
      const hasEgressNameId = Object.prototype.hasOwnProperty.call(nsInfo, "egress_nameid");
      const hasPodBased = Object.prototype.hasOwnProperty.call(nsInfo, "enable_pod_based_egress_ip");

      if (hasClusters) {
        const basicResp = await updateNamespaceBasicInfo(activeEnv, appname, namespaceName, { clusters: nsInfo.clusters });
        updated = { ...(updated || {}), ...(basicResp || {}) };
      }

      if (hasEgressNameId || hasPodBased) {
        const egressResp = await updateNamespaceEgressInfo(activeEnv, appname, namespaceName, {
          ...(hasEgressNameId ? { egress_nameid: nsInfo.egress_nameid } : {}),
          ...(hasPodBased ? { enable_pod_based_egress_ip: nsInfo.enable_pod_based_egress_ip } : {}),
        });
        updated = { ...(updated || {}), ...(egressResp || {}) };
      }

      delete nextUpdates.namespace_info;
    }

    if (hasResources) {
      const resources = nextUpdates.resources || {};

      const hasResourceQuota = Boolean(resources && (resources.requests || resources.quota_limits));
      if (hasResourceQuota) {
        const rqResp = await updateNamespaceResourceQuota(activeEnv, appname, namespaceName, {
          requests: resources.requests,
          quota_limits: resources.quota_limits,
        });

        const prevResources = {
          ...((detailNamespace && detailNamespace.resources) || {}),
          ...((updated && updated.resources) || {}),
        };

        updated = {
          ...(updated || {}),
          resources: {
            ...prevResources,
            requests: rqResp && Object.prototype.hasOwnProperty.call(rqResp, "requests") ? rqResp.requests : null,
            quota_limits: rqResp && Object.prototype.hasOwnProperty.call(rqResp, "quota_limits") ? rqResp.quota_limits : null,
          },
        };
      }

      const hasLimitRange = Boolean(resources && resources.limits);
      if (hasLimitRange) {
        const lrResp = await updateNamespaceLimitRange(activeEnv, appname, namespaceName, { limits: resources.limits });

        const prevResources = {
          ...((detailNamespace && detailNamespace.resources) || {}),
          ...((updated && updated.resources) || {}),
        };

        updated = {
          ...(updated || {}),
          resources: {
            ...prevResources,
            limits: lrResp && Object.prototype.hasOwnProperty.call(lrResp, "limits") ? lrResp.limits : null,
          },
        };
      }

      delete nextUpdates.resources;
    }

    if (hasRoleBindings) {
      const bindings = nextUpdates?.rolebindings?.bindings;
      if (bindings !== undefined) {
        const rbResp = await updateNamespaceRoleBindings(activeEnv, appname, namespaceName, bindings);
        updated = {
          ...(updated || {}),
          rolebindings: Array.isArray(rbResp?.bindings) ? rbResp.bindings : [],
        };
      }
      delete nextUpdates.rolebindings;
    }

    const shouldWriteNsArgo = nextNeedArgo !== null || nsargocdUpdates;
    const shouldWriteEgressFirewall = Boolean(egressFirewallUpdates);
    let sideEffectPatch = null;

    if (!updated && !shouldWriteNsArgo && !shouldWriteEgressFirewall) {
      throw new Error("No matching namespace update route for the provided payload.");
    }

    if (shouldWriteNsArgo) {
      const payload = { ...(nsargocdUpdates || {}) };
      if (nextNeedArgo !== null) payload.need_argo = nextNeedArgo;

      const argoResp = await updateNamespaceArgoCD(activeEnv, appname, namespaceName, payload);
      sideEffectPatch = { ...(sideEffectPatch || {}), ...argoResp };
    }

    if (shouldWriteEgressFirewall) {
      const rules = Array.isArray(egressFirewallUpdates.rules) ? egressFirewallUpdates.rules : [];
      const efResp = await updateNamespaceEgressFirewall(activeEnv, appname, namespaceName, rules);
      sideEffectPatch = { ...(sideEffectPatch || {}), ...efResp };
    }

    const merged = {
      ...(detailNamespace || {}),
      ...(updated || {}),
      ...(sideEffectPatch || {}),
    };

    setDetailNamespace(merged);
    setNamespaces((prev) => ({ ...(prev || {}), [namespaceName]: merged }));

    return merged;
  }, [activeEnv, detailNamespace]);

  /**
   * Load L4 ingress items for an application.
   * @param {string} appname - Application name
   * @returns {Promise<Array>}
   */
  const loadL4IngressData = React.useCallback(async (appname) => {
    if (!activeEnv || !appname) return [];

    const items = await loadL4Ingress(activeEnv, appname);
    setL4IngressItems(items || []);

    return items || [];
  }, [activeEnv]);

  /**
   * Load egress IPs for an application.
   * @param {string} appname - Application name
   * @returns {Promise<Array>}
   */
  const loadEgressIpsData = React.useCallback(async (appname) => {
    if (!activeEnv || !appname) return [];

    const items = await loadEgressIps(activeEnv, appname);
    setEgressIpItems(items || []);

    return items || [];
  }, [activeEnv]);

  /**
   * Toggle namespace selection.
   * @param {string} namespace - Namespace name
   * @param {boolean} checked - Whether to select
   */
  const toggleNamespace = React.useCallback((namespace, checked) => {
    setSelectedNamespaces((prev) => {
      const next = new Set(prev);
      if (checked) next.add(namespace);
      else next.delete(namespace);
      return next;
    });
  }, []);

  /**
   * Select all namespaces.
   * @param {boolean} checked - Whether to select all
   * @param {string[]} namespaceNames - List of namespace names
   */
  const onSelectAllNamespaces = React.useCallback((checked, namespaceNames) => {
    if (checked) setSelectedNamespaces(new Set(namespaceNames));
    else setSelectedNamespaces(new Set());
  }, []);

  /**
   * Reset namespaces state.
   */
  const resetNamespacesState = React.useCallback(() => {
    setNamespaces({});
    setSelectedNamespaces(new Set());
    setDetailAppName("");
    setDetailNamespace(null);
    setDetailNamespaceName("");
    setL4IngressItems([]);
    setEgressIpItems([]);
  }, []);

  /**
   * Clear detail state only.
   */
  const clearDetailState = React.useCallback(() => {
    setDetailNamespace(null);
    setDetailNamespaceName("");
  }, []);

  return {
    // State
    namespaces,
    setNamespaces,
    selectedNamespaces,
    setSelectedNamespaces,
    detailAppName,
    setDetailAppName,
    detailNamespace,
    setDetailNamespace,
    detailNamespaceName,
    setDetailNamespaceName,
    l4IngressItems,
    setL4IngressItems,
    egressIpItems,
    setEgressIpItems,

    // Operations
    loadNamespacesData,
    createNamespace,
    deleteNamespace,
    copyNamespace,
    loadNamespaceDetailsData,
    updateNamespaceInfo,
    loadL4IngressData,
    loadEgressIpsData,

    // Selection
    toggleNamespace,
    onSelectAllNamespaces,

    // Reset
    resetNamespacesState,
    clearDetailState,
  };
}
