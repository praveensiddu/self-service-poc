function EgressIpTableView({
  filteredItems,
  filters,
  setFilters,
  env,
  appname,
  onRemoveAllocation,
  readonly,
}) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Cluster</th>
            <th>Allocation ID</th>
            <th>Allocated IPs</th>
            <th>Namespaces</th>
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
            <th>
              <input
                className="filterInput"
                value={filters.namespaces}
                onChange={(e) => setFilters((p) => ({ ...p, namespaces: e.target.value }))}
              />
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">No egress IPs found.</td>
            </tr>
          ) : (
            filteredItems.map((item, index) => (
              <tr key={index}>
                <td>{item.cluster || ""}</td>
                <td>{item.allocation_id || ""}</td>
                <td style={(item.namespaces || []).length === 0 ? { background: "#fff3cd" } : undefined}>
                  {(item.allocated_ips || []).join(", ")}
                </td>
                <td>{(item.namespaces || []).join(", ")}</td>
                <td>
                  {!readonly && typeof onRemoveAllocation === "function" && (item.namespaces || []).length === 0 ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onRemoveAllocation(item)}
                      title={`Release ${item.allocation_id || ""} from ${item.cluster || ""}`}
                    >
                      Release
                    </button>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
