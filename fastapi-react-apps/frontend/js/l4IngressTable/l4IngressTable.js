function L4IngressTable({ items }) {
  const [filters, setFilters] = React.useState({
    cluster: "",
    purpose: "",
    requested: "",
    allocated: "",
    allocatedIps: "",
  });

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  function onCopyIps(row) {
    const ips = (row?.allocatedIps || "").trim();
    copyToClipboard(ips);
  }

  function onCopyRowJson(row) {
    copyToClipboard(JSON.stringify(row || {}, null, 2));
  }

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

  const rows = (items || []).map((it, idx) => {
    const allocationIds = (it?.allocations || []).map((a) => a?.name).filter(Boolean);
    const purpose = formatValue(it?.purpose);
    const allocationIdText = allocationIds.length ? allocationIds.join(", ") : purpose;
    const key = `${it?.cluster_no || ""}::${allocationIdText || idx}`;

    const allocatedIpsList = (it?.allocations || [])
      .flatMap((a) => (Array.isArray(a?.ips) ? a.ips : []))
      .filter(Boolean);
    const allocatedIps = Array.from(new Set(allocatedIpsList));

    return {
      key,
      clusterNo: formatValue(it?.cluster_no),
      allocationId: allocationIdText,
      requested: formatValue(it?.requested_total),
      allocated: formatValue(it?.allocated_total),
      allocatedIps: formatValue(allocatedIps),
    };
  });

  const filteredRows = rows.filter((r) => {
    const cluster = (r.clusterNo || "").toLowerCase();
    const purpose = (r.allocationId || "").toLowerCase();
    const requested = (r.requested || "").toLowerCase();
    const allocated = (r.allocated || "").toLowerCase();
    const allocatedIps = (r.allocatedIps || "").toLowerCase();

    return (
      cluster.includes((filters.cluster || "").toLowerCase()) &&
      purpose.includes((filters.purpose || "").toLowerCase()) &&
      requested.includes((filters.requested || "").toLowerCase()) &&
      allocated.includes((filters.allocated || "").toLowerCase()) &&
      allocatedIps.includes((filters.allocatedIps || "").toLowerCase())
    );
  });

  return (
    <L4IngressTableView
      filters={filters}
      setFilters={setFilters}
      rows={rows}
      filteredRows={filteredRows}
      onCopyIps={onCopyIps}
      onCopyRowJson={onCopyRowJson}
    />
  );
}
