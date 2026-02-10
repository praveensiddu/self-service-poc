/**
 * NamespaceDetails Container
 *
 * This is a thin wrapper that maintains backwards compatibility.
 * It simply passes all props to NamespaceDetailsView.
 *
 * Note: This could be eliminated by renaming NamespaceDetailsView to NamespaceDetails,
 * but keeping it ensures the component interface remains stable.
 */
function NamespaceDetails({ namespace, namespaceName, appname, env, onUpdateNamespaceInfo, readonly, renderHeaderButtons }) {
  return (
    <NamespaceDetailsView
      namespace={namespace}
      namespaceName={namespaceName}
      appname={appname}
      env={env}
      onUpdateNamespaceInfo={onUpdateNamespaceInfo}
      readonly={readonly}
      renderHeaderButtons={renderHeaderButtons}
    />
  );
}
