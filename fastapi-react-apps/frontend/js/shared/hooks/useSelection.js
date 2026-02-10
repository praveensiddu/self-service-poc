/**
 * useSelection Hook - Reusable selection logic for tables.
 *
 * This hook provides:
 * - Selection state management (Set-based)
 * - Toggle individual items
 * - Select all / clear all
 * - Check if all items are selected
 *
 * Usage:
 *   const { selected, toggle, selectAll, clearSelection, isAllSelected } = useSelection();
 */

/**
 * Custom hook for managing table row selection.
 * @param {Set} [initialSelection] - Optional initial selection
 * @returns {Object} - Selection state and operations
 */
function useSelection(initialSelection) {
  const [selected, setSelected] = React.useState(() => initialSelection || new Set());

  /**
   * Toggle selection of a single item.
   * @param {string} id - Item identifier
   * @param {boolean} checked - Whether to select or deselect
   */
  const toggle = React.useCallback((id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /**
   * Select multiple items (replaces current selection).
   * @param {string[]} ids - Array of item identifiers
   */
  const selectAll = React.useCallback((ids) => {
    setSelected(new Set(ids));
  }, []);

  /**
   * Clear all selections.
   */
  const clearSelection = React.useCallback(() => {
    setSelected(new Set());
  }, []);

  /**
   * Toggle select all - if all selected, clear; otherwise select all.
   * @param {string[]} ids - Array of all possible item identifiers
   */
  const toggleSelectAll = React.useCallback((ids) => {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }, []);

  /**
   * Check if all provided items are selected.
   * @param {string[]} ids - Array of item identifiers to check
   * @returns {boolean}
   */
  const isAllSelected = React.useCallback(
    (ids) => {
      return ids.length > 0 && ids.every((id) => selected.has(id));
    },
    [selected]
  );

  /**
   * Check if a specific item is selected.
   * @param {string} id - Item identifier
   * @returns {boolean}
   */
  const isSelected = React.useCallback(
    (id) => {
      return selected.has(id);
    },
    [selected]
  );

  /**
   * Get count of selected items.
   * @returns {number}
   */
  const selectedCount = React.useMemo(() => selected.size, [selected]);

  /**
   * Get array of selected item IDs.
   * @returns {string[]}
   */
  const selectedArray = React.useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    setSelected,
    toggle,
    selectAll,
    clearSelection,
    toggleSelectAll,
    isAllSelected,
    isSelected,
    selectedCount,
    selectedArray,
  };
}
