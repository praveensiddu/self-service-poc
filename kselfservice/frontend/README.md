# Frontend Application

A modern React-based frontend for the OCP App Provisioning Portal, built with Babel standalone for browser-based JSX transformation.

## 📁 Project Structure

```
frontend/
├── index.html              # Main HTML entry point
├── css/                    # Stylesheets
│   └── styles.css         # Global styles
├── js/                     # JavaScript modules
│   ├── app/               # Application core
│   │   ├── containers/    # Main app container
│   │   │   └── App.container.js
│   │   ├── components/    # App-level components
│   │   │   └── App.view.js
│   │   ├── services/      # API service layer
│   │   │   ├── apiClient.js        # HTTP client utilities
│   │   │   ├── userService.js      # User & auth APIs
│   │   │   ├── configService.js    # Configuration APIs
│   │   │   ├── appsService.js      # Application APIs
│   │   │   ├── namespacesService.js # Namespace APIs
│   │   │   ├── clustersService.js  # Cluster APIs
│   │   │   └── argocdService.js    # ArgoCD APIs
│   │   ├── hooks/         # Application-level hooks
│   │   │   ├── useGlobalError.js    # Error/loading state
│   │   │   ├── useUsers.js          # User state & demo mode
│   │   │   ├── useConfig.js         # Configuration management
│   │   │   ├── useApps.js           # Apps state & operations
│   │   │   ├── useNamespaces.js     # Namespaces state
│   │   │   ├── useClusters.js       # Clusters state
│   │   │   ├── useL4Ingress.js      # L4 Ingress state
│   │   │   ├── useEgressIps.js      # Egress IPs state
│   │   │   ├── useAccessRequests.js # Access requests
│   │   │   ├── useUiRouting.js      # URL routing
│   │   │   ├── useModals.js         # Modal visibility
│   │   │   └── useAuthorization.js  # RBAC helpers
│   │   └── utils/         # Utility functions
│   │       ├── url.js     # URL/routing helpers
│   │       ├── helpers.js # General utilities
│   │       └── ...
│   ├── features/          # Feature modules (by domain)
│   │   ├── apps/          # Applications management
│   │   ├── clusters/      # Cluster management
│   │   ├── egressIp/      # Egress IP management
│   │   ├── l4Ingress/     # L4 Ingress management
│   │   ├── namespaces/    # Namespace list management
│   │   ├── accessRequests/ # Access request management
│   │   └── namespaceDetails/  # Namespace details (refactored)
│   │       ├── NamespaceDetails.container.js
│   │       ├── NamespaceDetails.view.js
│   │       ├── blocks/    # UI blocks (cards)
│   │       │   ├── BasicInfoBlock.js
│   │       │   ├── EgressConfigBlock.js
│   │       │   ├── EgressFirewallBlock.js
│   │       │   ├── LimitRangeBlock.js
│   │       │   ├── ResourceQuotaBlock.js
│   │       │   └── RoleBindingsBlock.js
│   │       └── hooks/     # Feature-specific hooks
│   │           ├── useNamespaceDetailsApi.js
│   │           ├── useNamespaceDetailsEdit.js
│   │           └── useNamespaceDetailsLogic.js
│   └── shared/            # Shared components and utilities
│       ├── components/    # Reusable UI components
│       │   ├── YamlPreviewModal.js
│       │   ├── ConfirmationModal.js
│       │   ├── ClusterFormModal.js
│       │   ├── HelpIconButton.js
│       │   └── IpRangeInput.js
│       └── hooks/         # Shared custom hooks
│           ├── useFilters.js
│           ├── useSelection.js
│           └── useTableFilter.js
├── help/                  # Help documentation (HTML)
└── e2e/                   # End-to-end tests (Playwright)
    ├── tests/
    ├── playwright.config.js
    └── package.json
```

## 🏗️ Architecture

### Design Patterns

This application follows modern React best practices with clear separation of concerns:

#### 1. **Service Layer Pattern**
Services encapsulate all API calls and provide a consistent interface:

- **apiClient.js**: Core HTTP utilities (`fetchJson`, `postJson`, `putJson`, `deleteJson`)
- **userService.js**: User authentication and demo mode
  ```javascript
  loadCurrentUser()       // Get current user info
  loadDeploymentType()    // Get deployment config
  loadDemoUsers()         // Get demo users list
  updateCurrentUser(user) // Switch demo user
  ```
- **configService.js**: Application configuration
  ```javascript
  loadConfig()            // Get workspace config
  saveConfig(config)      // Save workspace config
  loadEnvList()           // Get environment list
  loadEnforcementSettings() // Get enforcement settings
  ```
- **appsService.js**: Application CRUD operations
- **namespacesService.js**: Namespace operations
- **clustersService.js**: Cluster management
- **argocdService.js**: ArgoCD integration

