function EgressIpTable({ items, env, appname, onRemoveAllocation, readonly }) {
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
      namespaces: "",
    },
    fieldMapping: (item) => ({
      cluster: safeTrim(item?.cluster),
      allocation_id: safeTrim(item?.allocation_id),
      allocated_ips: (item?.allocated_ips || []).join(", "),
      namespaces: (item?.namespaces || []).join(", "),
    }),
  });

  return (
    <EgressIpTableView
      filteredItems={sortedRows}
      filters={filters}
      setFilters={setFilters}
      env={env}
      appname={appname}
      onRemoveAllocation={onRemoveAllocation}
      readonly={readonly}
    />
  );
}
