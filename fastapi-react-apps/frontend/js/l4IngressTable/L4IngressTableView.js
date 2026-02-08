function L4IngressTableView({ filters, setFilters, rows, filteredRows, onCopyIps, onCopyRowJson }) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Cluster</th>
            <th>Purpose</th>
            <th>Requested</th>
            <th>Allocated</th>
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
                value={filters.purpose}
                onChange={(e) => setFilters((p) => ({ ...p, purpose: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.requested}
                onChange={(e) => setFilters((p) => ({ ...p, requested: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.allocated}
                onChange={(e) => setFilters((p) => ({ ...p, allocated: e.target.value }))}
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
              <td colSpan={6} className="muted">No L4 ingress allocations found.</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">No matches.</td>
            </tr>
          ) : (
            filteredRows.map((r) => (
              <tr key={r.key}>
                <td>{r.clusterNo}</td>
                <td>{r.allocationId}</td>
                <td>{r.requested}</td>
                <td>{r.allocated}</td>
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
