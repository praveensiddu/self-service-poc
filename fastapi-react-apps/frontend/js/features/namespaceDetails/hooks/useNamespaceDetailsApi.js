/**
 * useNamespaceDetailsApi Hook - API calls for namespace details.
 *
 * This hook provides:
 * - YAML preview fetchers
 * - Cluster options loader
 * - Role catalog loader
 * - Egress firewall preview
 */

/**
 * Custom hook for namespace details API operations.
 * @param {Object} params - Hook parameters
 * @param {string} params.env - Environment
 * @param {string} params.appname - Application name
 * @param {string} params.namespaceName - Namespace name
 * @param {string} params.editBlock - Currently editing block
 * @returns {Object} - API functions and state
 */
function useNamespaceDetailsApi({ env, appname, namespaceName, editBlock }) {
  // ============================================================================
  // STATE
  // ============================================================================
  const [clusterOptions, setClusterOptions] = React.useState([]);
  const [roleCatalogByKind, setRoleCatalogByKind] = React.useState({ Role: [], ClusterRole: [] });

  // ============================================================================
  // ROLE BINDINGS API
  // ============================================================================

  /**
   * Fetch role binding YAML preview.
   */
  const fetchRoleBindingYaml = React.useCallback(async ({ subjects, roleRef, bindingIndex }) => {
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
  }, [env, appname, namespaceName]);

  // ============================================================================
  // RESOURCES API (ResourceQuota & LimitRange)
  // ============================================================================

  /**
   * Fetch resource quota YAML preview.
   */
  const fetchResourceQuotaYaml = React.useCallback(async (resources) => {
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
  }, [env, appname, namespaceName]);

  /**
   * Fetch limit range YAML preview.
   */
  const fetchLimitRangeYaml = React.useCallback(async (resources) => {
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
  }, [env, appname, namespaceName]);

  // ============================================================================
  // EGRESS FIREWALL API
  // ============================================================================

  /**
   * Fetch egress firewall YAML.
   */
  const fetchEgressFirewallYaml = React.useCallback(async (rules) => {
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
  }, [env, appname, namespaceName]);

  /**
   * Fetch current egress firewall rules.
   */
  const fetchCurrentEgressFirewallRules = React.useCallback(async () => {
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
  }, [env, appname, namespaceName]);

  /**
   * Get egress firewall preview YAML with draft changes merged.
   * @param {Array} draftEgressFirewallEntries - Draft egress firewall entries
   * @returns {Promise<string>} - YAML string
   */
  const getEgressFirewallPreviewYaml = React.useCallback(async (draftEgressFirewallEntries) => {
    const currentRules = await fetchCurrentEgressFirewallRules();

    const draftRules = (draftEgressFirewallEntries || [])
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

    const mergedRules = draftRules.length > 0 ? draftRules : currentRules;
    return await fetchEgressFirewallYaml(mergedRules);
  }, [fetchCurrentEgressFirewallRules, fetchEgressFirewallYaml]);

  // ============================================================================
  // EFFECTS - Data Loading
  // ============================================================================

  /**
   * Load cluster options when editing basic info.
   */
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

  /**
   * Load role catalogs when editing role bindings.
   */
  React.useEffect(() => {
    let mounted = true;

    async function loadRoleCatalogs() {
      try {
        if (editBlock !== "rolebindings") return;

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
      }
    }

    loadRoleCatalogs();
    return () => {
      mounted = false;
    };
  }, [editBlock, env]);

  // ============================================================================
  // RETURN
  // ============================================================================
  return {
    // State
    clusterOptions,
    roleCatalogByKind,
    // Role Bindings
    fetchRoleBindingYaml,
    // Resources
    fetchResourceQuotaYaml,
    fetchLimitRangeYaml,
    // Egress Firewall
    fetchEgressFirewallYaml,
    fetchCurrentEgressFirewallRules,
    getEgressFirewallPreviewYaml,
  };
}
