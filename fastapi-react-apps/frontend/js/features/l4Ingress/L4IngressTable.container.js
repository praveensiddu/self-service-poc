/**
 * L4IngressTable Container
 *
 * Note: Uses global API helpers from services/apiClient.js (fetchJson, putJson, postJson, deleteJson)
 */

function L4IngressTable({ items, appname, env, renderAddButton, readonly }) {
  const [localItems, setLocalItems] = React.useState(Array.isArray(items) ? items : []);

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
    if (env && appname) {
      fetchClustersInfo();
    }
  }, [items, env, appname]);


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

  async function onAllocateRow(row) {
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
  }

  function onCloseAdd() {
    setAddOpen(false);
  }

  function onCloseEdit() {
    setEditOpen(false);
  }

  function onCloseErrorModal() {
    setErrorModalOpen(false);
  }

  // Transform and sort rows
  const rows = React.useMemo(() => {
    return (localItems || []).map((it, idx) => {
      const allocationIds = (it?.allocations || []).map((a) => a?.name).filter(Boolean);
      const purpose = formatTableValue(it?.purpose);
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
        clusterNo: formatTableValue(it?.cluster_no),
        purpose,
        requested: formatTableValue(it?.requested_total),
        allocated: formatTableValue(it?.allocated_total),
        requestedRaw,
        allocatedRaw,
        allocatedIps: formatTableValue(allocatedIps),
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
  }, [localItems, clusters]);

  // Use centralized filtering hook
  const {
    sortedRows: filteredRows,
    filters,
    setFilters,
  } = useTableFilter({
    rows,
    initialFilters: {
      cluster: "",
      purpose: "",
      requested: "",
      allocated: "",
      allocatedIps: "",
    },
    fieldMapping: (row) => ({
      cluster: safeTrim(row?.clusterNo),
      purpose: safeTrim(row?.purpose),
      requested: safeTrim(row?.requested),
      allocated: safeTrim(row?.allocated),
      allocatedIps: safeTrim(row?.allocatedIps),
    }),
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
    <L4IngressTableView
      filters={filters}
      setFilters={setFilters}
      rows={rows}
      filteredRows={filteredRows}
      onEditRow={onEditRow}
      onAllocateRow={onAllocateRow}
      readonly={readonly}
      renderAddButton={renderAddButton}
      onOpenAdd={onOpenAdd}
      addOpen={addOpen}
      addClusters={addClusters}
      addClusterNo={addClusterNo}
      setAddClusterNo={setAddClusterNo}
      addPurpose={addPurpose}
      setAddPurpose={setAddPurpose}
      addRequested={addRequested}
      setAddRequested={setAddRequested}
      addError={addError}
      addSaving={addSaving}
      onSaveAdd={onSaveAdd}
      onCloseAdd={onCloseAdd}
      editOpen={editOpen}
      editRow={editRow}
      editRequested={editRequested}
      setEditRequested={setEditRequested}
      editError={editError}
      editSaving={editSaving}
      onSaveEdit={onSaveEdit}
      onCloseEdit={onCloseEdit}
      errorModalOpen={errorModalOpen}
      errorModalMessage={errorModalMessage}
      onCloseErrorModal={onCloseErrorModal}
      env={env}
      appname={appname}
    />
  );
}
