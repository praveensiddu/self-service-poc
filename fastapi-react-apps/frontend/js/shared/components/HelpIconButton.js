/**
 * HelpIconButton Component
 *
 * Displays a help icon button that opens a modal with HTML documentation.
 * Uses React state for modal management.
 */
function HelpIconButton({ docPath, title }) {
  const [modalState, setModalState] = React.useState({ isOpen: false, html: "", title: "" });

  const doc = String(docPath || "").trim();
  if (!doc) return null;

  async function onClick() {
    try {
      const res = await fetch(doc, { headers: { Accept: 'text/html' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${text}`);
      }
      const html = await res.text();
      setModalState({ isOpen: true, html, title: title || 'Help' });
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  function closeModal() {
    setModalState({ isOpen: false, html: "", title: "" });
  }

  return (
    <>
      {/* Modal */}
      {modalState.isOpen && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              width: 'min(720px, calc(100vw - 32px))',
              maxHeight: '80vh',
              overflow: 'auto',
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
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#0d6efd' }}>
                {modalState.title}
              </h3>
              <button
                onClick={closeModal}
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

            {/* Body */}
            <div
              style={{
                color: '#212529',
                lineHeight: 1.5,
              }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                .help-modal-content * {
                  text-transform: none !important;
                  letter-spacing: normal !important;
                }
                .help-modal-content h1,
                .help-modal-content h2,
                .help-modal-content h3,
                .help-modal-content h4,
                .help-modal-content h5,
                .help-modal-content h6 {
                  text-transform: none !important;
                }
                .help-modal-content p,
                .help-modal-content li,
                .help-modal-content td,
                .help-modal-content th,
                .help-modal-content span,
                .help-modal-content div {
                  text-transform: none !important;
                }
              `}} />
              <div
                className="help-modal-content"
                style={{
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  fontSize: '14px',
                  fontWeight: 'normal',
                }}
                dangerouslySetInnerHTML={{ __html: modalState.html }}
              />
            </div>

            {/* Footer */}
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={closeModal}
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
      )}

      {/* Button */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Help"
        title={title || 'Help'}
        className="iconBtn iconBtn-help"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13A6 6 0 1 1 8 2a6 6 0 0 1 0 12z" />
          <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.71 2.036zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z" />
        </svg>
      </button>
    </>
  );
}
