/**
 * ConfirmationModal Component
 *
 * Reusable confirmation dialog with warning icon.
 */

function ConfirmationModal({
  show,
  onClose,
  onConfirm,
  title,
  message,
  items = [],
  confirmText = "Yes, Continue",
  cancelText = "Cancel",
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="confirmation-modal"
    >
      <div
        className="card"
        style={{
          width: 500,
          maxWidth: "92vw",
          padding: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255, 193, 7, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="#ffc107">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "#212529" }}>
              {title}
            </h3>
            {message && (
              <p style={{ margin: "0 0 12px 0", color: "rgba(0,0,0,0.7)", lineHeight: "1.5" }}>
                {message}
              </p>
            )}
            {items.length > 0 && (
              <ul style={{ margin: "0 0 12px 0", paddingLeft: "20px", color: "rgba(0,0,0,0.7)" }}>
                {items.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: "4px" }}>
                    <strong>{item}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            className="btn"
            type="button"
            onClick={onClose}
            data-testid="cancel-btn"
          >
            {cancelText}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={onConfirm}
            data-testid="confirm-btn"
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