**Benefits:**
- ✅ Single source of truth for API endpoints
- ✅ Easy to mock for testing
- ✅ Consistent error handling
- ✅ Reusable across components

#### 2. **Container/View Pattern**
- **Container** (`*.container.js`): Manages state, side effects, and business logic
- **View** (`*.view.js`): Pure presentational components, no business logic

Example:
```javascript
// Container orchestrates hooks and state
function NamespaceDetails({ namespace, ... }) {
  const { draftBasic, setDraftBasic, ... } = useNamespaceDetailsEdit({ ... });
  const { fetchYaml, ... } = useNamespaceDetailsApi({ ... });
  const { displayValues, ... } = useNamespaceDetailsLogic({ ... });
  
  return <NamespaceDetailsView {...props} />;
}

// View only renders UI
function NamespaceDetailsView({ displayValues, ... }) {
  return <div>...</div>;
}
```

#### 3. **Custom Hooks Pattern**
Custom hooks encapsulate reusable logic and consume services:

- **State Management Hooks**: Manage domain state
  ```javascript
  useApps({ activeEnv, setLoading, setError })
  useNamespaces({ activeEnv, setLoading, setError })
  useClusters({ activeEnv, envKeys, ... })
  ```

- **API Hooks**: API calls and data fetching
  ```javascript
  useNamespaceDetailsApi({ env, appname, namespaceName })
  ```

- **Edit State Hooks**: Edit mode and draft state management
  ```javascript
  useNamespaceDetailsEdit({ namespace, onUpdate })
  ```

- **Logic Hooks**: Computed values and data transformations
  ```javascript
  useNamespaceDetailsLogic({ namespace, draftStates })
  ```

- **UI Hooks**: Modal visibility, routing, global errors
  ```javascript
  useModals()           // Modal visibility state
  useUiRouting({ ... }) // URL routing and history
  useGlobalError()      // Centralized error handling
  ```

**Hook Responsibilities:**
- ✅ Call service functions (not direct fetch)
- ✅ Manage local state
- ✅ Handle loading/error states
- ✅ Provide clean API to components
- ✅ Use `React.useCallback` for stable references

#### 4. **Feature-Based Organization**
Each feature is self-contained with:
- Container and View components
- Feature-specific hooks (co-located)
- Block components (UI sections)

#### 4. **Blocks Pattern**
Complex views are decomposed into blocks (cards):
- `BasicInfoBlock.js` - Cluster and ArgoCD settings
- `EgressConfigBlock.js` - Egress IP configuration
- `RoleBindingsBlock.js` - RBAC role bindings
- `EgressFirewallBlock.js` - Egress firewall rules
- `ResourceQuotaBlock.js` - Resource quotas
- `LimitRangeBlock.js` - Resource limits

Each block:
- Is self-contained and reusable
- Manages its own local state (e.g., YAML preview modal)
- Receives data and handlers via props

## 🎨 Component Structure

### Namespace Details (Refactored Example)

**Files:**
```
namespaceDetails/
├── NamespaceDetails.container.js  (~220 lines)
├── NamespaceDetails.view.js       (~140 lines)
├── blocks/                         (6 block components)
└── hooks/                          (3 custom hooks)
```

**Hook Responsibilities:**

1. **useNamespaceDetailsApi** (~280 lines)
   - Role binding YAML preview
   - Resource quota YAML preview
   - Limit range YAML preview
   - Egress firewall YAML & preview
   - Cluster options loading
   - Role catalog loading

2. **useNamespaceDetailsEdit** (~420 lines)
   - Edit mode state (which block is editing)
   - Draft states for all editable blocks
   - Draft reset logic
   - Edit handlers (enable, discard, save)
   - Save logic for each block type

3. **useNamespaceDetailsLogic** (~190 lines)
   - Formatting utilities
   - Cluster filtering and search
   - Effective namespace (with draft changes)
   - Display values computation
   - Egress firewall rules merging

## 🔧 Technology Stack

- **React 18** (via CDN) - UI framework
- **Babel Standalone** - Browser-based JSX transformation
- **Native JavaScript** - No build step required
- **CSS** - Custom styling (no framework)

## 🚀 Development

### Prerequisites
- Modern web browser with ES6+ support
- Backend server running (FastAPI)

### Running Locally
The frontend is served by the FastAPI backend:

```bash
# From the project root
cd kselfservice
./run_app.sh
```

Access at: `http://localhost:8000`

### File Loading
All JavaScript files are loaded via `<script>` tags in `index.html`:
```html
<!-- Core React -->
<!-- Babel for JSX -->


<!-- Application code -->
<script type="text/babel" src="/static/js/app/App.container.js"></script>
```

## 🧪 Testing

### E2E Tests (Playwright)
Located in `frontend/e2e/`:

```bash
cd e2e
npm install
npm test                 # Run all tests
npm run test:headed      # Run with browser UI
npm run test:debug       # Debug mode
```

