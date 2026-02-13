/**
 * AccessRequestsTable View - Presentational component for access requests table.
 *
 * This component:
 * - Renders the access requests table
 * - Is a pure presentational component with no business logic
 * - Receives all data and callbacks via props
 */

function AccessRequestsTableView({
  accessRequests,
  formatUserOrGroup,
  getStatus,
  isGrantDisabled,
  onGrantAccess,
}) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Access Requests</div>

      <table>
        <thead>
          <tr>
            <th>Requested At</th>
            <th>Requestor</th>
            <th>Type</th>
            <th>Application</th>
            <th>AccessType</th>
            <th>Userid or Group</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(accessRequests || []).length === 0 ? (
            <tr>
              <td className="muted" colSpan={8}>No access requests found.</td>
            </tr>
          ) : (
            (accessRequests || []).map((r, idx) => (
              <tr key={`${r?.requested_at || ""}:${idx}`}>
                <td className="muted">{r?.requested_at || ""}</td>
                <td>{r?.requestor || ""}</td>
                <td>{r?.type || ""}</td>
                <td>{r?.payload?.application || ""}</td>
                <td>{r?.payload?.role || ""}</td>
                <td>{formatUserOrGroup(r)}</td>
                <td>{getStatus(r, idx)}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => onGrantAccess(r, idx)}
                    disabled={isGrantDisabled(r, idx)}
                  >
                    Grant
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
