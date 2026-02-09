function EgressIpTableView({
  filteredItems,
  filters,
  setFilters,
}) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Cluster</th>
            <th>Allocation ID</th>
            <th>Allocated IPs</th>
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
                value={filters.allocation_id}
                onChange={(e) => setFilters((p) => ({ ...p, allocation_id: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.allocated_ips}
                onChange={(e) => setFilters((p) => ({ ...p, allocated_ips: e.target.value }))}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={3} className="muted">No egress IPs found.</td>
            </tr>
          ) : (
            filteredItems.map((item, index) => (
              <tr key={index}>
                <td>{item.cluster || ""}</td>
                <td>{item.allocation_id || ""}</td>
                <td>{(item.allocated_ips || []).join(", ")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
