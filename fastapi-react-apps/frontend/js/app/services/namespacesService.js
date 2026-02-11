/**
 * Namespaces Service - API calls for namespace management.
 *
 * This service handles CRUD operations for namespaces within applications.
 * All functions return plain data; state updates are handled by the container.
 */

/**
 * Load all namespaces for an application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @returns {Promise<Object>} - Object with namespace data
 */
async function loadNamespaces(env, appname) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");
  return await fetchJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(env)}`
  );
}

/**
 * Create a new namespace.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {{namespace: string, clusters?: string[], need_argo?: boolean, egress_nameid?: string}} payload
 * @returns {Promise<Object>} - Created namespace data
 */
async function createNamespaceApi(env, appname, payload) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");

  const namespace = safeTrim(payload?.namespace);
  if (!namespace) throw new Error("Namespace name is required.");

  const clusters = Array.isArray(payload?.clusters)
    ? payload.clusters.map(safeTrim).filter(Boolean)
    : parseCommaSeparated(payload?.clusters);
  const egress_nameid = safeTrim(payload?.egress_nameid);

  await postJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(env)}`,
    {
      namespace,
      clusters,
      egress_nameid: egress_nameid || undefined,
    }
  );

  // If need_argo is true, enable ArgoCD for the namespace
  if (payload?.need_argo) {
    await putJson(
      `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespace)}/nsargocd?env=${encodeURIComponent(env)}`,
      { need_argo: true }
    );
  }

  return { namespace, clusters };
}

/**
 * Delete a namespace.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name to delete
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteNamespaceApi(env, appname, namespaceName) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");
  if (!namespaceName) throw new Error("Namespace name is required.");

  return await deleteJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(env)}&namespaces=${encodeURIComponent(namespaceName)}`
  );
}

/**
 * Copy a namespace to another environment.
 * @param {string} env - Current environment
 * @param {string} appname - Application name
 * @param {string} fromNamespace - Source namespace name
 * @param {{from_env: string, to_env: string, to_namespace: string}} payload
 * @returns {Promise<void>}
 */
async function copyNamespaceApi(env, appname, fromNamespace, payload) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");
  if (!fromNamespace) throw new Error("Source namespace is required.");

  const from_env = safeTrim(payload?.from_env);
  const to_env = safeTrim(payload?.to_env);
  const to_namespace = safeTrim(payload?.to_namespace);

  if (!from_env) throw new Error("from_env is required.");
  if (!to_env) throw new Error("to_env is required.");
  if (!to_namespace) throw new Error("to_namespace is required.");
  if (from_env !== safeTrim(env)) {
    throw new Error("from_env must match the active environment.");
  }

  await postJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(fromNamespace)}/copy?env=${encodeURIComponent(env)}`,
    { from_env, to_env, to_namespace }
  );
}

/**
 * Load namespace details (basic info, egress, rolebindings, egressfirewall, resourcequota, limitrange).
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @returns {Promise<Object>} - Namespace details object
 */
async function loadNamespaceDetails(env, appname, namespaceName) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");
  if (!namespaceName) throw new Error("Namespace name is required.");

  const envParam = `env=${encodeURIComponent(env)}`;
  const base = `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}`;

  const [basic, egress, rolebindings, egressFirewall, resourcequota, limitrange] = await Promise.all([
    fetchJson(`${base}/namespace_info/basic?${envParam}`),
    fetchJson(`${base}/namespace_info/egress?${envParam}`),
    fetchJson(`${base}/rolebinding_requests?${envParam}`),
    fetchJson(`${base}/egressfirewall?${envParam}`),
    fetchJson(`${base}/resources/resourcequota?${envParam}`),
    fetchJson(`${base}/resources/limitrange?${envParam}`),
  ]);

  return {
    name: namespaceName,
    clusters: Array.isArray(basic?.clusters) ? basic.clusters : [],
    egress_nameid: egress?.egress_nameid ?? null,
    enable_pod_based_egress_ip: Boolean(egress?.enable_pod_based_egress_ip),
    allow_all_egress: Boolean(egress?.allow_all_egress),
    need_argo: Boolean(basic?.need_argo),
    argocd_sync_strategy: String(basic?.argocd_sync_strategy || ""),
    gitrepourl: String(basic?.gitrepourl || ""),
    generate_argo_app: Boolean(basic?.generate_argo_app),
    status: String(basic?.status || ""),
    resources: {
      requests: resourcequota?.requests || {},
      quota_limits: resourcequota?.quota_limits || {},
      limits: limitrange?.limits || {},
    },
    rolebindings: Array.isArray(rolebindings?.bindings) ? rolebindings.bindings : [],
    egress_firewall_rules: Array.isArray(egressFirewall?.rules) ? egressFirewall.rules : [],
  };
}

/**
 * Update namespace basic info (clusters).
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @param {{clusters: string[]}} namespaceInfo
 * @returns {Promise<Object>}
 */
async function updateNamespaceBasicInfo(env, appname, namespaceName, namespaceInfo) {
  const envParam = `env=${encodeURIComponent(env)}`;
  return await putJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/namespace_info/basic?${envParam}`,
    { namespace_info: { clusters: namespaceInfo.clusters } }
  );
}

