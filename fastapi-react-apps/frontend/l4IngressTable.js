function L4IngressTable({ items, selectedRows, onToggleRow }) {
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
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Cluster</th>
            <th>AllocationId</th>
            <th>Total(Req/Alloc)</th>
            <th>Allocated IPs</th>
            <th>Links</th>
          </tr>
          <tr>
            <th></th>
            <th>
              <input
                className="filterInput"
                value={filters.cluster}
                onChange={(e) => setFilters((p) => ({ ...p, cluster: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.allocationId}
                onChange={(e) => setFilters((p) => ({ ...p, allocationId: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.total}
                onChange={(e) => setFilters((p) => ({ ...p, total: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.allocatedIps}
                onChange={(e) => setFilters((p) => ({ ...p, allocatedIps: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.links}
                onChange={(e) => setFilters((p) => ({ ...p, links: e.target.value }))}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">No L4 ingress allocations found.</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">No matches.</td>
            </tr>
          ) : (
            filteredRows.map((r) => (
              <tr key={r.key}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(r.key)}
                    onChange={(e) => onToggleRow(r.key, e.target.checked)}
                    aria-label={`Select ${r.clusterNo || r.key}`}
                  />
                </td>
                <td>{r.clusterNo}</td>
                <td>{r.allocationId}</td>
                <td>{r.total}</td>
                <td>{r.allocatedIps}</td>
                <td>
                  {r.links.length === 0 ? (
                    <span className="muted"></span>
                  ) : (
                    r.links.map((l) => (
                      <div key={l.label}>
                        <a href={l.href} target="_blank" rel="noreferrer">
                          {l.label}
                        </a>
                      </div>
                    ))
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
