function HelpIconButton({ docPath, title }) {
  const doc = String(docPath || "").trim();
  if (!doc) return null;

  function showHtmlModal({ modalTitle, html }) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; padding: 24px; border-radius: 12px; width: min(720px, calc(100vw - 32px)); max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;';
    header.innerHTML = `<h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #0d6efd;">${String(modalTitle || 'Help')}</h3>`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; color: #6c757d;';
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.style.cssText = 'color: #212529; line-height: 1.5;';
    body.innerHTML = html;

    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top: 16px; text-align: right;';

    const closeBtn2 = document.createElement('button');
    closeBtn2.textContent = 'Close';
    closeBtn2.style.cssText = 'padding: 8px 16px; background: #0d6efd; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;';
    closeBtn2.onclick = () => modal.remove();

    footer.appendChild(closeBtn2);

    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modalContent.appendChild(footer);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }

  async function onClick() {
    try {
      const res = await fetch(doc, { headers: { Accept: 'text/html' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${text}`);
      }
      const html = await res.text();
      showHtmlModal({ modalTitle: title || 'Help', html });
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  return (
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
  );
}
