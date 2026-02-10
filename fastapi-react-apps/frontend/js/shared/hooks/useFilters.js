/**
 * useFilters Hook - Reusable filtering logic for tables.
 *
 * This hook provides:
 * - Filter state management
 * - Filter update operations
 * - Reset functionality
 *
 * Usage:
 *   const { filters, setFilters, updateFilter, resetFilters } = useFilters({
 *     name: "",
 *     status: "",
 *   });
 */

/**
 * Custom hook for managing table filters.
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object} - Filter state and operations
 */
function useFilters(initialFilters) {
  const [filters, setFilters] = React.useState(initialFilters || {});

  /**
   * Update a single filter value.
   * @param {string} key - Filter key
   * @param {string} value - New value
   */
  const updateFilter = React.useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Reset all filters to initial values.
   */
  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters || {});
  }, []);

  /**
   * Check if any filter has a non-empty value.
   * @returns {boolean}
   */
  const hasActiveFilters = React.useMemo(() => {
    return Object.values(filters).some((v) => String(v || "").trim() !== "");
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  };
}
