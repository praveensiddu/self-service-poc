function NamespacesTable({ namespaces, selectedNamespaces, onToggleNamespace, onSelectAll, onDeleteNamespace, onCopyNamespace, onViewDetails, onCreateNamespace, env, envKeys, appname, showCreate, onOpenCreate, onCloseCreate, argocdEnabled, requestsChanges, readonly }) {

  // Create namespace modal state
  const [newNamespace, setNewNamespace] = React.useState("");
  const [newClustersList, setNewClustersList] = React.useState([]);
  const [clusterOptions, setClusterOptions] = React.useState([]);
  const [clusterQuery, setClusterQuery] = React.useState("");
  const [clusterPickerOpen, setClusterPickerOpen] = React.useState(false);
  const [newManagedByArgo, setNewManagedByArgo] = React.useState(false);
  const [newEgressNameId, setNewEgressNameId] = React.useState("");

  // Copy namespace modal state
  const [showCopy, setShowCopy] = React.useState(false);
  const [copyFromNamespace, setCopyFromNamespace] = React.useState("");
  const [copyToEnv, setCopyToEnv] = React.useState("");
  const [copyToNamespace, setCopyToNamespace] = React.useState("");
  const [copyBusy, setCopyBusy] = React.useState(false);
  const [copyError, setCopyError] = React.useState("");

  const canEnableArgoForNewNamespace = Boolean(argocdEnabled);

  // Custom formatters specific to namespaces
  function formatRolebindings(rolebindings) {
    if (!rolebindings) return "";
    if (!Array.isArray(rolebindings) || rolebindings.length === 0) return "None";

    const count = rolebindings.length;
    const first = rolebindings[0];
    const roleName = first.roleRef?.name || "N/A";
    const roleKind = first.roleRef?.kind || "N/A";

    if (count === 1) {
      return `${roleKind}: ${roleName}`;
    }
    return `${count} bindings (${roleKind}: ${roleName}, ...)`;
  }

  function formatResourceQuota(resources) {
    if (!resources || !resources.requests) return "None";
    const cpu = resources.requests.cpu || "N/A";
    const memory = resources.requests.memory || "N/A";
    return `CPU: ${cpu}, Memory: ${memory}`;
  }

  function formatLimitRange(resources) {
    if (!resources || !resources.limits) return "None";
    const cpu = resources.limits.cpu || "N/A";
    const memory = resources.limits.memory || "N/A";
    return `CPU: ${cpu}, Memory: ${memory}`;
  }

  const keys = Object.keys(namespaces || {});

  // Transform namespace objects to row objects for filtering
  const transformedRows = React.useMemo(() => {
    return keys.map((k) => {
      const ns = namespaces[k];
      return {
        namespace: ns,
        name: safeTrim(ns?.name || k),
        managedByArgo: Boolean(ns?.need_argo || ns?.generate_argo_app),
        clustersText: formatTableValue(ns?.clusters),
        egressNameIdText: formatTableValue(ns?.egress_nameid),
        egressFirewallText: ns?.allow_all_egress ? "false" : "true",
        resourceQuotaText: formatResourceQuota(ns?.resources),
        limitRangeText: formatLimitRange(ns?.resources),
        rolebindingsText: formatRolebindings(ns?.rolebindings),
        statusText: formatTableValue(ns?.status),
        policyText: formatTableValue(ns?.policy),
      };
    });
  }, [namespaces, keys.join(',')]);

  const {
    sortedRows,
    filters,
    setFilters
  } = useTableFilter({
    rows: transformedRows,
    initialFilters: {
      name: "",
      clusters: "",
      egressNameId: "",
      egressFirewall: "",
      managedByArgo: "",
    },
    fieldMapping: (row) => ({
      name: row.name,
      clusters: row.clustersText,
      egressNameId: row.egressNameIdText,
      egressFirewall: row.egressFirewallText,
      managedByArgo: String(row.managedByArgo ? "true" : "false"),
    }),
    sortBy: (a, b) => {
      const an = safeTrim(a?.name).toLowerCase();
      const bn = safeTrim(b?.name).toLowerCase();
      return an.localeCompare(bn);
    },
  });

  // Effect: Reset argo checkbox if not enabled
  React.useEffect(() => {
    if (!showCreate) return;
    if (!canEnableArgoForNewNamespace) setNewManagedByArgo(false);
  }, [showCreate, canEnableArgoForNewNamespace]);

  // Effect: Auto-populate egress name ID with app name
  React.useEffect(() => {
    if (!showCreate) return;
    const appKey = String(appname || "").trim();
    if (!appKey) return;
    setNewEgressNameId((prev) => (String(prev || "").trim() ? prev : appKey));
  }, [showCreate, appname]);

  // Effect: Load clusters for the create form
  React.useEffect(() => {
    let cancelled = false;
    if (!showCreate) return;

    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    if (!envKey || !appKey) {
      setClusterOptions([]);
      return;
    }

    (async () => {
      try {
        const resp = await fetch(
          `/api/v1/clusters?env=${encodeURIComponent(envKey)}&app=${encodeURIComponent(appKey)}`,
        );
        if (!resp.ok) throw new Error("Failed to load clusters");
        const data = await resp.json();
        if (cancelled) return;
        setClusterOptions(Array.isArray(data) ? data.map(String) : []);
      } catch {
        if (!cancelled) setClusterOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showCreate, env, appname]);

  const filteredClusterOptions = (clusterOptions || [])
    .filter((c) => !(newClustersList || []).includes(c))
    .filter((c) => (c || "").toLowerCase().includes((clusterQuery || "").toLowerCase()));

  function addCluster(c) {
    const v = String(c || "").trim();
    if (!v) return;
    setNewClustersList((prev) => {
      const next = Array.isArray(prev) ? prev.slice() : [];
      if (!next.includes(v)) next.push(v);
      return next;
    });
    setClusterQuery("");
    setClusterPickerOpen(false);
  }

  function removeCluster(c) {
    const v = String(c || "").trim();
    setNewClustersList((prev) => (Array.isArray(prev) ? prev.filter((x) => x !== v) : []));
  }

  const canSubmitCreate = Boolean(
    (newNamespace || "").trim() && Array.isArray(newClustersList) && newClustersList.length > 0,
  );

  const canSubmitCopy = Boolean(
    !copyBusy &&
      (copyFromNamespace || "").trim() &&
      (copyToEnv || "").trim() &&
      (copyToNamespace || "").trim() &&
      !(String(copyToEnv || "").trim() === String(env || "").trim() &&
        String(copyToNamespace || "").trim() === String(copyFromNamespace || "").trim()),
  );

  function openCopyModal(fromNamespace) {
    setCopyError("");
    setCopyFromNamespace(String(fromNamespace || "").trim());
    const initialToEnv = String(env || "").trim() || (Array.isArray(envKeys) ? String(envKeys[0] || "").trim() : "");
    setCopyToEnv(initialToEnv);
    setCopyToNamespace("");
    setShowCopy(true);
  }

  function closeCopyModal() {
    if (copyBusy) return;
    setShowCopy(false);
  }

  async function handleCreateNamespace() {
    try {
      if (typeof onCreateNamespace !== "function") return;
      await onCreateNamespace({
        namespace: newNamespace,
        clusters: newClustersList,
        need_argo: canEnableArgoForNewNamespace ? newManagedByArgo : false,
        egress_nameid: newEgressNameId,
      });
      onCloseCreate();
      setNewNamespace("");
      setNewClustersList([]);
      setClusterQuery("");
      setClusterPickerOpen(false);
      setNewManagedByArgo(false);
      setNewEgressNameId("");
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  async function handleCopyNamespace() {
    try {
      setCopyBusy(true);
      setCopyError("");
      await onCopyNamespace(copyFromNamespace, {
        from_env: String(env || "").trim(),
        to_env: String(copyToEnv || "").trim(),
        to_namespace: String(copyToNamespace || "").trim(),
      });
      setShowCopy(false);
    } catch (e) {
      setCopyError(e?.message || String(e));
    } finally {
      setCopyBusy(false);
    }
  }

  return (
    <NamespacesTableView
      keysLength={transformedRows.length}
      filteredRows={sortedRows}
      filters={filters}
      setFilters={setFilters}
      onViewDetails={onViewDetails}
      onDeleteNamespace={onDeleteNamespace}
      requestsChanges={requestsChanges}
      env={env}
      envKeys={envKeys}
      appname={appname}
      showCreate={showCreate}
      onCloseCreate={onCloseCreate}
      readonly={readonly}
      newNamespace={newNamespace}
      setNewNamespace={setNewNamespace}
      newClustersList={newClustersList}
      clusterQuery={clusterQuery}
      setClusterQuery={setClusterQuery}
      clusterPickerOpen={clusterPickerOpen}
      setClusterPickerOpen={setClusterPickerOpen}
      newManagedByArgo={newManagedByArgo}
      setNewManagedByArgo={setNewManagedByArgo}
      newEgressNameId={newEgressNameId}
      setNewEgressNameId={setNewEgressNameId}
      canEnableArgoForNewNamespace={canEnableArgoForNewNamespace}
      filteredClusterOptions={filteredClusterOptions}
      addCluster={addCluster}
      removeCluster={removeCluster}
      canSubmitCreate={canSubmitCreate}
      handleCreateNamespace={handleCreateNamespace}
      showCopy={showCopy}
      copyFromNamespace={copyFromNamespace}
      copyToEnv={copyToEnv}
      setCopyToEnv={setCopyToEnv}
      copyToNamespace={copyToNamespace}
      setCopyToNamespace={setCopyToNamespace}
      copyBusy={copyBusy}
      copyError={copyError}
      canSubmitCopy={canSubmitCopy}
      openCopyModal={openCopyModal}
      closeCopyModal={closeCopyModal}
      handleCopyNamespace={handleCopyNamespace}
    />
  );
}
