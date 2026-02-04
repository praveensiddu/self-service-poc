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