/**
 * Update namespace egress info.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @param {{egress_nameid?: string, enable_pod_based_egress_ip?: boolean}} namespaceInfo
 * @returns {Promise<Object>}
 */
async function updateNamespaceEgressInfo(env, appname, namespaceName, namespaceInfo) {
  const envParam = `env=${encodeURIComponent(env)}`;
  return await putJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/namespace_info/egress?${envParam}`,
    { namespace_info: namespaceInfo }
  );
}

/**
 * Update namespace resource quota.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @param {{requests?: Object, quota_limits?: Object}} resources
 * @returns {Promise<Object>}
 */
async function updateNamespaceResourceQuota(env, appname, namespaceName, resources) {
  const envParam = `env=${encodeURIComponent(env)}`;
  return await putJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/resources/resourcequota?${envParam}`,
    {
      requests: resources.requests || null,
      quota_limits: resources.quota_limits || null,
    }
  );
}

/**
 * Update namespace limit range.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @param {{limits?: Object}} resources
 * @returns {Promise<Object>}
 */
async function updateNamespaceLimitRange(env, appname, namespaceName, resources) {
  const envParam = `env=${encodeURIComponent(env)}`;
  return await putJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/resources/limitrange?${envParam}`,
    { limits: resources.limits || null }
  );
}

/**
 * Update namespace role bindings.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @param {Array} bindings - Array of role bindings
 * @returns {Promise<Object>}
 */
async function updateNamespaceRoleBindings(env, appname, namespaceName, bindings) {
  const envParam = `env=${encodeURIComponent(env)}`;
  return await putJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/rolebinding_requests?${envParam}`,
    { bindings: Array.isArray(bindings) ? bindings : [] }
  );
}

/**
 * Update or delete namespace ArgoCD settings.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @param {{need_argo: boolean, argocd_sync_strategy?: string, gitrepourl?: string}} payload
 * @returns {Promise<Object>}
 */
async function updateNamespaceArgoCD(env, appname, namespaceName, payload) {
  const envParam = `env=${encodeURIComponent(env)}`;
  const base = `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/nsargocd`;

  if (payload.need_argo === false) {
    await fetch(`${base}?${envParam}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return {
      need_argo: false,
      argocd_sync_strategy: "",
      gitrepourl: "",
    };
  } else {
    return await putJson(`${base}?${envParam}`, payload);
  }
}

/**
 * Update or delete namespace egress firewall rules.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {string} namespaceName - Namespace name
 * @param {Array} rules - Array of egress firewall rules
 * @returns {Promise<Object>}
 */
async function updateNamespaceEgressFirewall(env, appname, namespaceName, rules) {
  const envParam = `env=${encodeURIComponent(env)}`;
  const base = `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/egressfirewall`;

  const rulesArray = Array.isArray(rules) ? rules : [];

  if (rulesArray.length === 0) {
    await fetch(`${base}?${envParam}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return { egress_firewall_rules: [] };
  } else {
    const resp = await putJson(`${base}?${envParam}`, { rules: rulesArray });
    return { egress_firewall_rules: Array.isArray(resp?.rules) ? resp.rules : rulesArray };
  }
}

/**
 * Load L4 ingress items for an application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @returns {Promise<Array>}
 */
async function loadL4Ingress(env, appname) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");
  return await fetchJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(env)}`
  );
}

/**
 * Load egress IPs for an application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @returns {Promise<Array>}
 */
async function loadEgressIps(env, appname) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");
  return await fetchJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/egress_ips?env=${encodeURIComponent(env)}`
  );
}
