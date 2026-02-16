/**
 * L4IngressTable Container
 *
 * Note: Uses global API helpers from services/apiClient.js (fetchJson, putJson, postJson, deleteJson)
 */

function L4IngressTable({ items, appname, env, renderAddButton, readonly }) {
  const { parseItemsResponse, handlePermissionError } = useAuthorization();

  // Extract items and permissions from the response using helper
  const itemsData = React.useMemo(() => {
    return parseItemsResponse(items);
  }, [items, parseItemsResponse]);

  const [localItems, setLocalItems] = React.useState(itemsData.items);
  const canManage = itemsData.permissions.canManage;

  const [addOpen, setAddOpen] = React.useState(false);
  const [addClusters, setAddClusters] = React.useState([]);
  const [addClusterNo, setAddClusterNo] = React.useState("");
  const [addPurpose, setAddPurpose] = React.useState("");
  const [addRequested, setAddRequested] = React.useState("");
  const [addError, setAddError] = React.useState("");
  const [addSaving, setAddSaving] = React.useState(false);
  const [addFreePoolInfo, setAddFreePoolInfo] = React.useState(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState(null);
  const [editRequested, setEditRequested] = React.useState("");
  const [editError, setEditError] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [editFreePoolInfo, setEditFreePoolInfo] = React.useState(null);
  const [editAppname, setEditAppname] = React.useState(null);
  const [editEnv, setEditEnv] = React.useState(null);
  const editContextRef = React.useRef({ appname: null, env: null });

  const [releaseOpen, setReleaseOpen] = React.useState(false);
  const [releaseRow, setReleaseRow] = React.useState(null);
  const [releaseIp, setReleaseIp] = React.useState("");
  const [releaseError, setReleaseError] = React.useState("");
  const [releaseSaving, setReleaseSaving] = React.useState(false);

  const [clusters, setClusters] = React.useState([]);
  const [errorModalOpen, setErrorModalOpen] = React.useState(false);
  const [errorModalMessage, setErrorModalMessage] = React.useState("");

  // Fetch clusters for app - wrapped in useCallback
  const fetchClustersForApp = React.useCallback(async () => {
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
    const clusters = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.clusters) ? parsed.clusters : []);
    return clusters.map(String);
  }, [env, appname]);

  const fetchL4IngressFreePool = React.useCallback(async (clusterNo) => {
    const c = String(clusterNo || "").trim();
    if (!env) throw new Error("No env selected.");
    if (!c) return null;
    return await fetchJson(
      `/api/v1/l4_ingress/free_pool?env=${encodeURIComponent(env)}&cluster_no=${encodeURIComponent(c)}`,
    );
  }, [env]);

  // Fetch clusters info - wrapped in useCallback
  const fetchClustersInfo = React.useCallback(async () => {
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

      // Handle new response format with permissions
      const clustersData = parsed?.clusters || parsed;
      const clustersForEnv = Array.isArray(clustersData?.[env]) ? clustersData[env] : [];
      setClusters(clustersForEnv);
    } catch (e) {
      console.error("Failed to fetch clusters info:", e);
      setClusters([]);
    }
  }, [env]);

  React.useEffect(() => {
    setLocalItems(itemsData.items);
    if (env && appname) {
      fetchClustersInfo();
    }
  }, [itemsData.items, env, appname, fetchClustersInfo]);

  // Check if cluster has IP range - wrapped in useCallback
  const hasIpRangeForCluster = React.useCallback((clusterNo) => {
    const cluster = clusters.find((c) => String(c?.clustername || "") === String(clusterNo || ""));
    if (!cluster) return false;
    const ranges = cluster.l4_ingress_ip_ranges;
    return Array.isArray(ranges) && ranges.length > 0 && ranges.some((r) => r?.start_ip && r?.end_ip);
  }, [clusters]);

  // Open add modal - wrapped in useCallback
  const onOpenAdd = React.useCallback(async () => {
    setAddError("");
    setAddSaving(false);
    setAddClusterNo("");
    setAddPurpose(String(appname || ""));
    setAddRequested("0");
    setAddFreePoolInfo(null);
    try {
      const clusters = await fetchClustersForApp();
      setAddClusters(clusters);
      if (clusters.length === 1) setAddClusterNo(String(clusters[0] || ""));
    } catch (e) {
      setAddClusters([]);
      setAddError(e?.message || String(e));
    }
    setAddOpen(true);
  }, [appname, fetchClustersForApp]);

  React.useEffect(() => {
    let mounted = true;
    async function run() {
      if (!addOpen) return;
      const c = String(addClusterNo || "").trim();
      if (!c) {
        setAddFreePoolInfo(null);
        return;
      }
      try {
        const info = await fetchL4IngressFreePool(c);
        if (mounted) setAddFreePoolInfo(info);
      } catch {
        if (mounted) setAddFreePoolInfo(null);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [addOpen, addClusterNo, fetchL4IngressFreePool]);

  // Save add - wrapped in useCallback
  const onSaveAdd = React.useCallback(async () => {
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
      // Use centralized permission error handler
      const wasPermissionError = handlePermissionError(
        e,
        "add",
        "L4 ingress",
        appname,
        (msg) => setAddError(msg),
        null
      );

      // If it wasn't a permission error, show the error in the modal
      if (!wasPermissionError) {
        setAddError(e?.message || String(e));
      }
    } finally {
      setAddSaving(false);
    }
  }, [addClusterNo, addPurpose, addRequested, appname, env, handlePermissionError]);

  // Edit row - wrapped in useCallback
  const onEditRow = React.useCallback((row) => {
    editContextRef.current = { appname, env };
    setEditAppname(appname || null);
    setEditEnv(env || null);
    setEditError("");
    setEditRow(row || null);
    setEditRequested(String(row?.requested ?? ""));
    setEditFreePoolInfo(null);
    setEditOpen(true);
  }, [appname, env]);

  React.useEffect(() => {
    let mounted = true;
    async function run() {
      if (!editOpen) return;
      const c = String(editRow?.clusterNoRaw || editRow?.clusterNo || "").trim();
      if (!c) {
        setEditFreePoolInfo(null);
        return;
      }
      try {
        const info = await fetchL4IngressFreePool(c);
        if (mounted) setEditFreePoolInfo(info);
      } catch {
        if (mounted) setEditFreePoolInfo(null);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [editOpen, editRow, fetchL4IngressFreePool]);

  // Save edit - wrapped in useCallback
  const onSaveEdit = React.useCallback(async () => {
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

    const ctxAppname = String(editAppname || editContextRef.current?.appname || appname || "");
    const ctxEnv = String(editEnv || editContextRef.current?.env || env || "");

    if (!ctxAppname) {
      setEditError("No app selected.");
      return;
    }
    if (!ctxEnv) {
      setEditError("No env selected.");
      return;
    }

    const clusterNo = String(editRow.clusterNoRaw || editRow.clusterNo || "");
    if (!hasIpRangeForCluster(clusterNo)) {
      setEditError("There is no IP Range defined for this cluster.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      await putJson(
        `/api/v1/apps/${encodeURIComponent(ctxAppname)}/l4_ingress?env=${encodeURIComponent(ctxEnv)}`,
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
      // Use centralized permission error handler
      const wasPermissionError = handlePermissionError(
        e,
        "edit",
        "L4 ingress",
        ctxAppname,
        (msg) => setEditError(msg),
        null
      );

      // If it wasn't a permission error, show the error in the modal
      if (!wasPermissionError) {
        setEditError(e?.message || String(e));
      }
    } finally {
      setEditSaving(false);
    }
  }, [editRow, editRequested, appname, env, handlePermissionError, hasIpRangeForCluster]);

  // Allocate row - wrapped in useCallback
  const onAllocateRow = React.useCallback(async (row) => {
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
      // Use centralized permission error handler - shows alert for permission errors
      handlePermissionError(
        e,
        "allocate",
        "L4 ingress IPs",
        appname,
        null,
        null
      );

      // If not a permission error, still show alert
      const errorMessage = e?.message || String(e);
      if (!errorMessage.includes("Access denied") && !errorMessage.includes("403") && !errorMessage.includes("Forbidden")) {
        alert(errorMessage);
      }
    }
  }, [env, appname, handlePermissionError]);

  const onReleaseRow = React.useCallback((row) => {
    setReleaseError("");
    setReleaseSaving(false);
    setReleaseRow(row || null);
    const ips = Array.isArray(row?.allocatedIpsRaw) ? row.allocatedIpsRaw : [];
    setReleaseIp(String(ips?.[0] || ""));
    setReleaseOpen(true);
  }, []);

  const onSaveRelease = React.useCallback(async () => {
    if (!releaseRow) return;
    try {
      if (!env) throw new Error("No env selected.");
      if (!appname) throw new Error("No app selected.");

      const cluster_no = String(releaseRow.clusterNoRaw || releaseRow.clusterNo || "").trim();
      const purpose = String(releaseRow.purpose || "").trim();
      const ips = Array.isArray(releaseRow.allocatedIpsRaw) ? releaseRow.allocatedIpsRaw : [];
      const ip = String(releaseIp || "").trim();
      if (!cluster_no) throw new Error("Missing cluster.");
      if (!purpose) throw new Error("Missing purpose.");
      if (!ip) {
        setReleaseError("IP is required.");
        return;
      }
      if (!ips.includes(ip)) {
        setReleaseError("Selected IP is not in the allocated list.");
        return;
      }

      setReleaseSaving(true);
      setReleaseError("");

      const resp = await postJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/l4_ingress/release?env=${encodeURIComponent(env)}`,
        { cluster_no, purpose, ip },
      );

      if (resp) {
        const res = await fetch(
          `/api/v1/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(env)}`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const parsed = await res.json();
        const next = parseItemsResponse(parsed);
        setLocalItems(next.items);
      }

      setReleaseOpen(false);
      setReleaseRow(null);
      setReleaseIp("");
    } catch (e) {
      const wasPermissionError = handlePermissionError(
        e,
        "release",
        "L4 ingress IP",
        appname,
        (msg) => setReleaseError(msg),
        null
      );

      if (!wasPermissionError) {
        setReleaseError(e?.message || String(e));
      }
    } finally {
      setReleaseSaving(false);
    }
  }, [releaseRow, releaseIp, env, appname, handlePermissionError, parseItemsResponse]);

  const onCloseRelease = React.useCallback(() => {
    setReleaseOpen(false);
  }, []);

  // Close add - wrapped in useCallback
  const onCloseAdd = React.useCallback(() => {
    setAddOpen(false);
  }, []);

  // Close edit - wrapped in useCallback
  const onCloseEdit = React.useCallback(() => {
    setEditOpen(false);
  }, []);

  // Close error modal - wrapped in useCallback
  const onCloseErrorModal = React.useCallback(() => {
    setErrorModalOpen(false);
  }, []);

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
        allocatedIpsRaw: allocatedIps,
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
        !readonly && canManage ? (
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
  }, [renderAddButton, onOpenAdd, readonly, canManage]);

  return (
    <L4IngressTableView
      filters={filters}
      setFilters={setFilters}
      rows={rows}
      filteredRows={filteredRows}
      onEditRow={onEditRow}
      onAllocateRow={onAllocateRow}
      onReleaseRow={onReleaseRow}
      readonly={readonly}
      canManage={canManage}
      renderAddButton={renderAddButton}
      onOpenAdd={onOpenAdd}
      addOpen={addOpen}
      addClusters={addClusters}
      addClusterNo={addClusterNo}
      setAddClusterNo={setAddClusterNo}
      addFreePoolInfo={addFreePoolInfo}
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
      editFreePoolInfo={editFreePoolInfo}
      editError={editError}
      editSaving={editSaving}
      onSaveEdit={onSaveEdit}
      onCloseEdit={onCloseEdit}
      releaseOpen={releaseOpen}
      releaseRow={releaseRow}
      releaseIp={releaseIp}
      setReleaseIp={setReleaseIp}
      releaseError={releaseError}
      releaseSaving={releaseSaving}
      onSaveRelease={onSaveRelease}
      onCloseRelease={onCloseRelease}
      errorModalOpen={errorModalOpen}
      errorModalMessage={errorModalMessage}
      onCloseErrorModal={onCloseErrorModal}
      env={env}
      appname={appname}
    />
  );
}
