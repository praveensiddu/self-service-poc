/**
 * App Container - Main stateful component
 *
 * This is the primary container component that:
 * - Manages all application state
 * - Handles API interactions using services/apiClient.js
 * - Uses routing utilities from utils/url.js
 * - Passes data and callbacks to AppView (presentational component)
 *
 * Note: All helper functions (fetchJson, postJson, etc.) are globally available
 * since they are loaded via separate script tags before this file.
 */

function App() {
  const [envKeys, setEnvKeys] = React.useState([]);
  const [activeEnv, setActiveEnv] = React.useState("");
  const [readonly, setReadonly] = React.useState(false);
  const [envConfigured, setEnvConfigured] = React.useState(false);
  const [topTab, setTopTab] = React.useState("Home");


  // Use global error hook for centralized error and loading state
  const {
    loading,
    setLoading,
    error,
    setError,
    showErrorModal,
    setShowErrorModal,
    showDeleteWarningModal,
    setShowDeleteWarningModal,
    deleteWarningData,
    setDeleteWarningData,
    closeErrorModal,
    closeDeleteWarningModal,
  } = useGlobalError();

  // Use users hook for user state and demo mode management
  const {
    currentUser,
    currentUserRoles,
    currentUserContext,
    demoMode,
    bannerTitle,
    bannerColor,
    showChangeLoginUser,
    demoUsers,
    demoUsersLoading,
    demoUsersError,
    loadUserData,
    reloadUserData,
    openChangeLoginUser,
    closeChangeLoginUser,
    selectDemoUser,
  } = useUsers({
    setError,
  });

  // Use config hook for configuration management
  const {
    workspace,
    setWorkspace,
    requestsRepo,
    setRequestsRepo,
    templatesRepo,
    setTemplatesRepo,
    renderedManifestsRepo,
    setRenderedManifestsRepo,
    controlRepo,
    setControlRepo,
    configComplete,
    loadConfigData,
    saveConfigAndInitialize,
    useDefaultConfigAndInitialize,
    markConfigIncomplete,
    enforcementSettings,
    draftEnforcementSettings,
    setDraftEnforcementSettings,
    enforcementSettingsError,
    enforcementSettingsLoading,
    enforcementSettingsSuccess,
    loadEnforcementSettingsData,
    saveEnforcementSettingsWithErrorHandling,
  } = useConfig({
    setLoading,
    setError,
  });

  // Use apps hook for application management
  const {
    apps,
    clustersByApp,
    selectedApps,
    requestsChanges,
    appRows,
    loadAppsData,
    refreshApps,
    updateApp,
    deleteApp,
    refreshRequestsChangesData,
    toggleRow,
    onSelectAllFromFiltered,
    requireExactlyOneSelectedApp,
    openCreateAppWithClusters,
    createAppAndRefresh,
  } = useApps({
    activeEnv,
    setLoading,
    setError,
    setShowErrorModal,
  });

  // Use clusters hook for cluster management
  const {
    clustersByEnv,
    refreshClusters,
    addCluster,
    deleteCluster,
  } = useClusters({
    activeEnv,
    envKeys,
    setLoading,
    setError,
    setShowErrorModal,
    setShowDeleteWarningModal,
    setDeleteWarningData,
    onRefreshApps: refreshApps,
  });

  // Use namespaces hook for namespace management
  const {
    namespaces,
    selectedNamespaces,
    detailAppName,
    detailNamespace,
    detailNamespaceName,
    namespaceDetailsHeaderButtons,
    setNamespaceDetailsHeaderButtons,
    loadNamespacesData,
    createNamespace,
    deleteNamespace: deleteNamespaceFromHook,
    copyNamespace: copyNamespaceFromHook,
    loadNamespaceDetailsData,
    updateNamespaceInfo: updateNamespaceInfoFromHook,
    toggleNamespace,
    onSelectAllNamespaces,
    resetNamespacesState,
    clearDetailState,
  } = useNamespaces({
    activeEnv,
    setLoading,
    setError,
    setShowErrorModal,
  });

  const argocdEnabled = React.useMemo(() => {
    const appKey = String(detailAppName || "").trim();
    if (!appKey) return false;
    const row = (apps || {})[appKey];
    return Boolean(row?.argocd);
  }, [apps, detailAppName]);

  // Use L4 Ingress hook for L4 Ingress management
  const {
    l4IngressItems,
    l4IngressAddButton,
    setL4IngressAddButton,
    detailAppName: l4IngressAppName,
    loadL4IngressData,
    resetL4IngressState,
  } = useL4Ingress({
    activeEnv,
  });

  // Use Egress IPs hook for Egress IPs management
  const {
    egressIpItems,
    detailAppName: egressIpsAppName,
    loadEgressIpsData,
    resetEgressIpsState,
  } = useEgressIps({
    activeEnv,
  });

  // Use access requests hook for access requests management
  const {
    accessRequests,
    accessRequestStatusByKey,
    loadAccessRequestsData,
    grantAccessRequest,
    getAccessRequestKey,
  } = useAccessRequests({
    setLoading,
    setError,
  });

  // Use modals hook for modal visibility
  const {
    showCreateApp,
    openCreateApp,
    closeCreateApp,
    showCreateNamespace,
    openCreateNamespace,
    closeCreateNamespace,
    showCreateCluster,
    openCreateCluster,
    closeCreateCluster,
  } = useModals();

  // Use centralized permissions hook for UI controls
  const {
    canCreateApps: canUserCreateApps,
    canCreateNamespaces: canUserCreateNamespaces,
    canAccessAdminSettings: allowAdminPages,
  } = usePermissions({
    currentUserContext,
    appName: detailAppName,
  });

  const {
    pendingRoute,
    setPendingRoute,
    view,
    setView,
    setTopTabWithUrl,
    initializeRouting,
  } = useUiRouting({
    configComplete,
    allowAdminPages,
    envKeys,
    activeEnv,
    setActiveEnv,
    setTopTab,
    onResetNamespacesState: () => {
      setView("apps");
      resetNamespacesState();
      resetL4IngressState();
      resetEgressIpsState();
    },
  });


  // Initial data load effect
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [, portalMode] = await Promise.all([
          loadUserData(),
          loadPortalMode(),
        ]);

        if (cancelled) return;

        setReadonly(portalMode?.readonly || false);
        setEnvConfigured(Boolean(portalMode?.env_configured));

        const { isComplete } = await loadConfigData();
        if (cancelled) return;

        const initial = parseUiRouteFromLocation();
        setPendingRoute(initial);

        let keys = [];
        let initialEnv = "";
        if (isComplete) {
          let envList;
          try {
            envList = await loadEnvList();
          } catch {
            if (cancelled) return;
            markConfigIncomplete();
            setEnvKeys([]);
            setActiveEnv("");
            setTopTab("Home");
            window.history.replaceState({ topTab: "Home" }, "", "/home");
            return;
          }

          if (cancelled) return;
          keys = Object.keys(envList);
          initialEnv = keys.includes(initial.env) ? initial.env : (keys[0] || "");
        }

        setEnvKeys(keys);
        setActiveEnv(initialEnv);

        // Initialize routing using the hook
        initializeRouting(isComplete, keys, initialEnv);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadUserData]);

  // Redirect to Home if config is incomplete
  React.useEffect(() => {
    if (!configComplete && topTab !== "Home") {
      setTopTab("Home");
    }
  }, [configComplete, topTab]);

  // Load enforcement settings when on Settings tab
  React.useEffect(() => {
    if (!configComplete || topTab !== "Settings") return;
    loadEnforcementSettingsData();
  }, [configComplete, topTab, loadEnforcementSettingsData]);

  // Load apps when environment changes
  React.useEffect(() => {
    if (!activeEnv) return;
    if (isPrsPath()) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        await loadAppsData();
        if (cancelled) return;

        setView("apps");
        resetNamespacesState();

        const pr = pendingRoute;
        if (pr && (pr.env || "").toUpperCase() === (activeEnv || "").toUpperCase()) {
          if (pr.view === "namespaces" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            await openNamespaces(pr.appname, false);
          } else if (pr.view === "l4ingress" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            await openL4Ingress(pr.appname, false);
          } else if (pr.view === "egressips" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            await openEgressIps(pr.appname, false);
          } else if (pr.view === "namespaceDetails" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            const nsName = pr.ns || "";
            if (nsName) {
              await viewNamespaceDetails(nsName, null, pr.appname);
            }
          } else {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeEnv]);

  // Load requests/changes when environment changes
  React.useEffect(() => {
    if (!activeEnv) return;
    refreshRequestsChangesData();
  }, [activeEnv, refreshRequestsChangesData]);

  // Load clusters when on Clusters tab
  React.useEffect(() => {
    if (!configComplete) return;
    if (topTab !== "Clusters") return;

    const effectiveEnv = activeEnv || (envKeys[0] || "");
    if (effectiveEnv && effectiveEnv !== activeEnv) setActiveEnv(effectiveEnv);

    (async () => {
      try {
        setLoading(true);
        setError("");
        await refreshClusters(effectiveEnv);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [topTab, configComplete, activeEnv, envKeys, refreshClusters]);

  // Load access requests when on Access Requests tab
  React.useEffect(() => {
    if (!configComplete || topTab !== "Access Requests") return;
    loadAccessRequestsData();
  }, [topTab, configComplete, loadAccessRequestsData]);

  // ============================================================================
  // CONFIG HANDLERS
  // ============================================================================

  /**
   * Save configuration settings and initialize environment.
   * After successful save, loads environment list and navigates to apps view.
   */
  async function onSaveConfig() {
    const { isComplete, envKeys: keys, initialEnv } = await saveConfigAndInitialize();

    if (isComplete) {
      setEnvKeys(keys);
      setActiveEnv(initialEnv);
      setPendingRoute({ env: initialEnv, view: "apps", appname: "", ns: "" });
      if (initialEnv) pushUiUrl({ view: "apps", env: initialEnv, appname: "", ns: "" }, false);
      setTopTab("Request provisioning");
    }
  }

  /**
   * Use default configuration settings and initialize environment.
   * After successful save, loads environment list and navigates to apps view.
   */
  async function onUseDefaults() {
    try {
      const { isComplete, envKeys: keys, initialEnv } = await useDefaultConfigAndInitialize(reloadUserData);

      if (isComplete) {
        setEnvKeys(keys);
        setActiveEnv(initialEnv);
        setPendingRoute({ env: initialEnv, view: "apps", appname: "", ns: "" });
        if (initialEnv) pushUiUrl({ view: "apps", env: initialEnv, appname: "", ns: "" }, false);
        setTopTab("Request provisioning");
      }
    } catch (e) {
      setShowErrorModal(true);
    }
  }

  /**
   * Save enforcement settings (egress firewall / egress IP).
   */
  const onSaveEnforcementSettings = saveEnforcementSettingsWithErrorHandling;

  /**
   * Get the application name from either detail view or selected app.
   * Returns detailAppName if in detail view, otherwise requires exactly one selected app.
   * @returns {string|null} - Application name or null if validation fails
   */
  function getDetailOrSelectedApp() {
    if (detailAppName) return detailAppName;
    return requireExactlyOneSelectedApp(setError, setShowErrorModal);
  }

  /**
   * Open the create app modal.
   * Refreshes cluster list before opening to ensure latest data.
   */
  async function onOpenCreateApp() {
    await openCreateAppWithClusters(refreshClusters, openCreateApp);
  }

  /**
   * Create a new app and refresh the apps list.
   * @param {Object} payload - App creation payload
   */
  async function onCreateApp(payload) {
    await createAppAndRefresh(payload, closeCreateApp);
  }

  // ============================================================================
  // NAMESPACE HANDLERS
  // ============================================================================

  /**
   * Load namespaces for an application and navigate to namespaces view.
   * @param {string} appname - Application name to load namespaces for
   * @param {boolean} [push=true] - Whether to push URL to browser history
   * @returns {Promise<Object>} - Namespaces data
   */
  async function openNamespaces(appname, push = true) {
    if (!appname) return;

    try {
      const resp = await loadNamespacesData(appname);
      setView("namespaces");
      if (push) pushUiUrl({ view: "namespaces", env: activeEnv, appname }, false);
      return resp;
    } catch (e) {
      const errorMessage = e?.message || String(e);
      // Show alert for access denied errors
      if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
        alert(`Access Denied: You don't have permission to view "${appname}". Please contact your administrator to request access.`);
      } else {
        // For other errors, still show the error message
        alert(`Failed to load application details: ${errorMessage}`);
      }
      // Don't re-throw - error has been handled
      return null;
    }
  }

  /**
   * View namespaces for the currently selected or detailed app.
   * Determines app from either detail view or selected apps list.
   */
  async function onViewNamespaces() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openNamespaces(appname, true);
  }

  /**
   * Create a new namespace for the current app.
   * @param {Object} payload - Namespace creation payload
   * @param {string} payload.namespace - Namespace name
   * @param {string[]} [payload.clusters] - List of clusters
   * @param {boolean} [payload.need_argo] - Whether ArgoCD is needed
   * @param {string} [payload.egress_nameid] - Egress name ID
   */
  async function onCreateNamespace(payload) {
    const appname = detailAppName;
    if (!appname) throw new Error("No application selected.");

    const namespace = String(payload?.namespace || "").trim();
    if (!namespace) throw new Error("Namespace name is required.");

    // Create namespace using hook (service handles ArgoCD setup automatically)
    await createNamespace(appname, payload);

    // Refresh the apps list to update totalns count
    await refreshApps();
  }

  /**
   * Delete a namespace and refresh apps list.
   * @param {string} namespaceName - Name of namespace to delete
   */
  async function deleteNamespace(namespaceName) {
    const deleted = await deleteNamespaceFromHook(detailAppName, namespaceName);

    if (!deleted) {
      return;
    }

    // Refresh apps list to update totalns count
    await refreshApps();
  }

  /**
   * Copy a namespace to another environment.
   * @param {string} fromNamespace - Source namespace name
   * @param {Object} payload - Copy payload
   * @param {string} payload.from_env - Source environment
   * @param {string} payload.to_env - Target environment
   * @param {string} payload.to_namespace - Target namespace name
   */
  async function onCopyNamespace(fromNamespace, payload) {
    try {
      await copyNamespaceFromHook(detailAppName, fromNamespace, payload);
      await refreshApps();
    } catch (e) {
      setError(e?.message || String(e));
      setShowErrorModal(true);
    }
  }

  /**
   * View detailed information for a specific namespace.
   * @param {string} namespaceName - Namespace name to view
   * @param {Object} [namespaceData] - Optional namespace data (unused, kept for compatibility)
   * @param {string} [appnameOverride] - Optional app name override
   */
  async function viewNamespaceDetails(namespaceName, namespaceData, appnameOverride) {
    const appname = appnameOverride || detailAppName;
    if (!appname) {
      setError("No application selected.");
      setShowErrorModal(true);
      return;
    }
    if (!namespaceName) {
      setError("No namespace selected.");
      return;
    }

    await loadNamespaceDetailsData(appname, namespaceName);
    setView("namespaceDetails");
    pushUiUrl({ view: "namespaceDetails", env: activeEnv, appname, ns: namespaceName }, false);
  }

  /**
   * Update namespace information (resources, role bindings, ArgoCD, etc.).
   * @param {string} namespaceName - Namespace name to update
   * @param {Object} updates - Update payload
   * @returns {Promise<Object>} - Updated namespace data
   */
  function onUpdateNamespaceInfo(namespaceName, updates) {
    return updateNamespaceInfoFromHook(detailAppName, namespaceName, updates);
  }

  /**
   * Navigate back from namespace details to namespaces list.
   * Clears detail state and returns to namespaces view for the current app.
   */
  async function onBackFromNamespaceDetails() {
    clearDetailState();

    const appname = detailAppName;
    if (!appname) {
      setView("namespaces");
      pushUiUrl({ view: "namespaces", env: activeEnv, appname: detailAppName }, false);
      return;
    }

    await openNamespaces(appname, true);
  }

  // ============================================================================
  // L4 INGRESS & EGRESS IP HANDLERS
  // ============================================================================

  /**
   * Load L4 ingress data for an application and navigate to L4 ingress view.
   * @param {string} appname - Application name
   * @param {boolean} [push=true] - Whether to push URL to browser history
   */
  async function openL4Ingress(appname, push = true) {
    if (!appname) return;
    await loadL4IngressData(appname);
    setView("l4ingress");
    if (push) pushUiUrl({ view: "l4ingress", env: activeEnv, appname }, false);
  }

  /**
   * View L4 ingress for the currently selected or detailed app.
   * Determines app from either detail view or selected apps list.
   */
  async function onViewL4Ingress() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openL4Ingress(appname, true);
  }

  /**
   * Load egress IPs for an application and navigate to egress IPs view.
   * @param {string} appname - Application name
   * @param {boolean} [push=true] - Whether to push URL to browser history
   */
  async function openEgressIps(appname, push = true) {
    if (!appname) return;
    await loadEgressIpsData(appname);
    setView("egressips");
    if (push) pushUiUrl({ view: "egressips", env: activeEnv, appname }, false);
  }

  /**
   * View egress IPs for the currently selected or detailed app.
   * Determines app from either detail view or selected apps list.
   */
  async function onViewEgressIps() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openEgressIps(appname, true);
  }

  const onRemoveEgressIpAllocation = React.useCallback(async (row) => {
    try {
      if (readonly) return;
      if (!activeEnv) throw new Error("No env selected.");

      const appname = String(egressIpsAppName || detailAppName || "").trim();
      if (!appname) throw new Error("No app selected.");

      const cluster = String(row?.cluster || "").trim();
      const allocationId = String(row?.allocation_id || "").trim();
      const namespaces = Array.isArray(row?.namespaces) ? row.namespaces : [];
      if (!cluster) throw new Error("Missing cluster.");
      if (!allocationId) throw new Error("Missing allocation_id.");
      if (namespaces.length > 0) {
        throw new Error("Cannot remove allocation that is still used by namespaces.");
      }

      const ips = Array.isArray(row?.allocated_ips) ? row.allocated_ips : [];
      const ipText = String(ips?.[0] || "").trim();

      const ok = window.confirm(
        `Release allocation '${allocationId}' ip=${ipText} from cluster '${cluster}' to free pool?`,
      );
      if (!ok) return;

      await removeEgressIpAllocation(activeEnv, appname, cluster, allocationId);
      await loadEgressIpsData(appname);
    } catch (e) {
      setError(e?.message || String(e));
      setShowErrorModal(true);
    }
  }, [readonly, activeEnv, egressIpsAppName, detailAppName, loadEgressIpsData, setError, setShowErrorModal]);

  // ============================================================================
  // CLUSTER HANDLERS
  // ============================================================================

  /**
   * Add a new cluster to the environment.
   * The useClusters hook handles both cluster creation and app list refresh.
   */
  const onAddCluster = addCluster;

  /**
   * Delete a cluster from the environment.
   * The useClusters hook handles cluster deletion and app list refresh.
   * This wrapper additionally refreshes view-specific data if viewing app details.
   */
  const onDeleteCluster = React.useCallback(async (clustername) => {
    const result = await deleteCluster(clustername);

    // If deletion didn't complete (user cancelled or dependencies exist), exit
    if (!result?.deleted) {
      return;
    }

    // Refresh view-specific data if we're viewing app details
    if (detailAppName) {
      try {
        if (view === "namespaces") {
          await loadNamespacesData(detailAppName);
        } else if (view === "namespaceDetails" && detailNamespaceName) {
          await loadNamespacesData(detailAppName);
          await viewNamespaceDetails(detailNamespaceName, null, detailAppName);
        } else if (view === "l4ingress") {
          await loadL4IngressData(detailAppName);
        } else if (view === "egressips") {
          await loadEgressIpsData(detailAppName);
        }
      } catch (e) {
        setError(e?.message || String(e));
      }
    }
  }, [deleteCluster, detailAppName, view, detailNamespaceName, loadNamespacesData, viewNamespaceDetails, loadL4IngressData, loadEgressIpsData, setError]);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  /**
   * Handle environment change from UI.
   * Updates active environment and navigates to apps view.
   * @param {string} env - Environment name to switch to
   */
  function onEnvClick(env) {
    setActiveEnv(env);
    pushUiUrl({ view: "apps", env, appname: "" }, false);
  }

  /**
   * Navigate back to apps list view.
   * Resets namespace state, clears errors, and updates URL.
   */
  function onBackToApps() {
    setView("apps");
    resetNamespacesState();
    resetL4IngressState();
    resetEgressIpsState();
    setError("");
    pushUiUrl({ view: "apps", env: activeEnv, appname: "" }, false);
  }

  return (
    <AppView
      bannerColor={bannerColor}
      bannerTitle={bannerTitle}
      currentUser={currentUser}
      currentUserContext={currentUserContext}
      demoMode={demoMode}
      showChangeLoginUser={showChangeLoginUser}
      demoUsers={demoUsers}
      demoUsersLoading={demoUsersLoading}
      demoUsersError={demoUsersError}
      onOpenChangeLoginUser={openChangeLoginUser}
      onCloseChangeLoginUser={closeChangeLoginUser}
      onSelectDemoUser={selectDemoUser}
      envKeys={envKeys}
      activeEnv={activeEnv}
      loading={loading}
      view={view}
      error={error}
      showErrorModal={showErrorModal}
      onCloseErrorModal={closeErrorModal}
      showDeleteWarningModal={showDeleteWarningModal}
      deleteWarningData={deleteWarningData}
      onCloseDeleteWarningModal={closeDeleteWarningModal}
      topTab={topTab}
      configComplete={configComplete}
      readonly={readonly}
      envConfigured={envConfigured}
      allowAdminPages={allowAdminPages}
      canUserCreateApps={canUserCreateApps}
      canUserCreateNamespaces={canUserCreateNamespaces}
      onTopTabChange={setTopTabWithUrl}
      accessRequests={accessRequests}
      accessRequestStatusByKey={accessRequestStatusByKey}
      onGrantAccessRequest={grantAccessRequest}
      getAccessRequestKey={getAccessRequestKey}
      clustersByEnv={clustersByEnv}
      onAddCluster={onAddCluster}
      onDeleteCluster={onDeleteCluster}
      showCreateCluster={showCreateCluster}
      onOpenCreateCluster={openCreateCluster}
      onCloseCreateCluster={closeCreateCluster}
      workspace={workspace}
      setWorkspace={setWorkspace}
      requestsRepo={requestsRepo}
      setRequestsRepo={setRequestsRepo}
      templatesRepo={templatesRepo}
      setTemplatesRepo={setTemplatesRepo}
      renderedManifestsRepo={renderedManifestsRepo}
      setRenderedManifestsRepo={setRenderedManifestsRepo}
      controlRepo={controlRepo}
      setControlRepo={setControlRepo}
      onSaveConfig={onSaveConfig}
      onUseDefaults={onUseDefaults}
      enforcementSettings={enforcementSettings}
      draftEnforcementSettings={draftEnforcementSettings}
      setDraftEnforcementSettings={setDraftEnforcementSettings}
      enforcementSettingsError={enforcementSettingsError}
      enforcementSettingsLoading={enforcementSettingsLoading}
      enforcementSettingsSuccess={enforcementSettingsSuccess}
      onSaveEnforcementSettings={onSaveEnforcementSettings}
      onEnvClick={onEnvClick}
      onViewL4Ingress={onViewL4Ingress}
      onViewEgressIps={onViewEgressIps}
      onViewNamespaces={onViewNamespaces}
      onBackToApps={onBackToApps}
      onBackFromNamespaceDetails={onBackFromNamespaceDetails}
      appRows={appRows}
      clustersByApp={clustersByApp}
      apps={apps}
      selectedApps={selectedApps}
      toggleRow={toggleRow}
      onSelectAllFromFiltered={onSelectAllFromFiltered}
      deleteApp={deleteApp}
      updateApp={updateApp}
      openNamespaces={openNamespaces}
      onCreateApp={onCreateApp}
      showCreateApp={showCreateApp}
      onOpenCreateApp={onOpenCreateApp}
      onCloseCreateApp={closeCreateApp}
      detailNamespace={detailNamespace}
      detailNamespaceName={detailNamespaceName}
      namespaces={namespaces}
      selectedNamespaces={selectedNamespaces}
      toggleNamespace={toggleNamespace}
      onSelectAllNamespaces={onSelectAllNamespaces}
      deleteNamespace={deleteNamespace}
      onCopyNamespace={onCopyNamespace}
      viewNamespaceDetails={viewNamespaceDetails}
      onUpdateNamespaceInfo={onUpdateNamespaceInfo}
      onCreateNamespace={onCreateNamespace}
      showCreateNamespace={showCreateNamespace}
      onOpenCreateNamespace={openCreateNamespace}
      onCloseCreateNamespace={closeCreateNamespace}
      detailAppName={detailAppName}
      argocdEnabled={argocdEnabled}
      requestsChanges={requestsChanges}
      l4IngressItems={l4IngressItems}
      l4IngressAppName={l4IngressAppName}
      egressIpItems={egressIpItems}
      egressIpsAppName={egressIpsAppName}
      onRemoveEgressIpAllocation={onRemoveEgressIpAllocation}
      namespaceDetailsHeaderButtons={namespaceDetailsHeaderButtons}
      onSetNamespaceDetailsHeaderButtons={setNamespaceDetailsHeaderButtons}
      l4IngressAddButton={l4IngressAddButton}
      onSetL4IngressAddButton={setL4IngressAddButton}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
