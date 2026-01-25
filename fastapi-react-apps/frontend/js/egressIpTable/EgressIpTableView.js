function EgressIpTableView({
  filteredItems,
  allSelected,
  filters,
  setFilters,
  selectedItems,
  onToggleRow,
  onSelectAll,
}) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked, filteredItems.map((_, index) => index))}
                aria-label="Select all rows"
              />
            </th>
            <th>Cluster</th>
            <th>Allocation ID</th>
            <th>Allocated IPs</th>
            <th>Link</th>
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
            <th></th>
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
                <td>
                  <input
                    type="checkbox"
                    checked={selectedItems.has(index)}
                    onChange={(e) => onToggleRow(index, e.target.checked)}
                    aria-label={`Select egress IP ${index}`}
                  />
                </td>
                <td>{item.cluster || ""}</td>
                <td>{item.allocation_id || ""}</td>
                <td>{(item.allocated_ips || []).join(", ")}</td>
                <td>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      View allocated
                    </a>
                  ) : (
                    ""
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
