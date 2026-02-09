function L4IngressTableView({ filters, setFilters, rows, filteredRows, onEditRow, onAllocateRow }) {
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
                <td>{r.purpose}</td>
                <td>{r.requested}</td>
                <td
                  style={
                    Number(r?.allocatedRaw ?? 0) !== Number(r?.requestedRaw ?? 0)
                      ? { background: "#fff3cd" }
                      : undefined
                  }
                >
                  {r.allocated}
                </td>
                <td>{r.allocatedIps}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="iconBtn iconBtn-plain"
                      onClick={() => onEditRow(r)}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
                        <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onAllocateRow(r)}
                      disabled={!(Number(r?.allocatedRaw ?? 0) < Number(r?.requestedRaw ?? 0))}
                      aria-label="Allocate"
                      title="Allocate"
                    >
                      Allocate
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
