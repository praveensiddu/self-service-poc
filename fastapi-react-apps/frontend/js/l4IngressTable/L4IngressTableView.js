function L4IngressTableView({ filters, setFilters, rows, filteredRows, onCopyIps, onCopyRowJson }) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Cluster</th>
            <th>AllocationId</th>
            <th>Count(Req/Alloc)</th>
            <th>Allocated IPs</th>
            <th>Actions</th>
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
            <th></th>
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
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-sm" onClick={() => onCopyIps(r)}>
                      Copy IPs
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => onCopyRowJson(r)}>
                      Copy JSON
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
