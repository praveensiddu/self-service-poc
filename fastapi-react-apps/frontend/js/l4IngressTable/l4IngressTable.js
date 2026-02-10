function L4IngressTable({ items, appname, env, renderAddButton, readonly }) {
  const [localItems, setLocalItems] = React.useState(Array.isArray(items) ? items : []);
  const [filters, setFilters] = React.useState({
    cluster: "",
    purpose: "",
    requested: "",
    allocated: "",
    allocatedIps: "",
  });

  const [addOpen, setAddOpen] = React.useState(false);
  const [addClusters, setAddClusters] = React.useState([]);
  const [addClusterNo, setAddClusterNo] = React.useState("");
  const [addPurpose, setAddPurpose] = React.useState("");
  const [addRequested, setAddRequested] = React.useState("");
  const [addError, setAddError] = React.useState("");
  const [addSaving, setAddSaving] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState(null);
  const [editRequested, setEditRequested] = React.useState("");
  const [editError, setEditError] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);

  const [clusters, setClusters] = React.useState([]);
  const [errorModalOpen, setErrorModalOpen] = React.useState(false);
  const [errorModalMessage, setErrorModalMessage] = React.useState("");

  React.useEffect(() => {
    setLocalItems(Array.isArray(items) ? items : []);
    // Refresh cluster info when items change (e.g., after cluster deletion)
    if (env && appname) {
      fetchClustersInfo();
    }
  }, [items, env, appname]);

  async function readErrorMessage(res) {
    try {
      const text = await res.text();
      if (!text) return `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && parsed.detail) return String(parsed.detail);
      } catch {
        // ignore
      }
      return text;
    } catch {
      return `HTTP ${res.status}`;
    }
  }

  async function putJson(url, body) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res));
    }
    return await res.json();
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res));
    }
    return await res.json();
  }

  async function fetchClustersForApp() {
    if (!env) throw new Error("No env selected.");
    if (!appname) throw new Error("No app selected.");
    const res = await fetch(
      `/api/v1/clusters?env=${encodeURIComponent(env)}&app=${encodeURIComponent(appname)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const parsed = await res.json();
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }

  async function fetchClustersInfo() {
    if (!env) return;
    try {
      const res = await fetch(
        `/api/v1/clusters?env=${encodeURIComponent(env)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const parsed = await res.json();
      const clustersForEnv = Array.isArray(parsed?.[env]) ? parsed[env] : [];
      setClusters(clustersForEnv);
    } catch (e) {
      console.error("Failed to fetch clusters info:", e);
      setClusters([]);
    }
  }

  function hasIpRangeForCluster(clusterNo) {
    const cluster = clusters.find((c) => String(c?.clustername || "") === String(clusterNo || ""));
    if (!cluster) return false;
    const ranges = cluster.l4_ingress_ip_ranges;
    return Array.isArray(ranges) && ranges.length > 0 && ranges.some((r) => r?.start_ip && r?.end_ip);
  }

  async function onOpenAdd() {
    setAddError("");
    setAddSaving(false);
    setAddClusterNo("");
    setAddPurpose(String(appname || ""));
    setAddRequested("0");
    try {
      const clusters = await fetchClustersForApp();
      setAddClusters(clusters);
      if (clusters.length === 1) setAddClusterNo(String(clusters[0] || ""));
    } catch (e) {
      setAddClusters([]);
      setAddError(e?.message || String(e));
    }
    setAddOpen(true);
  }

  async function onSaveAdd() {
    const cluster_no = String(addClusterNo || "").trim();
    const purpose = String(addPurpose || "").trim();
    const next = String(addRequested || "").trim();
    if (!cluster_no) {
      setAddError("Cluster is required.");
      return;
    }
    if (!purpose) {
      setAddError("Purpose is required.");
      return;
    }
    if (!next) {
      setAddError("Requested is required.");
      return;
    }
    const n = Number(next);
    if (!Number.isFinite(n) || n < 0 || n > 256 || Math.floor(n) !== n) {
      setAddError("Requested must be a whole number between 0 and 256.");
      return;
    }
    if (!appname) {
      setAddError("No app selected.");
      return;
    }
    if (!env) {
      setAddError("No env selected.");
      return;
    }

    setAddSaving(true);
    setAddError("");
    try {
      await putJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(env)}`,
        { cluster_no, purpose, requested_total: n },
      );

      setLocalItems((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        const idx = arr.findIndex(
          (it) => String(it?.cluster_no || "") === cluster_no && String(it?.purpose || "") === purpose,
        );
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], requested_total: n };
          return arr;
        }
        arr.push({ cluster_no, purpose, requested_total: n, allocated_total: 0, allocations: [] });
        return arr;
      });

      setAddOpen(false);
    } catch (e) {
      setAddError(e?.message || String(e));
    } finally {
      setAddSaving(false);
    }
  }

  function onEditRow(row) {
    const clusterNo = String(row?.clusterNoRaw || row?.clusterNo || "");
    if (!hasIpRangeForCluster(clusterNo)) {
      setErrorModalMessage("There is no IP Range defined for this cluster.");
      setErrorModalOpen(true);
      return;
    }
    setEditError("");
    setEditRow(row || null);
    setEditRequested(String(row?.requested ?? ""));
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!editRow) return;

    const next = String(editRequested || "").trim();
    if (!next) {
      setEditError("Requested is required.");
      return;
    }
    const n = Number(next);
    if (!Number.isFinite(n) || n < 0 || n > 256 || Math.floor(n) !== n) {
      setEditError("Requested must be a whole number between 0 and 256.");
      return;
    }
    if (!appname) {
      setEditError("No app selected.");
      return;
    }
    if (!env) {
      setEditError("No env selected.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      await putJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(env)}`,
        {
          cluster_no: String(editRow.clusterNoRaw || editRow.clusterNo || ""),
          purpose: String(editRow.purpose || ""),
          requested_total: n,
        },
      );

      setLocalItems((prev) =>
        (Array.isArray(prev) ? prev : []).map((it) => {
          if (
            String(it?.cluster_no || "") === String(editRow.clusterNoRaw || "") &&
            String(it?.purpose || "") === String(editRow.purpose || "")
          ) {
            return { ...it, requested_total: n };
          }
          return it;
        }),
      );

      setEditOpen(false);
      setEditRow(null);
    } catch (e) {
      setEditError(e?.message || String(e));
    } finally {
      setEditSaving(false);
    }
  }

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

  const rows = (localItems || []).map((it, idx) => {
    const allocationIds = (it?.allocations || []).map((a) => a?.name).filter(Boolean);
    const purpose = formatValue(it?.purpose);
    const allocationIdText = allocationIds.length ? allocationIds.join(", ") : purpose;
    const key = `${it?.cluster_no || ""}::${allocationIdText || idx}`;

    const allocatedIpsList = (it?.allocations || [])
      .flatMap((a) => (Array.isArray(a?.ips) ? a.ips : []))
      .filter(Boolean);
    const allocatedIps = Array.from(new Set(allocatedIpsList));

    const requestedRaw = Number(it?.requested_total ?? 0);
    const allocatedRaw = Number(it?.allocated_total ?? 0);

    const clusterNoRaw = String(it?.cluster_no || "");
    const hasIpRange = hasIpRangeForCluster(clusterNoRaw);

    return {
      key,
      clusterNoRaw,
      clusterNo: formatValue(it?.cluster_no),
      purpose,
      requested: formatValue(it?.requested_total),
      allocated: formatValue(it?.allocated_total),
      requestedRaw,
      allocatedRaw,
      allocatedIps: formatValue(allocatedIps),
      hasIpRange,
    };
  }).sort((a, b) => {
    const an = String(a?.clusterNoRaw || "").trim();
    const bn = String(b?.clusterNoRaw || "").trim();

    const ai = Number(an);
    const bi = Number(bn);
    const aNum = Number.isFinite(ai) && String(Math.floor(ai)) === an;
    const bNum = Number.isFinite(bi) && String(Math.floor(bi)) === bn;

    if (aNum && bNum) {
      if (ai !== bi) return ai - bi;
    } else {
      const c = an.localeCompare(bn, undefined, { numeric: true, sensitivity: "base" });
      if (c !== 0) return c;
    }

    return String(a?.purpose || "").localeCompare(String(b?.purpose || ""), undefined, { sensitivity: "base" });
  });

  const filteredRows = rows.filter((r) => {
    const cluster = (r.clusterNo || "").toLowerCase();
    const purpose = (r.purpose || "").toLowerCase();
    const requested = (r.requested || "").toLowerCase();
    const allocated = (r.allocated || "").toLowerCase();
    const allocatedIps = (r.allocatedIps || "").toLowerCase();

    return (
      cluster.includes((filters.cluster || "").toLowerCase()) &&
      purpose.includes((filters.purpose || "").toLowerCase()) &&
      requested.includes((filters.requested || "").toLowerCase()) &&
      allocated.includes((filters.allocated || "").toLowerCase()) &&
      allocatedIps.includes((filters.allocatedIps || "").toLowerCase())
    );
  });

  React.useEffect(() => {
    if (typeof renderAddButton === 'function') {
      renderAddButton(
        !readonly ? (
          <button className="btn btn-primary" type="button" onClick={onOpenAdd} data-testid="add-l4-ingress-btn">
            + Add
          </button>
        ) : null
      );
    }
    return () => {
      if (typeof renderAddButton === 'function') {
        renderAddButton(null);
      }
    };
  }, [renderAddButton, onOpenAdd, readonly]);

  return (
    <>
      {typeof renderAddButton !== 'function' && !readonly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn btn-primary" type="button" onClick={onOpenAdd}>
            + Add
          </button>
        </div>
      )}
      <L4IngressTableView
        filters={filters}
        setFilters={setFilters}
        rows={rows}
        filteredRows={filteredRows}
        onEditRow={onEditRow}
        readonly={readonly}
        onAllocateRow={async (row) => {
          try {
            if (!env) throw new Error("No env selected.");
            if (!appname) throw new Error("No app selected.");
            if (!row) return;
            const cluster_no = String(row.clusterNoRaw || row.clusterNo || "").trim();
            const purpose = String(row.purpose || "").trim();
            if (!cluster_no) throw new Error("Missing cluster.");
            if (!purpose) throw new Error("Missing purpose.");

            const resp = await postJson(
              `/api/v1/apps/${encodeURIComponent(appname)}/l4_ingress/allocate?env=${encodeURIComponent(env)}`,
              { cluster_no, purpose },
            );

            const allocated_total = Number(resp?.allocated_total ?? row.allocatedRaw ?? 0);
            const ips = Array.isArray(resp?.allocated_ips) ? resp.allocated_ips : [];

            setLocalItems((prev) =>
              (Array.isArray(prev) ? prev : []).map((it) => {
                if (String(it?.cluster_no || "") === cluster_no && String(it?.purpose || "") === purpose) {
                  return {
                    ...it,
                    allocated_total,
                    allocations: ips.length
                      ? [{ name: String(resp?.key || ""), purpose, ips }]
                      : (Array.isArray(it?.allocations) ? it.allocations : []),
                  };
                }
                return it;
              }),
            );
          } catch (e) {
            alert(e?.message || String(e));
          }
        }}
      />
      {addOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
          data-testid="add-l4-ingress-panel"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""} App: {appname || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Add L4 Ingress Request</div>
              <button className="btn" type="button" onClick={() => setAddOpen(false)}>
                Close
              </button>
            </div>
            {addError ? <div className="error" style={{ marginBottom: 10 }}>{addError}</div> : null}
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Cluster</div>
                </div>
                <select
                  className="filterInput"
                  value={addClusterNo}
                  onChange={(e) => setAddClusterNo(e.target.value)}
                  disabled={addSaving}
                >
                  <option value="">Select...</option>
                  {(addClusters || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Purpose</div>
                </div>
                <input
                  className="filterInput"
                  value={addPurpose}
                  onChange={(e) => setAddPurpose(e.target.value)}
                  disabled={addSaving}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Requested</div>
                  <div className="muted" style={{ fontSize: 12 }}>Whole number 0..256</div>
                </div>
                <input
                  className="filterInput"
                  type="number"
                  min={0}
                  max={256}
                  step={1}
                  value={addRequested}
                  onChange={(e) => setAddRequested(e.target.value)}
                  disabled={addSaving}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" type="button" onClick={() => setAddOpen(false)} disabled={addSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={onSaveAdd} disabled={addSaving}>
                {addSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
          data-testid="edit-l4-ingress-panel"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""} App: {appname || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Edit L4 Ingress Requested</div>
              <button className="btn" type="button" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>
            {editError ? <div className="error" style={{ marginBottom: 10 }}>{editError}</div> : null}
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Cluster</div>
                </div>
                <input className="filterInput" value={String(editRow?.clusterNo || "")} disabled readOnly />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Purpose</div>
                </div>
                <input className="filterInput" value={String(editRow?.purpose || "")} disabled readOnly />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Requested</div>
                  <div className="muted" style={{ fontSize: 12 }}>Whole number</div>
                </div>
                <input
                  className="filterInput"
                  type="number"
                  min={0}
                  max={256}
                  step={1}
                  value={editRequested}
                  onChange={(e) => setEditRequested(e.target.value)}
                  disabled={editSaving}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" type="button" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={onSaveEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {errorModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setErrorModalOpen(false);
          }}
        >
          <div className="card" style={{ width: 480, maxWidth: "92vw", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Error</div>
              <button className="btn" type="button" onClick={() => setErrorModalOpen(false)}>
                Close
              </button>
            </div>
            <div className="error" style={{ marginBottom: 12 }}>{errorModalMessage}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" type="button" onClick={() => setErrorModalOpen(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
