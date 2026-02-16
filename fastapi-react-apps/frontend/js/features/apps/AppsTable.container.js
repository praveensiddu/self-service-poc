function AppsTable({
  rows,
  env,
  clustersByApp,
  selectedApps,
  currentUserContext,
  onToggleRow,
  onSelectAll,
  onDeleteApp,
  onUpdateApp,
  onViewDetails,
  onCreateApp,
  showCreate,
  onCloseCreate,
  requestsChanges,
  readonly,
}) {
  const { extractPermissions } = useAuthorization();

  // Add permissions to each row
  const rowsWithPermissions = React.useMemo(() => {
    return rows.map(row => ({
      ...row,
      permissions: extractPermissions(row),
    }));
  }, [rows, extractPermissions]);

  // Memoize fieldMapping to ensure it updates when clustersByApp changes
  const fieldMapping = React.useCallback((app) => ({
    appname: safeTrim(app?.appname),
    description: safeTrim(app?.description),
    managedby: Array.isArray(app?.managedby)
      ? app.managedby.map((v) => safeTrim(v)).filter(Boolean).join(", ")
      : safeTrim(app?.managedby),
    clusters: (clustersByApp?.[app?.appname] || []).join(", "),
    namespaces: String(app?.totalns || ""),
    argocd: String(Boolean(app?.argocd)),
  }), [clustersByApp]);

  // Memoize sortBy function
  const sortBy = React.useCallback((a, b) => {
    const an = safeTrim(a?.appname).toLowerCase();
    const bn = safeTrim(b?.appname).toLowerCase();
    return an.localeCompare(bn);
  }, []);

  // Centralized filtering and sorting
  const {
    sortedRows,
    filters,
    setFilters
  } = useTableFilter({
    rows: rowsWithPermissions,
    initialFilters: {
      appname: "",
      description: "",
      managedby: "",
      clusters: "",
      namespaces: "",
      argocd: "",
    },
    fieldMapping,
    sortBy,
  });

  const allSelected = React.useMemo(() => {
    return sortedRows.length > 0 && sortedRows.every((a) => selectedApps.has(a.appname));
  }, [sortedRows, selectedApps]);

  // Modal and form state
  const [newAppName, setNewAppName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newManagedBy, setNewManagedBy] = React.useState("");

  const canSubmitCreate = React.useMemo(() => {
    return isNonEmptyString(newAppName) && isNonEmptyString(newDescription) && isNonEmptyString(newManagedBy);
  }, [newAppName, newDescription, newManagedBy]);

  const [showEdit, setShowEdit] = React.useState(false);
  const [editAppName, setEditAppName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editManagedBy, setEditManagedBy] = React.useState("");

  const [showArgoCd, setShowArgoCd] = React.useState(false);
  const [argoCdAppName, setArgoCdAppName] = React.useState("");
  const [argoCdExists, setArgoCdExists] = React.useState(false);
  const [argoCdAdminGroups, setArgoCdAdminGroups] = React.useState("");
  const [argoCdOperatorGroups, setArgoCdOperatorGroups] = React.useState("");
  const [argoCdReadonlyGroups, setArgoCdReadonlyGroups] = React.useState("");
  const [argoCdSyncStrategy, setArgoCdSyncStrategy] = React.useState("auto");
  const [argoCdGitUrl, setArgoCdGitUrl] = React.useState("");

  const canSubmitArgoCd = React.useMemo(() => {
    return isNonEmptyString(argoCdGitUrl);
  }, [argoCdGitUrl]);

  const [showRequestAccess, setShowRequestAccess] = React.useState(false);
  const [requestAccessAppName, setRequestAccessAppName] = React.useState("");
  const [requestAccessRole, setRequestAccessRole] = React.useState("viewer");
  const [requestAccessUserid, setRequestAccessUserid] = React.useState("");
  const [requestAccessGroup, setRequestAccessGroup] = React.useState("");

  function openRequestAccess(row) {
    const r = row || {};
    const name = safeTrim(r?.appname);
    setRequestAccessAppName(name);
    setRequestAccessRole("viewer");
    setRequestAccessUserid("");
    setRequestAccessGroup("");
    setShowRequestAccess(true);
  }

  function closeRequestAccess() {
    setShowRequestAccess(false);
  }

  const canSubmitRequestAccess = React.useMemo(() => {
    const hasUserid = isNonEmptyString(requestAccessUserid);
    const hasGroup = isNonEmptyString(requestAccessGroup);
    return isNonEmptyString(requestAccessAppName)
      && isNonEmptyString(requestAccessRole)
      && ((hasUserid && !hasGroup) || (!hasUserid && hasGroup));
  }, [requestAccessAppName, requestAccessRole, requestAccessUserid, requestAccessGroup]);

  async function onSubmitRequestAccess() {
    try {
      const application = safeTrim(requestAccessAppName);
      const role = safeTrim(requestAccessRole);
      const userid = safeTrim(requestAccessUserid);
      const group = safeTrim(requestAccessGroup);
      if (!application) throw new Error("Application is required.");
      if (!role) throw new Error("Role is required.");
      if (Boolean(userid) === Boolean(group)) throw new Error("Exactly one of Userid or Group is required.");

      await createAppAccessRequest({ application, role, userid, group });

      setShowRequestAccess(false);
      alert(`Access request submitted for ${application} (${role}).`);
    } catch (e) {
      alert(formatError(e));
    }
  }

  async function openArgoCd(row) {
    const r = row || {};
    const name = safeTrim(r?.appname);
    setArgoCdAppName(name);
    setArgoCdExists(Boolean(r?.argocd));

    setArgoCdAdminGroups("");
    setArgoCdOperatorGroups("");
    setArgoCdReadonlyGroups("");
    setArgoCdSyncStrategy("auto");
    setArgoCdGitUrl("");

    setShowArgoCd(true);

    try {
      if (!env) throw new Error("Missing env");
      const parsed = await loadAppArgoCD(env, name);
      setArgoCdExists(Boolean(parsed?.exists));
      setArgoCdAdminGroups(safeTrim(parsed?.argocd_admin_groups));
      setArgoCdOperatorGroups(safeTrim(parsed?.argocd_operator_groups));
      setArgoCdReadonlyGroups(safeTrim(parsed?.argocd_readonly_groups));
      setArgoCdSyncStrategy(safeTrim(parsed?.argocd_sync_strategy) || "auto");
      setArgoCdGitUrl(safeTrim(parsed?.gitrepourl));
    } catch {
      // Best-effort prefill; keep modal open with defaults.
    }
  }

  function closeArgoCd() {
    setShowArgoCd(false);
  }

  async function onSubmitArgoCd() {
    try {
      const name = safeTrim(argoCdAppName);
      if (!name) throw new Error("App Name is required.");
      if (!env) throw new Error("Environment is required.");

      const payload = {
        argocd_admin_groups: safeTrim(argoCdAdminGroups),
        argocd_operator_groups: safeTrim(argoCdOperatorGroups),
        argocd_readonly_groups: safeTrim(argoCdReadonlyGroups),
        argocd_sync_strategy: safeTrim(argoCdSyncStrategy),
        gitrepourl: safeTrim(argoCdGitUrl),
      };

      await saveAppArgoCD(env, name, payload);

      setArgoCdExists(true);
      setShowArgoCd(false);
      if (typeof onRefreshApps === "function") {
        await onRefreshApps();
      }
    } catch (e) {
      alert(formatError(e));
    }
  }

  async function onDeleteArgoCd() {
    try {
      const name = safeTrim(argoCdAppName);
      if (!name) throw new Error("App Name is required.");
      if (!env) throw new Error("Environment is required.");

      await deleteAppArgoCD(env, name);

      setArgoCdExists(false);
      setArgoCdAdminGroups("");
      setArgoCdOperatorGroups("");
      setArgoCdReadonlyGroups("");
      setArgoCdSyncStrategy("auto");
      setArgoCdGitUrl("");
      setShowArgoCd(false);
      if (typeof onRefreshApps === "function") {
        await onRefreshApps();
      }
    } catch (e) {
      alert(formatError(e));
    }
  }

  const canSubmitEdit = React.useMemo(() => {
    return isNonEmptyString(editAppName) && isNonEmptyString(editDescription) && isNonEmptyString(editManagedBy);
  }, [editAppName, editDescription, editManagedBy]);

  function openEditApp(row) {
    const r = row || {};
    const name = safeTrim(r?.appname);
    setEditAppName(name);
    setEditDescription(safeTrim(r?.description));
    setEditManagedBy(safeTrim(r?.managedby));
    setShowEdit(true);
  }

  async function onSubmitEdit() {
    try {
      if (typeof onUpdateApp !== "function") return;
      const target = safeTrim(editAppName);
      if (!target) throw new Error("App Name is required.");
      await onUpdateApp(target, {
        appname: target,
        description: editDescription,
        managedby: editManagedBy,
      });
      setShowEdit(false);
    } catch (e) {
      alert(formatError(e));
    }
  }

  async function onSubmitCreate() {
    try {
      if (typeof onCreateApp !== "function") return;
      await onCreateApp({
        appname: newAppName,
        description: newDescription,
        managedby: newManagedBy,
      });
      onCloseCreate();
      setNewAppName("");
      setNewDescription("");
      setNewManagedBy("");
    } catch (e) {
      alert(formatError(e));
    }
  }

  return (
    <AppsTableView
      filteredRows={sortedRows}
      allSelected={allSelected}
      filters={filters}
      setFilters={setFilters}
      env={env}
      clustersByApp={clustersByApp}
      selectedApps={selectedApps}
      onToggleRow={onToggleRow}
      onSelectAll={onSelectAll}
      onDeleteApp={onDeleteApp}
      onViewDetails={onViewDetails}
      onCreateApp={onSubmitCreate}
      showCreate={showCreate}
      onCloseCreate={onCloseCreate}
      requestsChanges={requestsChanges}
      readonly={readonly}
      newAppName={newAppName}
      setNewAppName={setNewAppName}
      newDescription={newDescription}
      setNewDescription={setNewDescription}
      newManagedBy={newManagedBy}
      setNewManagedBy={setNewManagedBy}
      canSubmitCreate={canSubmitCreate}
      showEdit={showEdit}
      setShowEdit={setShowEdit}
      editAppName={editAppName}
      editDescription={editDescription}
      setEditDescription={setEditDescription}
      editManagedBy={editManagedBy}
      setEditManagedBy={setEditManagedBy}
      canSubmitEdit={canSubmitEdit}
      openEditApp={openEditApp}
      onSubmitEdit={onSubmitEdit}
      showArgoCd={showArgoCd}
      argoCdAppName={argoCdAppName}
      argoCdExists={argoCdExists}
      argoCdAdminGroups={argoCdAdminGroups}
      setArgoCdAdminGroups={setArgoCdAdminGroups}
      argoCdOperatorGroups={argoCdOperatorGroups}
      setArgoCdOperatorGroups={setArgoCdOperatorGroups}
      argoCdReadonlyGroups={argoCdReadonlyGroups}
      setArgoCdReadonlyGroups={setArgoCdReadonlyGroups}
      argoCdSyncStrategy={argoCdSyncStrategy}
      setArgoCdSyncStrategy={setArgoCdSyncStrategy}
      argoCdGitUrl={argoCdGitUrl}
      setArgoCdGitUrl={setArgoCdGitUrl}
      canSubmitArgoCd={canSubmitArgoCd}
      openArgoCd={openArgoCd}
      closeArgoCd={closeArgoCd}
      onSubmitArgoCd={onSubmitArgoCd}
      onDeleteArgoCd={onDeleteArgoCd}

      showRequestAccess={showRequestAccess}
      requestAccessAppName={requestAccessAppName}
      requestAccessRole={requestAccessRole}
      setRequestAccessRole={setRequestAccessRole}
      requestAccessUserid={requestAccessUserid}
      setRequestAccessUserid={setRequestAccessUserid}
      requestAccessGroup={requestAccessGroup}
      setRequestAccessGroup={setRequestAccessGroup}
      canSubmitRequestAccess={canSubmitRequestAccess}
      openRequestAccess={openRequestAccess}
      closeRequestAccess={closeRequestAccess}
      onSubmitRequestAccess={onSubmitRequestAccess}
    />
  );
}
