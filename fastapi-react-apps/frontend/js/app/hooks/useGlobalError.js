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
  const [error, setErrorState] = React.useState("");
  const [showErrorModal, setShowErrorModal] = React.useState(false);
  const [showDeleteWarningModal, setShowDeleteWarningModal] = React.useState(false);
  const [deleteWarningData, setDeleteWarningData] = React.useState(null);

  /**
   * Set error and automatically show modal (unless it's a permission error).
   * This is the main error setter - it always shows errors in modal, never in banner.
   * @param {string|Error} err - Error message or Error object
   */
  const setError = React.useCallback((err) => {
    if (!err) {
      setErrorState("");
      setShowErrorModal(false);
      return;
    }

    const message = err?.message || String(err);

    // Check if it's a permission error (handled separately with alerts)
    const isPermissionError = message.includes("Access denied") ||
                              message.includes("403") ||
                              message.includes("Forbidden");

    if (!isPermissionError) {
      setErrorState(message);
      setShowErrorModal(true);
    }
  }, []);

  /**
   * Show an error message with modal.
   * @param {string|Error} err - Error message or Error object
   * @param {boolean} [showModal=true] - Whether to show error modal (default true)
   */
  const showError = React.useCallback((err, showModal = true) => {
    const message = err?.message || String(err);
    setErrorState(message);
    if (showModal) {
      setShowErrorModal(true);
    }
  }, []);

  /**
   * Clear error state.
   */
  const clearError = React.useCallback(() => {
    setErrorState("");
    setShowErrorModal(false);
  }, []);

  /**
   * Close error modal.
   */
  const closeErrorModal = React.useCallback(() => {
    setShowErrorModal(false);
    setErrorState("");
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
   * @param {boolean} [options.showErrorModal=true] - Show error modal on failure (default true)
   * @param {boolean} [options.rethrow=false] - Rethrow error after handling
   * @returns {Promise<any>} - Operation result
   */
  const withLoading = React.useCallback(async (operation, options = {}) => {
    const { showErrorModal: showModal = true, rethrow = false } = options;
    try {
      setLoading(true);
      setError("");
      return await operation();
    } catch (e) {
      if (showModal) {
        setError(e);
      }
      if (rethrow) throw e;
      return null;
    } finally {
      setLoading(false);
    }
  }, [setError]);

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
