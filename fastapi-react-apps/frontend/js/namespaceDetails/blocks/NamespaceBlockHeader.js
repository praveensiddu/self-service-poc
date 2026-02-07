function NamespaceBlockHeader({
  icon,
  title,
  readonly,
  isEditing,
  blockKey,
  canStartEditing,
  onEnableBlockEdit,
  onDiscardBlockEdits,
  onSaveBlock,
  helpDocPath,
  helpTitle,
  right,
}) {
  return (
    <div className="dashboardCardHeader">
      {icon}
      <h3>{title}</h3>
      {!isEditing ? (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {!readonly ? (
            <button
              className="iconBtn iconBtn-primary"
              type="button"
              onClick={() => onEnableBlockEdit(blockKey)}
              disabled={!canStartEditing(blockKey)}
              aria-label="Enable edit"
              title="Enable edit"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z" />
                <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z" />
              </svg>
            </button>
          ) : null}
          <HelpIconButton docPath={helpDocPath} title={helpTitle || `Help: ${title}`} />
          {right || null}
        </div>
      ) : null}
      {!readonly && isEditing ? (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="iconBtn"
            type="button"
            onClick={onDiscardBlockEdits}
            aria-label="Discard edits"
            title="Discard edits"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
          <button
            className="iconBtn iconBtn-primary"
            type="button"
            onClick={() => onSaveBlock(blockKey)}
            aria-label="Submit"
            title="Submit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </svg>
          </button>
          <HelpIconButton docPath={helpDocPath} title={helpTitle || `Help: ${title}`} />
          {right || null}
        </div>
      ) : null}
    </div>
  );
}
