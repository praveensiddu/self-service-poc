function NamespaceDetailsView({ namespace, namespaceName }) {
  if (!namespace) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p className="muted">No namespace data available.</p>
      </div>
    );
  }

  // Helper function to format values
  function formatValue(val) {
    if (val === null || val === undefined) return "N/A";
    if (Array.isArray(val)) return val.join(", ") || "None";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  }

  const clusters = formatValue(namespace?.clusters);
  const egressNameId = formatValue(namespace?.egress_nameid);
  const podBasedEgress = namespace?.enable_pod_based_egress_ip ? "Enabled" : "Disabled";
  const egressFirewall = formatValue(namespace?.file_index?.egress);
  const managedByArgo = namespace?.need_argo || namespace?.generate_argo_app ? "Yes" : "No";

  // Extract detailed attributes
  const status = namespace?.status || {};
  const resources = namespace?.resources || {};
  const rbac = namespace?.rbac || {};
  const policy = namespace?.policy || {};

  return (
    <div>
      {/* Centered Namespace Name */}
      <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#0d6efd' }}>
          {namespaceName}
        </h2>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
          Namespace Details
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="dashboardGrid">
        {/* Basic Information Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            <h3>Basic Information</h3>
          </div>
          <div className="dashboardCardBody">
            <div className="detailRow">
              <span className="detailLabel">Name:</span>
              <span className="detailValue">{namespaceName}</span>
            </div>
            <div className="detailRow">
              <span className="detailLabel">Clusters:</span>
              <span className="detailValue detailValueHighlight">{clusters}</span>
            </div>
            <div className="detailRow">
              <span className="detailLabel">Managed by Argo:</span>
              <span className={`detailBadge ${managedByArgo === 'Yes' ? 'detailBadgeSuccess' : 'detailBadgeSecondary'}`}>
                {managedByArgo}
              </span>
            </div>
          </div>
        </div>

        {/* Egress Configuration Card */}
        <div className="dashboardCard">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path fillRule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.854 10.803a.5.5 0 1 1-.708-.707L9.243 6H6.475a.5.5 0 1 1 0-1h3.975a.5.5 0 0 1 .5.5v3.975a.5.5 0 1 1-1 0V6.707l-4.096 4.096z"/>
            </svg>
            <h3>Egress Configuration</h3>
          </div>
          <div className="dashboardCardBody">
            <div className="detailRow">
              <span className="detailLabel">Egress Name ID:</span>
              <span className="detailValue">{egressNameId}</span>
            </div>
            <div className="detailRow">
              <span className="detailLabel">Pod-Based Egress IP:</span>
              <span className={`detailBadge ${podBasedEgress === 'Enabled' ? 'detailBadgeSuccess' : 'detailBadgeWarning'}`}>
                {podBasedEgress}
              </span>
            </div>
            <div className="detailRow">
              <span className="detailLabel">Egress Firewall:</span>
              <span className="detailValue">{egressFirewall}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Attributes Section */}
      <div className="dashboardGrid" style={{ marginTop: '20px' }}>

        {/* Resources Card */}
        <div className="dashboardCard dashboardCardFull">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
            </svg>
            <h3>Resources</h3>
          </div>
          <div className="dashboardCardBody">
            {Object.keys(resources).length > 0 ? (
              <div className="attributesGrid">
                {Object.entries(resources).map(([key, value]) => (
                  <div key={key} className="attributeItem">
                    <span className="attributeKey">{key}:</span>
                    <span className="attributeValue">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No resource information available</p>
            )}
          </div>
        </div>

        {/* RBAC Card */}
        <div className="dashboardCard dashboardCardFull">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
            </svg>
            <h3>RBAC</h3>
          </div>
          <div className="dashboardCardBody">
            {Object.keys(rbac).length > 0 ? (
              <div className="attributesGrid">
                {Object.entries(rbac).map(([key, value]) => (
                  <div key={key} className="attributeItem">
                    <span className="attributeKey">{key}:</span>
                    <span className="attributeValue">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No RBAC information available</p>
            )}
          </div>
        </div>

        {/* Policy Card */}
        <div className="dashboardCard dashboardCardFull">
          <div className="dashboardCardHeader">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
            </svg>
            <h3>Policy</h3>
          </div>
          <div className="dashboardCardBody">
            {Object.keys(policy).length > 0 ? (
              <div className="attributesGrid">
                {Object.entries(policy).map(([key, value]) => (
                  <div key={key} className="attributeItem">
                    <span className="attributeKey">{key}:</span>
                    <span className="attributeValue">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No policy information available</p>
            )}
          </div>
        </div>
      </div>

      {/* Raw JSON Section (collapsible) */}
      <details className="dashboardCard" style={{ marginTop: '20px', cursor: 'pointer' }}>
        <summary style={{ padding: '16px', fontWeight: '600', fontSize: '16px' }}>
          📋 View Raw JSON Data
        </summary>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <pre style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '6px',
            overflow: 'auto',
            maxHeight: '400px',
            fontSize: '12px',
            lineHeight: '1.5'
          }}>
            {JSON.stringify(namespace, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
