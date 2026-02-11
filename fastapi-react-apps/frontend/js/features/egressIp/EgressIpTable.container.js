function EgressIpTable({ items }) {
  // Centralized filtering using shared hook
  const {
    sortedRows,
    filters,
    setFilters,
  } = useTableFilter({
    rows: items,
    initialFilters: {
      cluster: "",
      allocation_id: "",
      allocated_ips: "",
    },
    fieldMapping: (item) => ({
      cluster: safeTrim(item?.cluster),
      allocation_id: safeTrim(item?.allocation_id),
      allocated_ips: (item?.allocated_ips || []).join(", "),
    }),
  });

  return (
    <EgressIpTableView
      filteredItems={sortedRows}
      filters={filters}
      setFilters={setFilters}
    />
  );
}
