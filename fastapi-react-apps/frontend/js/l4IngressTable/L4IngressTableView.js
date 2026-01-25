function L4IngressTableView({ filters, setFilters, rows, filteredRows }) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Cluster</th>
            <th>AllocationId</th>
            <th>Count(Req/Alloc)</th>
            <th>Allocated IPs</th>
            <th>Links</th>
          </tr>
          <tr>
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
              <td colSpan={5} className="muted">No L4 ingress allocations found.</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">No matches.</td>
            </tr>
          ) : (
            filteredRows.map((r) => (
              <tr key={r.key}>
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
