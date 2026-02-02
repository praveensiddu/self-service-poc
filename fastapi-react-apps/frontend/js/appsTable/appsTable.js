function AppsTable({ rows, env, onRefreshApps, clustersByApp, l4IpsByApp, egressIpsByApp, availableClusters, selectedApps, onToggleRow, onSelectAll, onDeleteApp, onViewDetails, onCreateApp, onUpdateApp, showCreate, onOpenCreate, onCloseCreate }) {
  const [filters, setFilters] = React.useState({
    appname: "",
    description: "",
    managedby: "",
    clusters: "",
    namespaces: "",
    l4ips: "",
    egressips: "",
  });

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

  const filteredRows = (rows || []).filter((a) => {
    const appname = formatValue(a?.appname).toLowerCase();
    const description = formatValue(a?.description).toLowerCase();
    const managedby = formatValue(a?.managedby).toLowerCase();
    const clusters = formatValue((clustersByApp?.[a?.appname] || []).join(", ")).toLowerCase();
    const namespacesCount = formatValue(a?.totalns).toLowerCase();
    const l4ips = formatValue((l4IpsByApp?.[a?.appname] || []).join(", ")).toLowerCase();
    const egressips = formatValue((egressIpsByApp?.[a?.appname] || []).join(", ")).toLowerCase();

    return (
      appname.includes((filters.appname || "").toLowerCase()) &&
      description.includes((filters.description || "").toLowerCase()) &&
      managedby.includes((filters.managedby || "").toLowerCase()) &&
      clusters.includes((filters.clusters || "").toLowerCase()) &&
      namespacesCount.includes((filters.namespaces || "").toLowerCase()) &&
      l4ips.includes((filters.l4ips || "").toLowerCase()) &&
      egressips.includes((filters.egressips || "").toLowerCase())
    );
  });

  const allSelected = filteredRows.length > 0 && filteredRows.every((a) => selectedApps.has(a.appname));

  return (
    <AppsTableView
      filteredRows={filteredRows}
      allSelected={allSelected}
      filters={filters}
      setFilters={setFilters}
      env={env}
      onRefreshApps={onRefreshApps}
      clustersByApp={clustersByApp}
      l4IpsByApp={l4IpsByApp}
      egressIpsByApp={egressIpsByApp}
      availableClusters={availableClusters}
      selectedApps={selectedApps}
      onToggleRow={onToggleRow}
      onSelectAll={onSelectAll}
      onDeleteApp={onDeleteApp}
      onViewDetails={onViewDetails}
      onCreateApp={onCreateApp}
      onUpdateApp={onUpdateApp}
      showCreate={showCreate}
      onOpenCreate={onOpenCreate}
      onCloseCreate={onCloseCreate}
    />
  );
}
