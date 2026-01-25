function EgressIpTable({ items, selectedItems, onToggleRow, onSelectAll }) {
  const [filters, setFilters] = React.useState({
    cluster: "",
    allocation_id: "",
    allocated_ips: "",
  });

  function formatValue(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  const filteredItems = (items || []).filter((item, index) => {
    const cluster = formatValue(item?.cluster).toLowerCase();
    const allocationId = formatValue(item?.allocation_id).toLowerCase();
    const allocatedIps = formatValue(item?.allocated_ips).toLowerCase();

    return (
      cluster.includes((filters.cluster || "").toLowerCase()) &&
      allocationId.includes((filters.allocation_id || "").toLowerCase()) &&
      allocatedIps.includes((filters.allocated_ips || "").toLowerCase())
    );
  });

  const allSelected = filteredItems.length > 0 && filteredItems.every((item, index) => selectedItems.has(index));

  return (
    <EgressIpTableView
      filteredItems={filteredItems}
      allSelected={allSelected}
      filters={filters}
      setFilters={setFilters}
      selectedItems={selectedItems}
      onToggleRow={onToggleRow}
      onSelectAll={onSelectAll}
    />
  );
}
