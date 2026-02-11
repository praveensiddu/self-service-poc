/**
 * IpRangeInput Component
 *
 * Reusable component for inputting IP address ranges with validation.
 */

function IpRangeInput({ ranges, onChange, label, description }) {
  const handleInputChange = (idx, field, value) => {
    const v = formatIpInput(value);
    onChange((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      next[idx] = { ...(next[idx] || {}), [field]: v, error: "" };

      // Auto-add new row if user is typing in the last row and both fields have content
      const isLastRow = idx === prev.length - 1;
      const hasContent = v.trim() || next[idx]?.[field === 'startIp' ? 'endIp' : 'startIp']?.trim();
      if (isLastRow && hasContent) {
        next.push({ startIp: "", endIp: "", error: "" });
      }

      return next;
    });
  };

  const handleBlur = (idx, r) => {
    const error = validateIpRange(r?.startIp, r?.endIp);
    if (error) {
      onChange((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], error };
        return next;
      });
    }
  };

  return (
    <div>
      {label && <div className="muted" style={{ marginBottom: 4 }}>{label}</div>}
      {description && (
        <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
          {description}
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {(ranges || []).map((r, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
            <input
              className="filterInput"
              placeholder="Start IP"
              value={String(r?.startIp || "")}
              onChange={(e) => handleInputChange(idx, 'startIp', e.target.value)}
              onBlur={() => handleBlur(idx, r)}
              style={{
                borderColor: r?.error ? "#dc3545" : undefined,
              }}
            />
            <div style={{ fontSize: 16, color: "#6c757d", textAlign: "center" }}>→</div>
            <input
              className="filterInput"
              placeholder="End IP"
              value={String(r?.endIp || "")}
              onChange={(e) => handleInputChange(idx, 'endIp', e.target.value)}
              onBlur={() => handleBlur(idx, r)}
              style={{
                borderColor: r?.error ? "#dc3545" : undefined,
              }}
            />
            {r?.error && (
              <div style={{
                gridColumn: "1 / -1",
                color: "#dc3545",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                {r.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
