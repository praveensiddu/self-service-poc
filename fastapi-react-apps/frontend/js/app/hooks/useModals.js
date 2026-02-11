/**
 * useModals Hook - Manages modal visibility state.
 *
 * This hook provides:
 * - Modal visibility states
 * - Open/close handlers for each modal
 *
 * Centralizes modal state management for better organization.
 */

/**
 * Custom hook for managing modal visibility.
 * @returns {Object} - Modal states and handlers
 */
function useModals() {
  const [showCreateApp, setShowCreateApp] = React.useState(false);
  const [showCreateNamespace, setShowCreateNamespace] = React.useState(false);
  const [showCreateCluster, setShowCreateCluster] = React.useState(false);

  const openCreateApp = React.useCallback(() => setShowCreateApp(true), []);
  const closeCreateApp = React.useCallback(() => setShowCreateApp(false), []);

  const openCreateNamespace = React.useCallback(() => setShowCreateNamespace(true), []);
  const closeCreateNamespace = React.useCallback(() => setShowCreateNamespace(false), []);

  const openCreateCluster = React.useCallback(() => setShowCreateCluster(true), []);
  const closeCreateCluster = React.useCallback(() => setShowCreateCluster(false), []);

  return {
    // App modal
    showCreateApp,
    openCreateApp,
    closeCreateApp,

    // Namespace modal
    showCreateNamespace,
    openCreateNamespace,
    closeCreateNamespace,

    // Cluster modal
    showCreateCluster,
    openCreateCluster,
    closeCreateCluster,
  };
}