**Test Structure:**
```
e2e/
├── tests/
│   ├── apps.spec.js
│   ├── namespaces.spec.js
│   ├── clusters.spec.js
│   └── ...
├── playwright.config.js
└── package.json
```

## 📝 Best Practices Followed

### 1. Separation of Concerns
- ✅ Container handles logic, View handles presentation
- ✅ Business logic in custom hooks
- ✅ API calls isolated in API hooks
- ✅ No DOM manipulation (use React state)

### 2. Component Organization
- ✅ Feature-based folder structure
- ✅ Co-located hooks with features
- ✅ Shared components in `/shared`
- ✅ Clear naming conventions

### 3. State Management
- ✅ Local state for UI concerns (modals, dropdowns)
- ✅ Props for data flow
- ✅ Custom hooks for complex state logic
- ✅ Draft pattern for editing

### 4. Code Quality
- ✅ JSDoc comments for all functions
- ✅ Clear section comments in large files
- ✅ Consistent error handling
- ✅ PropTypes-like validation via runtime checks

### 5. Performance
- ✅ `React.memo` for expensive components
- ✅ `React.useCallback` for stable function references
- ✅ `React.useMemo` for computed values
- ✅ Conditional data loading (only when needed)

## 🔄 Recent Refactoring (Feb 2026)

### Namespace Details Module
**Before:**
- 1 monolithic file (~800 lines)
- Mixed concerns (UI, logic, API)
- Direct DOM manipulation for modals
- Hard to test and maintain

**After:**
- Container/View separation (~360 lines total)
- 3 custom hooks (~890 lines)
- 6 block components (~1500 lines)
- 1 shared modal component
- Clean, testable, maintainable

**Key Improvements:**
1. ✅ Removed all DOM manipulation - now using React state
2. ✅ Extracted business logic to hooks
3. ✅ Grouped related functions with section comments
4. ✅ Created reusable `YamlPreviewModal` component
5. ✅ Reduced prop drilling (40+ props → grouped objects)
6. ✅ Added comprehensive JSDoc documentation

## 📚 Common Patterns

### 1. YAML Preview Modal Pattern
```javascript
// In block component
const [yamlPreview, setYamlPreview] = React.useState({ 
  isOpen: false, 
  yaml: "" 
});

async function handleViewYaml() {
  const yaml = await fetchYaml();
  setYamlPreview({ isOpen: true, yaml });
}

return (
  <>
    <YamlPreviewModal 
      isOpen={yamlPreview.isOpen}
      onClose={() => setYamlPreview({ isOpen: false, yaml: "" })}
      yaml={yamlPreview.yaml}
    />
    <button onClick={handleViewYaml}>View YAML</button>
  </>
);
```

### 2. Edit Mode Pattern
```javascript
// Container manages edit state
const { 
  isEditing, 
  draftState, 
  setDraftState,
  onEnableEdit,
  onDiscardEdits,
  onSaveChanges 
} = useEditHook();

// View receives props
<Block
  isEditing={isEditing}
  draft={draftState}
  setDraft={setDraftState}
  onEdit={onEnableEdit}
  onDiscard={onDiscardEdits}
  onSave={onSaveChanges}
/>
```

### 3. API Hook Pattern
```javascript
// Organize by feature area
// ============================================================================
// ROLE BINDINGS API
// ============================================================================
const fetchRoleBindingYaml = React.useCallback(async ({ ... }) => {
  // API call
}, [dependencies]);

// ============================================================================
// RESOURCES API
// ============================================================================
const fetchResourceQuotaYaml = React.useCallback(async ({ ... }) => {
  // API call
}, [dependencies]);
```

## 🐛 Debugging

### Browser DevTools
1. Open DevTools (F12)
2. Sources tab → Babel-transformed files available
3. React DevTools extension recommended

### Common Issues

**Issue:** Component not updating
- **Fix:** Check if props/state changed
- **Fix:** Verify dependency arrays in hooks

**Issue:** "X is not defined"
- **Fix:** Check script load order in `index.html`
- **Fix:** Ensure component/function is globally available

**Issue:** YAML preview not showing
- **Fix:** Check browser console for API errors
- **Fix:** Verify modal state is being updated

## 📖 Documentation

- **Help Files**: `/frontend/help/` - HTML help documentation
- **API Docs**: See backend README
- **JSDoc Comments**: In-code documentation for all major functions

## 🔐 Security

- No sensitive data in frontend code
- All API calls go through backend
- CORS handled by FastAPI backend
- No local storage of credentials

## 🚦 Status

**Current Version:** 1.0.0 (Refactored - Feb 2026)

**Stability:** Production Ready

**Browser Support:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review this README
3. Check backend logs
4. Consult team documentation

---

**Last Updated:** February 11, 2026
