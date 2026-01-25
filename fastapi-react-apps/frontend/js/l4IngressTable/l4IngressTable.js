function L4IngressTable({ items }) {
  const [filters, setFilters] = React.useState({
    cluster: "",
    allocationId: "",
    total: "",
    allocatedIps: "",
    links: "",
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

  const rows = (items || []).map((it, idx) => {
    const allocationIds = (it?.allocations || []).map((a) => a?.name).filter(Boolean);
    const key = `${it?.cluster_no || ""}::${allocationIds.join("|") || idx}`;

    const links = it?.links || {};
    const linkEntries = Object.entries(links)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => ({ label: k, href: String(v) }));

    return {
      key,
      clusterNo: formatValue(it?.cluster_no),
      allocationId: allocationIds.length ? allocationIds.join(", ") : "",
      total: `${formatValue(it?.requested_total)}/${formatValue(it?.allocated_total)}`,
      allocatedIps: formatValue(it?.allocated_ips),
      links: linkEntries,
    };
  });

  const filteredRows = rows.filter((r) => {
    const cluster = (r.clusterNo || "").toLowerCase();
    const allocationId = (r.allocationId || "").toLowerCase();
    const total = (r.total || "").toLowerCase();
    const allocatedIps = (r.allocatedIps || "").toLowerCase();
    const linksText = r.links.map((l) => `${l.label} ${l.href}`).join(" ").toLowerCase();

    return (
      cluster.includes((filters.cluster || "").toLowerCase()) &&
      allocationId.includes((filters.allocationId || "").toLowerCase()) &&
      total.includes((filters.total || "").toLowerCase()) &&
      allocatedIps.includes((filters.allocatedIps || "").toLowerCase()) &&
      linksText.includes((filters.links || "").toLowerCase())
    );
  });

  return (
    <L4IngressTableView
      filters={filters}
      setFilters={setFilters}
      rows={rows}
      filteredRows={filteredRows}
    />
  );
}
