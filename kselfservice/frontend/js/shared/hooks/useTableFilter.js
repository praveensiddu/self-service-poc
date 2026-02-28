/**
 * useTableFilter Hook - Centralized table filtering and sorting logic.
 *
 * This hook provides:
 * - Automatic filtering based on field mappings
 * - Sorting support
 * - Value formatting utilities
 * - Memoized results for performance
 *
 * Usage:
 *   const { filteredRows, sortedRows, filters, setFilters, formatValue } = useTableFilter({
 *     rows: myData,
 *     initialFilters: { name: "", status: "" },
 *     fieldMapping: (row) => ({
 *       name: row.name,
 *       status: row.status
 *     }),
 *     sortBy: (a, b) => a.name.localeCompare(b.name)
 *   });
 */

/**
 * Format a value for display and filtering.
 * @param {any} val - Value to format
 * @returns {string} - Formatted string
 */
function formatTableValue(val) {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) {
    // Check if array contains objects
    if (val.length > 0 && typeof val[0] === "object") {
      return `${val.length} item${val.length !== 1 ? 's' : ''}`;
    }
    return val.join(", ");
  }
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Custom hook for table filtering and sorting.
 * @param {Object} params - Hook parameters
 * @param {Array} params.rows - Array of data rows
 * @param {Object} params.initialFilters - Initial filter values (e.g., { name: "", status: "" })
 * @param {Function} params.fieldMapping - Function that maps a row to filterable fields
 * @param {Function} [params.sortBy] - Optional sort function (a, b) => number
 * @param {boolean} [params.caseSensitive=false] - Whether filtering is case-sensitive
 * @returns {Object} - Filtered rows, filters state, and utilities
 */
function useTableFilter({
  rows = [],
  initialFilters = {},
  fieldMapping,
  sortBy = null,
  caseSensitive = false,
}) {
  const { filters, setFilters, updateFilter, resetFilters } = useFilters(initialFilters);

  /**
   * Apply filtering to rows based on field mapping and filter values.
   */
  const filteredRows = React.useMemo(() => {
    if (!Array.isArray(rows)) return [];

    return rows.filter((row) => {
      const fields = fieldMapping(row);

      return Object.keys(filters).every((filterKey) => {
        const filterValue = safeTrim(filters[filterKey]);
        if (!filterValue) return true; // Empty filter = no filtering

        const fieldValue = formatTableValue(fields[filterKey]);

        if (caseSensitive) {
          return fieldValue.includes(filterValue);
        } else {
          return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
        }
      });
    });
  }, [rows, filters, fieldMapping, caseSensitive]);

  /**
   * Apply sorting to filtered rows if sortBy function is provided.
   */
  const sortedRows = React.useMemo(() => {
    if (!sortBy) return filteredRows;
    return [...filteredRows].sort(sortBy);
  }, [filteredRows, sortBy]);

  return {
    filteredRows,
    sortedRows,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    formatValue: formatTableValue,
  };
}
