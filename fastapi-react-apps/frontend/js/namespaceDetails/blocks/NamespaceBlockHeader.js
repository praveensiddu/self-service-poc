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
  right,
}) {
  return (
    <div className="dashboardCardHeader">
      {icon}
      <h3>{title}</h3>
      {!readonly && !isEditing ? (
        <button
          className="iconBtn iconBtn-primary"
          type="button"
          style={{ marginLeft: 'auto' }}
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
      {!readonly && isEditing ? (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" type="button" onClick={onDiscardBlockEdits}>
            Discard Edits
          </button>
          <button className="btn btn-primary" type="button" onClick={() => onSaveBlock(blockKey)}>
            Submit
          </button>
        </div>
      ) : null}
      {right || null}
    </div>
  );
}
