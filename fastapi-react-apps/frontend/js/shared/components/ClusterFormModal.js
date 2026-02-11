/**
 * ClusterFormModal Component
 *
 * Reusable modal for creating/editing clusters.
 */

function normalizeApplicationsInput(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9,]/g, "");
}

function ClusterFormModal({
  show,
  onClose,
  onSubmit,
  mode = "create", // "create" or "edit"
  envKey,
  initialData = {},
  loading = false,
}) {
  const [draft, setDraft] = React.useState({
    clustername: "",
    purpose: "",
    datacenter: "",
    applications: "",
  });

  const [draftRanges, setDraftRanges] = React.useState([{ startIp: "", endIp: "", error: "" }]);
  const [draftEgressRanges, setDraftEgressRanges] = React.useState([{ startIp: "", endIp: "", error: "" }]);

  // Track if we've initialized this modal session to prevent duplicate updates
  const initializedRef = React.useRef(false);

  // Initialize form when modal opens or initialData changes
  React.useEffect(() => {
    if (show && !initializedRef.current) {
      initializedRef.current = true;

      if (mode === "edit" && initialData) {
        const apps = Array.isArray(initialData?.applications) ? initialData.applications.map(String) : [];
        const ranges = Array.isArray(initialData?.l4_ingress_ip_ranges) ? initialData.l4_ingress_ip_ranges : [];
        const egressRanges = Array.isArray(initialData?.egress_ip_ranges) ? initialData.egress_ip_ranges : [];

        setDraft({
          clustername: String(initialData?.clustername || ""),
          purpose: String(initialData?.purpose || ""),
          datacenter: String(initialData?.datacenter || ""),
          applications: apps.join(","),
        });

        setDraftRanges(
          ranges.length
            ? ranges.map((x) => ({ startIp: String(x?.start_ip || ""), endIp: String(x?.end_ip || ""), error: "" }))
            : [{ startIp: "", endIp: "", error: "" }]
        );

        setDraftEgressRanges(
          egressRanges.length
            ? egressRanges.map((x) => ({ startIp: String(x?.start_ip || ""), endIp: String(x?.end_ip || ""), error: "" }))
            : [{ startIp: "", endIp: "", error: "" }]
        );
      } else {
        // Reset for create mode
        setDraft({ clustername: "", purpose: "", datacenter: "", applications: "" });
        setDraftRanges([{ startIp: "", endIp: "", error: "" }]);
        setDraftEgressRanges([{ startIp: "", endIp: "", error: "" }]);
      }
    }
  }, [show, mode, initialData?.clustername]); // Only depend on specific properties to avoid infinite loops

  // Reset form when modal is closed
  React.useEffect(() => {
    if (!show) {
      initializedRef.current = false;
      setDraft({ clustername: "", purpose: "", datacenter: "", applications: "" });
      setDraftRanges([{ startIp: "", endIp: "", error: "" }]);
      setDraftEgressRanges([{ startIp: "", endIp: "", error: "" }]);
    }
  }, [show]);

  const canSubmit = Boolean(
    (draft.clustername || "").trim() &&
      (draft.purpose || "").trim() &&
      (draft.datacenter || "").trim() &&
      (draft.applications || "").trim()
  );

  async function handleSubmit() {
    try {
      const applications = String(draft.applications || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Validate IP ranges
      const l4Validation = validateAllIpRanges(draftRanges);
      const egressValidation = validateAllIpRanges(draftEgressRanges);

      if (l4Validation.hasErrors) {
        setDraftRanges(l4Validation.updatedRanges);
      }
      if (egressValidation.hasErrors) {
        setDraftEgressRanges(egressValidation.updatedRanges);
      }
      if (l4Validation.hasErrors || egressValidation.hasErrors) {
        return;
      }

      const payload = {
        clustername: String(draft.clustername || ""),
        purpose: String(draft.purpose || ""),
        datacenter: String(draft.datacenter || ""),
        applications,
        l4_ingress_ip_ranges: normalizeIpRanges(draftRanges),
        egress_ip_ranges: normalizeIpRanges(draftEgressRanges),
      };

      await onSubmit(payload);
      onClose();
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid={`${mode}-cluster-modal`}
    >
      <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>
            {mode === "create" ? "Add" : "Edit"} Cluster ({envKey})
          </div>
          <button
            className="btn"
            type="button"
            onClick={onClose}
            data-testid="close-modal-btn"
          >
            Close
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div className="muted">
                Clustername {mode === "create" && <span style={{ color: "#dc3545" }}>*</span>}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {mode === "create" ? "Unique cluster identifier" : "Read-only"}
              </div>
            </div>
            <input
              className="filterInput"
              value={draft.clustername}
              onChange={(e) => setDraft((p) => ({ ...p, clustername: String(e.target.value || "").toLowerCase() }))}
              disabled={mode === "edit"}
              readOnly={mode === "edit"}
              data-testid="input-clustername"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div className="muted">Purpose <span style={{ color: "#dc3545" }}>*</span></div>
              <div className="muted" style={{ fontSize: 12 }}>What this cluster is used for</div>
            </div>
            <input
              className="filterInput"
              value={draft.purpose}
              onChange={(e) => setDraft((p) => ({ ...p, purpose: e.target.value }))}
              data-testid="input-purpose"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div className="muted">Datacenter <span style={{ color: "#dc3545" }}>*</span></div>
              <div className="muted" style={{ fontSize: 12 }}>Physical/region location</div>
            </div>
            <input
              className="filterInput"
              value={draft.datacenter}
              onChange={(e) => setDraft((p) => ({ ...p, datacenter: String(e.target.value || "").toLowerCase() }))}
              data-testid="input-datacenter"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div className="muted">Applications <span style={{ color: "#dc3545" }}>*</span></div>
              <div className="muted" style={{ fontSize: 12 }}>Comma-separated app names</div>
            </div>
            <input
              className="filterInput"
              placeholder="comma-separated"
              value={draft.applications}
              onChange={(e) => setDraft((p) => ({ ...p, applications: normalizeApplicationsInput(e.target.value) }))}
              data-testid="input-applications"
            />
          </div>

          <IpRangeInput
            ranges={draftRanges}
            onChange={setDraftRanges}
            label="L4 Ingress IP Ranges"
            description="Enter IP address ranges (e.g., 192.168.1.1 to 192.168.1.254)"
          />

          <IpRangeInput
            ranges={draftEgressRanges}
            onChange={setDraftEgressRanges}
            label="Egress IP Ranges"
            description="Enter IP address ranges (e.g., 10.0.0.1 to 10.0.0.254)"
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              data-testid="submit-cluster-btn"
            >
              {mode === "create" ? "Create" : "Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
