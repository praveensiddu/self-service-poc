function NamespacesTable({ namespaces, selectedNamespaces, onToggleNamespace, onSelectAll, onDeleteNamespace, onCopyNamespace, onViewDetails, onCreateNamespace, env, envKeys, appname, showCreate, onOpenCreate, onCloseCreate, argocdEnabled, requestsChanges, readonly }) {
  const [filters, setFilters] = React.useState({
    name: "",
    clusters: "",
    egressNameId: "",
    egressFirewall: "",
    managedByArgo: "",
  });

  function formatValue(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) {
      // Check if array contains objects (like Role Bindings)
      if (val.length > 0 && typeof val[0] === "object") {
        return `${val.length} item${val.length !== 1 ? 's' : ''}`;
      }
      return val.join(", ");
    }
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  function formatRolebindings(rolebindings) {
    if (!rolebindings) return "";
    if (!Array.isArray(rolebindings) || rolebindings.length === 0) return "None";

    // Show count and summary of first binding
    const count = rolebindings.length;
    const first = rolebindings[0];
    const roleName = first.roleRef?.name || "N/A";
    const roleKind = first.roleRef?.kind || "N/A";

    if (count === 1) {
      return `${roleKind}: ${roleName}`;
    }
    return `${count} bindings (${roleKind}: ${roleName}, ...)`;
  }

  function formatResourceQuota(resources) {
    if (!resources || !resources.requests) return "None";
    const cpu = resources.requests.cpu || "N/A";
    const memory = resources.requests.memory || "N/A";
    return `CPU: ${cpu}, Memory: ${memory}`;
  }

  function formatLimitRange(resources) {
    if (!resources || !resources.limits) return "None";
    const cpu = resources.limits.cpu || "N/A";
    const memory = resources.limits.memory || "N/A";
    return `CPU: ${cpu}, Memory: ${memory}`;
  }

  const keys = Object.keys(namespaces || {});
  const filteredRows = keys
    .map((k) => {
      const ns = namespaces[k];
      const name = formatValue(ns?.name || k);
      const managedByArgo = Boolean(ns?.need_argo || ns?.generate_argo_app);

      const clustersText = formatValue(ns?.clusters);
      const egressNameIdText = formatValue(ns?.egress_nameid);
      const egressFirewallText = ns?.allow_all_egress ? "false" : "true";
      const resourceQuotaText = formatResourceQuota(ns?.resources);
      const limitRangeText = formatLimitRange(ns?.resources);
      const rolebindingsText = formatRolebindings(ns?.rolebindings);
      const statusText = formatValue(ns?.status);
      const policyText = formatValue(ns?.policy);

      return {
        namespace: ns,
        name,
        managedByArgo,
        clustersText,
        egressNameIdText,
        egressFirewallText,
        resourceQuotaText,
        limitRangeText,
        rolebindingsText,
        statusText,
        policyText,
      };
    })
    .filter((r) => {
      return (
        (r.name || "").toLowerCase().includes((filters.name || "").toLowerCase()) &&
        (r.clustersText || "").toLowerCase().includes((filters.clusters || "").toLowerCase()) &&
        (r.egressNameIdText || "").toLowerCase().includes((filters.egressNameId || "").toLowerCase()) &&
        (r.egressFirewallText || "").toLowerCase().includes((filters.egressFirewall || "").toLowerCase()) &&
        String(r.managedByArgo ? "true" : "false")
          .toLowerCase()
          .includes((filters.managedByArgo || "").toLowerCase())
      );
    });

  const sortedRows = [...filteredRows].sort((a, b) => {
    const an = String(a?.name || "").toLowerCase();
    const bn = String(b?.name || "").toLowerCase();
    return an.localeCompare(bn);
  });

  return (
    <NamespacesTableView
      keysLength={keys.length}
      filteredRows={sortedRows}
      filters={filters}
      setFilters={setFilters}
      onViewDetails={onViewDetails}
      onDeleteNamespace={onDeleteNamespace}
      onCopyNamespace={onCopyNamespace}
      onCreateNamespace={onCreateNamespace}
      argocdEnabled={argocdEnabled}
      requestsChanges={requestsChanges}
      env={env}
      envKeys={envKeys}
      appname={appname}
      showCreate={showCreate}
      onOpenCreate={onOpenCreate}
      onCloseCreate={onCloseCreate}
      readonly={readonly}
    />
  );
}
