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
  const { parseNestedResponse } = useAuthorization();

  const [selectedClusters, setSelectedClusters] = React.useState(new Set());

  const envKey = String(activeEnv || "").toUpperCase();

  // Extract clusters data and permissions using consistent helper
  const clustersData = React.useMemo(() => {
    const { data, permissions } = parseNestedResponse(clustersByEnv, "clusters");
    const envClusters = data?.[envKey] || [];
    return {
      rows: Array.isArray(envClusters) ? envClusters : [],
      permissions
    };
  }, [clustersByEnv, envKey, parseNestedResponse]);

  const rows = clustersData.rows;
  const hasManagePermission = clustersData.permissions.canManage && !readonly;

  const {
    sortedRows: filteredRows,
    filters,
    setFilters
  } = useTableFilter({
    rows,
    initialFilters: {
      clustername: "",
      purpose: "",
      datacenter: "",
      applications: "",
      l4IngressIpRanges: "",
      egressIpRanges: "",
    },
    fieldMapping: (cluster) => ({
      clustername: safeTrim(cluster?.clustername),
      purpose: safeTrim(cluster?.purpose),
      datacenter: safeTrim(cluster?.datacenter),
      applications: formatTableValue(cluster?.applications),
      l4IngressIpRanges: Array.isArray(cluster?.l4_ingress_ip_ranges)
        ? cluster.l4_ingress_ip_ranges
            .map((x) => `${safeTrim(x?.start_ip)}-${safeTrim(x?.end_ip)}`)
            .filter((s) => s !== "-")
            .join(", ")
        : "",
      egressIpRanges: Array.isArray(cluster?.egress_ip_ranges)
        ? cluster.egress_ip_ranges
            .map((x) => `${safeTrim(x?.start_ip)}-${safeTrim(x?.end_ip)}`)
            .filter((s) => s !== "-")
            .join(", ")
        : "",
    }),
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
      hasManagePermission={hasManagePermission}
      apps={apps}
    />
  );
}
