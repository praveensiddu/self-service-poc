/**
 * YamlPreviewModal - Reusable modal for displaying YAML previews.
 *
 * Used by namespace details blocks to show YAML content.
 */
function YamlPreviewModal({ isOpen, onClose, title, yaml, infoMessage, titleColor = "#ff8c00" }) {
  if (!isOpen) return null;

  function handleCopy() {
    navigator.clipboard.writeText(yaml).then(() => alert('Copied to clipboard!'));
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '2px solid #e9ecef',
            paddingBottom: '12px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: titleColor }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d',
            }}
          >
            &times;
          </button>
        </div>

        {/* Info Box */}
        {infoMessage && (
          <div
            style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#856404',
            }}
          >
            <strong>Preview Mode:</strong> {infoMessage}
          </div>
        )}

        {/* YAML Content */}
        <pre
          style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            overflowX: 'auto',
            margin: 0,
            fontFamily: '"Courier New", monospace',
            fontSize: '13px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
        >
          {yaml}
        </pre>

        {/* Footer */}
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              marginRight: '8px',
            }}
          >
            Copy
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#0d6efd',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
