/**
 * NamespaceDetails Container - Manages state and business logic for namespace details.
 *
 * Responsibilities:
 * - Orchestrates three custom hooks for state management
 * - Manages cluster picker UI state
 * - Manages YAML preview modal state
 * - Passes computed values and handlers to the view
 *
 * @param {Object} props - Component props
 * @param {Object} props.namespace - Namespace data object
 * @param {string} props.namespaceName - Name of the namespace
 * @param {string} props.appname - Application name
 * @param {string} props.env - Environment key
 * @param {Function} props.onUpdateNamespaceInfo - Callback to update namespace info
 * @param {boolean} props.readonly - Whether the view is in readonly mode
 * @param {Function} props.renderHeaderButtons - Callback to render header buttons
 */
function NamespaceDetails({ namespace, namespaceName, appname, env, onUpdateNamespaceInfo, readonly, renderHeaderButtons }) {
  const { canManage } = useAuthorization();

  // Check if user has manage permission
  const hasManagePermission = canManage(namespace);

  // Combine readonly mode with permission check - if user doesn't have manage permission, treat as readonly
  const effectiveReadonly = readonly || !hasManagePermission;

  // Cluster picker state
  const [clusterQuery, setClusterQuery] = React.useState("");
  const [clusterPickerOpen, setClusterPickerOpen] = React.useState(false);

  // YAML Preview modal state
  const [yamlPreviewModal, setYamlPreviewModal] = React.useState({
    isOpen: false,
    title: "",
    yaml: "",
    infoMessage: "",
  });

  // Use edit state hook
  const {
    editBlock,
    isEditingBasic,
    isEditingEgress,
    isEditingRoleBindings,
    isEditingEgressFirewall,
    isEditingResourceQuota,
    isEditingLimitRange,
    draftBasic,
    setDraftBasic,
    draftEgress,
    setDraftEgress,
    draftResources,
    setDraftResources,
    draftRoleBindingsEntries,
    setDraftRoleBindingsEntries,
    draftEgressFirewallEntries,
    setDraftEgressFirewallEntries,
    canStartEditing,
    onEnableBlockEdit,
    onDiscardBlockEdits,
    onSaveBlock,
  } = useNamespaceDetailsEdit({
    namespace,
    namespaceName,
    appname,
    onUpdateNamespaceInfo,
    readonly: effectiveReadonly,
  });

  // Use API hook
  const {
    clusterOptions,
    roleCatalogByKind,
    fetchRoleBindingYaml,
    fetchResourceQuotaYaml,
    fetchLimitRangeYaml,
    fetchEgressFirewallYaml,
    getEgressFirewallPreviewYaml,
  } = useNamespaceDetailsApi({
    env,
    appname,
    namespaceName,
    editBlock,
  });

  // Use logic hook for computed values
  const {
    formatValue,
    filteredClusterOptions,
    effectiveNamespace,
    displayValues,
    egressFirewallRules,
  } = useNamespaceDetailsLogic({
    namespace,
    draftBasic,
    draftEgress,
    draftResources,
    draftEgressFirewallEntries,
    editBlock,
    clusterOptions,
    clusterQuery,
  });

  // Reset cluster query when closing edit
  React.useEffect(() => {
    if (!isEditingBasic) {
      setClusterQuery("");
      setClusterPickerOpen(false);
    }
  }, [isEditingBasic]);

  // Notify parent about header buttons
  React.useEffect(() => {
    if (typeof renderHeaderButtons === 'function' && !readonly) {
      renderHeaderButtons(null);
    }
    return () => {
      if (typeof renderHeaderButtons === 'function') {
        renderHeaderButtons(null);
      }
    };
  }, [readonly, renderHeaderButtons]);

  /**
   * Build header props for block components.
   * @param {string} blockKey - Block identifier
   * @param {boolean} isEditing - Whether block is in edit mode
   * @returns {Object} - Header props object
   */
  function getHeaderProps(blockKey, isEditing) {
    return {
      readonly,
      isEditing,
      blockKey,
      canStartEditing,
      onEnableBlockEdit,
      onDiscardBlockEdits,
      onSaveBlock,
      editDisabledReason:
        blockKey === "egressfirewall" && Boolean(namespace?.allow_all_egress)
          ? "Egress firewall enforcement is disabled (enforce_egress_firewall is set to no in Settings)."
          : "",
    };
  }

  /**
   * Close YAML preview modal.
   */
  function closeYamlPreviewModal() {
    setYamlPreviewModal({ isOpen: false, title: "", yaml: "", infoMessage: "" });
  }

  /**
   * Preview egress firewall with draft changes in a modal.
   */
  async function previewEgressFirewallWithDraft() {
    try {
      const egressYaml = await getEgressFirewallPreviewYaml(draftEgressFirewallEntries);
      setYamlPreviewModal({
        isOpen: true,
        title: "EgressFirewall Preview (Draft)",
        yaml: egressYaml,
        infoMessage: "This shows how the final EgressFirewall will look with your current changes. Save to apply these changes.",
      });
    } catch (err) {
      alert('Failed to generate preview: ' + String(err.message || err));
    }
  }

  return (
    <>
      <YamlPreviewModal
        isOpen={yamlPreviewModal.isOpen}
        onClose={closeYamlPreviewModal}
        title={yamlPreviewModal.title}
        yaml={yamlPreviewModal.yaml}
        infoMessage={yamlPreviewModal.infoMessage}
      />
      <NamespaceDetailsView
        namespace={namespace}
        isEditingBasic={isEditingBasic}
        isEditingEgress={isEditingEgress}
        isEditingRoleBindings={isEditingRoleBindings}
        isEditingEgressFirewall={isEditingEgressFirewall}
        isEditingResourceQuota={isEditingResourceQuota}
        isEditingLimitRange={isEditingLimitRange}
        getHeaderProps={getHeaderProps}
        // Computed values from hook
        formatValue={formatValue}
        filteredClusterOptions={filteredClusterOptions}
        effectiveNamespace={effectiveNamespace}
        displayValues={displayValues}
        egressFirewallRules={egressFirewallRules}
        // Draft states
        draftBasic={draftBasic}
        setDraftBasic={setDraftBasic}
        clusterQuery={clusterQuery}
        setClusterQuery={setClusterQuery}
        clusterPickerOpen={clusterPickerOpen}
        setClusterPickerOpen={setClusterPickerOpen}
        draftEgress={draftEgress}
        setDraftEgress={setDraftEgress}
        draftEgressFirewallEntries={draftEgressFirewallEntries}
        setDraftEgressFirewallEntries={setDraftEgressFirewallEntries}
        draftResources={draftResources}
        setDraftResources={setDraftResources}
        draftRoleBindingsEntries={draftRoleBindingsEntries}
        setDraftRoleBindingsEntries={setDraftRoleBindingsEntries}
        roleCatalogByKind={roleCatalogByKind}
        fetchRoleBindingYaml={fetchRoleBindingYaml}
        fetchResourceQuotaYaml={fetchResourceQuotaYaml}
        fetchLimitRangeYaml={fetchLimitRangeYaml}
        fetchEgressFirewallYaml={fetchEgressFirewallYaml}
        previewEgressFirewallWithDraft={previewEgressFirewallWithDraft}
      />
    </>
  );
}


