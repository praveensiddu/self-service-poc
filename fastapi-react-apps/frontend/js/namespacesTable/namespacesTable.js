function NamespacesTable({ namespaces, selectedNamespaces, onToggleNamespace, onSelectAll, onDeleteNamespace, onViewDetails }) {
  const [filters, setFilters] = React.useState({
    name: "",
    clusters: "",
    egressIp: "",
    egressFirewall: "",
    managedByArgo: "",
    attributes: "",
  });

  function formatValue(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) {
      // Check if array contains objects (like RBAC bindings)
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

  function formatRbac(rbac) {
    if (!rbac) return "";
    if (!Array.isArray(rbac) || rbac.length === 0) return "None";

    // Show count and summary of first binding
    const count = rbac.length;
    const first = rbac[0];
    const roleName = first.roleRef?.name || "N/A";
    const roleKind = first.roleRef?.kind || "N/A";

    if (count === 1) {
      return `${roleKind}: ${roleName}`;
    }
    return `${count} bindings (${roleKind}: ${roleName}, ...)`;
  }

  const keys = Object.keys(namespaces || {});
  const filteredRows = keys
    .map((k) => {
      const ns = namespaces[k];
      const name = formatValue(ns?.name || k);
      const managedByArgo = Boolean(ns?.need_argo || ns?.generate_argo_app);

      const clustersText = formatValue(ns?.clusters);
      const egressIpText = `${formatValue(ns?.egress_nameid)} ${formatValue(
        Boolean(ns?.enable_pod_based_egress_ip),
      )}`;
      const egressFirewallText = formatValue(ns?.file_index?.egress);
      const resourcesText = formatValue(ns?.resources);
      const rbacText = formatRbac(ns?.rbac);
      const statusText = formatValue(ns?.status);
      const policyText = formatValue(ns?.policy);

      const attributesSearch = `${statusText} ${resourcesText} ${rbacText} ${policyText}`;

      return {
        namespace: ns,
        name,
        managedByArgo,
        clustersText,
        egressIpText,
        egressFirewallText,
        resourcesText,
        rbacText,
        statusText,
        policyText,
        attributesSearch,
      };
    })
    .filter((r) => {
      return (
        (r.name || "").toLowerCase().includes((filters.name || "").toLowerCase()) &&
        (r.clustersText || "").toLowerCase().includes((filters.clusters || "").toLowerCase()) &&
        (r.egressIpText || "").toLowerCase().includes((filters.egressIp || "").toLowerCase()) &&
        (r.egressFirewallText || "").toLowerCase().includes((filters.egressFirewall || "").toLowerCase()) &&
        String(r.managedByArgo ? "true" : "false")
          .toLowerCase()
          .includes((filters.managedByArgo || "").toLowerCase()) &&
        (r.attributesSearch || "").toLowerCase().includes((filters.attributes || "").toLowerCase())
      );
    });

  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedNamespaces?.has(r.name));

  return (
    <NamespacesTableView
      keysLength={keys.length}
      filteredRows={filteredRows}
      allSelected={allSelected}
      filters={filters}
      setFilters={setFilters}
      onSelectAll={onSelectAll}
      onToggleNamespace={onToggleNamespace}
      selectedNamespaces={selectedNamespaces}
      onViewDetails={onViewDetails}
      onDeleteNamespace={onDeleteNamespace}
    />
  );
}
