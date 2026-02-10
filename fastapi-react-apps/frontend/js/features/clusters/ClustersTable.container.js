function ClustersTable({
  envKeys,
  activeEnv,
  clustersByEnv,
  onEnvClick,
  onAddCluster,
  onDeleteCluster,
  loading,
  showCreate,
  onOpenCreate,
  onCloseCreate,
  readonly,
  apps,
}) {
  const [filters, setFilters] = React.useState({
    clustername: "",
    purpose: "",
    datacenter: "",
    applications: "",
    l4IngressIpRanges: "",
    egressIpRanges: "",
  });
  const [selectedClusters, setSelectedClusters] = React.useState(new Set());

  function formatValue(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  const envKey = String(activeEnv || "").toUpperCase();
  const rows = (clustersByEnv || {})[envKey] || [];

  const filteredRows = (rows || []).filter((cluster) => {
    const clustername = formatValue(cluster?.clustername).toLowerCase();
    const purpose = formatValue(cluster?.purpose).toLowerCase();
    const datacenter = formatValue(cluster?.datacenter).toLowerCase();
    const applications = formatValue(cluster?.applications).toLowerCase();
    const l4IngressIpRanges = formatValue(
      Array.isArray(cluster?.l4_ingress_ip_ranges)
        ? cluster.l4_ingress_ip_ranges
          .map((x) => `${String(x?.start_ip || "").trim()}-${String(x?.end_ip || "").trim()}`)
          .filter((s) => s !== "-")
          .join(", ")
        : "",
    ).toLowerCase();

    const egressIpRanges = formatValue(
      Array.isArray(cluster?.egress_ip_ranges)
        ? cluster.egress_ip_ranges
          .map((x) => `${String(x?.start_ip || "").trim()}-${String(x?.end_ip || "").trim()}`)
          .filter((s) => s !== "-")
          .join(", ")
        : "",
    ).toLowerCase();

    return (
      clustername.includes((filters.clustername || "").toLowerCase()) &&
      purpose.includes((filters.purpose || "").toLowerCase()) &&
      datacenter.includes((filters.datacenter || "").toLowerCase()) &&
      applications.includes((filters.applications || "").toLowerCase()) &&
      l4IngressIpRanges.includes((filters.l4IngressIpRanges || "").toLowerCase()) &&
      egressIpRanges.includes((filters.egressIpRanges || "").toLowerCase())
    );
  });

  const allSelected = filteredRows.length > 0 && filteredRows.every((cluster) => selectedClusters.has(cluster?.clustername));

  function onToggleCluster(clustername, checked) {
    setSelectedClusters((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(clustername);
      } else {
        next.delete(clustername);
      }
      return next;
    });
  }

  function onSelectAll(checked) {
    if (checked) {
      const allClusternames = filteredRows.map((c) => c?.clustername).filter(Boolean);
      setSelectedClusters(new Set(allClusternames));
    } else {
      setSelectedClusters(new Set());
    }
  }

  return (
    <ClustersTableView
      envKeys={envKeys}
      activeEnv={activeEnv}
      clustersByEnv={clustersByEnv}
      onEnvClick={onEnvClick}
      onAddCluster={onAddCluster}
      onDeleteCluster={onDeleteCluster}
      loading={loading}
      showCreate={showCreate}
      onOpenCreate={onOpenCreate}
      onCloseCreate={onCloseCreate}
      filters={filters}
      setFilters={setFilters}
      filteredRows={filteredRows}
      selectedClusters={selectedClusters}
      onToggleCluster={onToggleCluster}
      allSelected={allSelected}
      onSelectAll={onSelectAll}
      readonly={readonly}
      apps={apps}
    />
  );
}
