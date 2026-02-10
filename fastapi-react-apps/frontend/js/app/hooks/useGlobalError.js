/**
 * useGlobalError Hook - Centralized error and modal state management.
 *
 * This hook provides:
 * - Global loading state
 * - Error state and error modal
 * - Delete warning modal state
 *
 * Use this hook to centralize error handling across the application.
 */

/**
 * Custom hook for managing global error and loading state.
 * @returns {Object} - Error/loading state and operations
 */
function useGlobalError() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showErrorModal, setShowErrorModal] = React.useState(false);
  const [showDeleteWarningModal, setShowDeleteWarningModal] = React.useState(false);
  const [deleteWarningData, setDeleteWarningData] = React.useState(null);

  /**
   * Show an error message.
   * @param {string|Error} err - Error message or Error object
   * @param {boolean} [showModal=false] - Whether to show error modal
   */
  const showError = React.useCallback((err, showModal = false) => {
    const message = err?.message || String(err);
    setError(message);
    if (showModal) {
      setShowErrorModal(true);
    }
  }, []);

  /**
   * Clear error state.
   */
  const clearError = React.useCallback(() => {
    setError("");
    setShowErrorModal(false);
  }, []);

  /**
   * Close error modal.
   */
  const closeErrorModal = React.useCallback(() => {
    setShowErrorModal(false);
    setError("");
  }, []);

  /**
   * Show delete warning modal.
   * @param {Object} data - Warning data to display
   */
  const showDeleteWarning = React.useCallback((data) => {
    setDeleteWarningData(data);
    setShowDeleteWarningModal(true);
  }, []);

  /**
   * Close delete warning modal.
   */
  const closeDeleteWarningModal = React.useCallback(() => {
    setShowDeleteWarningModal(false);
    setDeleteWarningData(null);
  }, []);

  /**
   * Execute an async operation with loading/error handling.
   * @param {Function} operation - Async function to execute
   * @param {Object} [options] - Options
   * @param {boolean} [options.showErrorModal=false] - Show error modal on failure
   * @param {boolean} [options.rethrow=false] - Rethrow error after handling
   * @returns {Promise<any>} - Operation result
   */
  const withLoading = React.useCallback(async (operation, options = {}) => {
    const { showErrorModal: showModal = false, rethrow = false } = options;
    try {
      setLoading(true);
      setError("");
      return await operation();
    } catch (e) {
      showError(e, showModal);
      if (rethrow) throw e;
      return null;
    } finally {
      setLoading(false);
    }
  }, [showError]);

  return {
    // State
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

    // Operations
    showError,
    clearError,
    closeErrorModal,
    showDeleteWarning,
    closeDeleteWarningModal,
    withLoading,
  };
}
