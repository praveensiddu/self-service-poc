/**
 * NamespaceDetailsView - Pure presentational component for namespace details.
 *
 * Displays namespace information in a card-based layout with:
 * - Basic Information card (clusters, ArgoCD settings)
 * - Egress Configuration card (egress ID, pod-based egress)
 * - Role Bindings card (subjects, role refs)
 * - Egress Firewall card (DNS names, CIDR selectors)
 * - ResourceQuota card (CPU, memory, storage limits)
 * - LimitRange card (default requests and limits)
 *
 * All business logic is handled by the container.
 * This component only renders UI based on props.
 *
 * @param {Object} props - Component props (see container for details)
 */
function NamespaceDetailsView({
  namespace,
  isEditingBasic,
  isEditingEgress,
  isEditingRoleBindings,
  isEditingEgressFirewall,
  isEditingResourceQuota,
  isEditingLimitRange,
  getHeaderProps,
  // Computed values from hook
  formatValue,
  filteredClusterOptions,
  effectiveNamespace,
  displayValues,
  egressFirewallRules,
  // Draft states
  draftBasic,
  setDraftBasic,
  clusterQuery,
  setClusterQuery,
  clusterPickerOpen,
  setClusterPickerOpen,
  draftEgress,
  setDraftEgress,
  draftEgressFirewallEntries,
  setDraftEgressFirewallEntries,
  draftResources,
  setDraftResources,
  draftRoleBindingsEntries,
  setDraftRoleBindingsEntries,
  // Other props
  roleCatalogByKind,
  fetchRoleBindingYaml,
  fetchResourceQuotaYaml,
  fetchLimitRangeYaml,
  fetchEgressFirewallYaml,
  previewEgressFirewallWithDraft,
}) {
  if (!namespace) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p className="muted">No namespace data available.</p>
      </div>
    );
  }

  // Extract display values for child components
  const { clusters, egressNameId, podBasedEgress, managedByArgo, resources, rolebindings } = displayValues;

  return (
    <div>
      {/* Overview Cards Grid - Two Column Layout: 3/4 and 1/4 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', marginTop: '12px', alignItems: 'start' }}>
        {/* Left Column - Basic Information, Egress Configuration, and Role Bindings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Row: Basic Information and Egress Configuration side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <NamespaceBasicInfoCard
              header={getHeaderProps("basic", isEditingBasic)}
              clusters={clusters}
              managedByArgo={managedByArgo}
              effectiveNamespace={effectiveNamespace}
              clusterQuery={clusterQuery}
              setClusterQuery={setClusterQuery}
              clusterPickerOpen={clusterPickerOpen}
              setClusterPickerOpen={setClusterPickerOpen}
              filteredClusterOptions={filteredClusterOptions}
              draft={draftBasic}
              setDraft={setDraftBasic}
              formatValue={formatValue}
            />

            <NamespaceEgressConfigCard
              header={getHeaderProps("egress", isEditingEgress)}
              egressNameId={egressNameId}
              podBasedEgress={podBasedEgress}
              draft={draftEgress}
              setDraft={setDraftEgress}
            />
          </div>
          <NamespaceRoleBindingsCard
            header={getHeaderProps("rolebindings", isEditingRoleBindings)}
            draftRoleBindingsEntries={draftRoleBindingsEntries}
            setDraftRoleBindingsEntries={setDraftRoleBindingsEntries}
            roleCatalogByKind={roleCatalogByKind}
            fetchRoleBindingYaml={fetchRoleBindingYaml}
            rolebindings={rolebindings}
          />

          <NamespaceEgressFirewallCard
            header={getHeaderProps("egressfirewall", isEditingEgressFirewall)}
            draftEgressFirewallEntries={draftEgressFirewallEntries}
            setDraftEgressFirewallEntries={setDraftEgressFirewallEntries}
            previewEgressFirewallWithDraft={previewEgressFirewallWithDraft}
            egressFirewallRules={egressFirewallRules}
            fetchEgressFirewallYaml={fetchEgressFirewallYaml}
            formatValue={formatValue}
            allowAllEgress={Boolean(namespace?.allow_all_egress)}
          />
        </div>

        {/* Right Column - Resources (1/3 width) */}
        <div>
          <NamespaceResourceQuotaCard
            header={getHeaderProps("resourcequota", isEditingResourceQuota)}
            resources={resources}
            formatValue={formatValue}
            draft={draftResources}
            setDraft={setDraftResources}
            fetchResourceQuotaYaml={fetchResourceQuotaYaml}
          />

          <div style={{ height: 16 }} />

          <NamespaceLimitRangeCard
            header={getHeaderProps("limitrange", isEditingLimitRange)}
            resources={resources}
            formatValue={formatValue}
            draft={draftResources}
            setDraft={setDraftResources}
            fetchLimitRangeYaml={fetchLimitRangeYaml}
          />
        </div>
      </div>
    </div>
  );
}
