# Frontend App Architecture

This document describes the folder structure and architecture of the `frontend/js` directory.

## Overview

The application follows a **container/presentational** pattern (also known as smart/dumb component pattern) combined with **custom hooks** for state management and **services** for API interactions.

## Folder Structure

```
frontend/js/
├── app/                          # Core application module
│   ├── containers/
│   │   └── App.container.js      # Main application container
│   ├── components/
│   │   └── App.view.js           # Main application view
│   ├── hooks/
│   │   ├── useApps.js            # Apps state and operations
│   │   ├── useClusters.js        # Clusters state and operations
│   │   ├── useConfig.js          # Config state and operations
│   │   ├── useGlobalError.js     # Global error/loading state
│   │   ├── useNamespaces.js      # Namespaces state and operations
│   │   └── useUiRouting.js       # URL routing and history
│   ├── services/
│   │   ├── apiClient.js          # HTTP client utilities
│   │   ├── appsService.js        # Apps API calls
│   │   ├── clustersService.js    # Clusters API calls
│   │   ├── configService.js      # Config API calls
│   │   └── namespacesService.js  # Namespaces API calls
│   └── utils/
│       ├── helpers.js            # General utility functions
│       └── url.js                # URL parsing/building utilities
├── features/                     # Feature modules
│   ├── apps/
│   │   ├── AppsTable.container.js
│   │   └── AppsTable.view.js
│   ├── clusters/
│   │   ├── ClustersTable.container.js
│   │   └── ClustersTable.view.js
│   ├── namespaces/
│   │   ├── NamespacesTable.container.js
│   │   └── NamespacesTable.view.js
│   ├── namespaceDetails/
│   │   ├── NamespaceDetails.container.js
│   │   ├── NamespaceDetails.view.js
│   │   └── blocks/
│   │       ├── BasicInfoBlock.js
│   │       ├── EgressConfigBlock.js
│   │       ├── EgressFirewallBlock.js
│   │       ├── LimitRangeBlock.js
│   │       ├── NamespaceBlockHeader.js
│   │       ├── ResourceQuotaBlock.js
│   │       └── RoleBindingsBlock.js
│   ├── l4Ingress/
│   │   ├── L4IngressTable.container.js
│   │   └── L4IngressTable.view.js
│   └── egressIp/
│       ├── EgressIpTable.container.js
│       └── EgressIpTable.view.js
└── shared/                       # Shared/reusable code
    ├── components/
    │   └── HelpIconButton.js     # Reusable help button
    └── hooks/
        ├── useFilters.js         # Reusable filtering logic
        └── useSelection.js       # Reusable selection logic

frontend/help/                    # Static HTML help documentation
├── namespaceDetails/
├── namespacesTable/
└── l4IngressTable/
```

## Architecture Layers

### 1. Containers (`containers/`)

**Purpose:** Stateful top-level components that orchestrate data flow.

**Responsibilities:**
- Manage React state via `useState`
- Run side effects with `useEffect`
- Wire hooks and services together
- Pass data and callbacks to presentational components

**Example:** `App.container.js`
- Holds all application state (apps, namespaces, clusters, config)
- Implements CRUD operations by calling services
- Manages routing and navigation
- Renders `AppView` with all necessary props

### 2. Components (`components/`)

**Purpose:** Presentational components that render UI based on props.

**Responsibilities:**
- Receive props and callbacks
- Render DOM elements and markup
- Handle local UI state only (e.g., form inputs, dropdowns)
- No API calls or global state mutations

**Example:** `App.view.js`
- Renders tabs, forms, modals, tables
- Calls callbacks received from container
- Contains minimal logic (formatting, conditional rendering)

### 3. Hooks (`hooks/`)

**Purpose:** Encapsulate reusable stateful logic.

**Responsibilities:**
- Manage related state together
- Provide operations that update state
- Handle side effects (API calls, subscriptions)
- Can be composed in containers

**Available Hooks:**

| Hook | Purpose |
|------|---------|
| `useConfig` | Config state, load/save config, enforcement settings |
| `useApps` | Apps list, CRUD operations, selection state |
| `useNamespaces` | Namespaces list, details, L4 ingress, egress IPs |
| `useClusters` | Clusters list, CRUD operations |
| `useUiRouting` | URL parsing, navigation, history handling |
| `useGlobalError` | Loading state, error handling, modals |

### 4. Services (`services/`)

**Purpose:** API interaction layer that returns plain data.

**Responsibilities:**
- Make HTTP requests to backend
- Handle request/response transformation
- Return plain data (no state updates)
- Throw errors for failed requests

**Available Services:**

| Service | Purpose |
|---------|---------|
| `apiClient.js` | Base HTTP methods (fetchJson, postJson, putJson, deleteJson) |
| `configService.js` | Config and enforcement settings API |
| `appsService.js` | Applications CRUD API |
| `namespacesService.js` | Namespaces CRUD and details API |
| `clustersService.js` | Clusters CRUD API |

### 5. Utils (`utils/`)

**Purpose:** Pure utility functions with no side effects.

**Responsibilities:**
- String manipulation
- Data transformation
- URL building and parsing
- Validation helpers

**Available Utils:**

| File | Functions |
|------|-----------|
| `url.js` | `parseUiRouteFromLocation`, `buildUiUrl`, `pushUiUrl`, `isHomePath`, etc. |
| `helpers.js` | `uniqStrings` |

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    App.container.js                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Hooks     │  │   Services   │  │     State       │    │
│  │ useConfig   │──│ configService│──│ workspace,      │    │
│  │ useApps     │  │ appsService  │  │ apps,           │    │
│  │ useNamespaces│ │ namespacesService│ namespaces,   │    │
│  │ useClusters │  │ clustersService│ │ clusters, etc. │    │
│  │ useUiRouting│  │              │  │                 │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
│                           │                                 │
│                     props + callbacks                       │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   App.view.js                       │   │
│  │  Renders UI based on props                          │   │
│  │  Calls callbacks on user interactions               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Browser DOM                             │
└─────────────────────────────────────────────────────────────┘
```

## Refactoring Status

### Completed ✓

1. **Core app structure** - `app/` folder with containers, components, hooks, services, utils
2. **Features folder** - All feature modules moved to `features/` with consistent naming
3. **Shared hooks** - Created `useFilters.js` and `useSelection.js` in `shared/hooks/`
4. **Shared components** - Moved `HelpIconButton.js` to `shared/components/`
5. **Naming conventions** - All files follow `Feature.container.js` / `Feature.view.js` pattern

### Future Improvements (Optional)

These improvements can be done incrementally without breaking the application:

#### 1. Extract Modal Components

Currently, modals are embedded in view files. Extract them to separate components:

```
features/apps/components/
├── CreateAppModal.js
├── EditAppModal.js
└── ArgoCdModal.js

features/clusters/components/
└── CreateClusterModal.js

features/namespaces/components/
├── CreateNamespaceModal.js
└── CopyNamespaceModal.js
```

#### 2. Use Shared Hooks in Feature Containers

Update feature containers to use `useFilters` and `useSelection` from `shared/hooks/`:

```javascript
// Before (in each container)
const [filters, setFilters] = React.useState({ name: "", status: "" });
const [selected, setSelected] = React.useState(new Set());

// After
const { filters, setFilters, updateFilter } = useFilters({ name: "", status: "" });
const { selected, toggle, selectAll, isAllSelected } = useSelection();
```

#### 3. Extract API Calls from Views

Some view files contain API calls (e.g., ArgoCD in AppsTable.view.js). Move these to services:

```javascript
// app/services/appsService.js
async function loadAppArgoCD(env, appname) { ... }
async function saveAppArgoCD(env, appname, config) { ... }
```

#### 4. Create Common Table Component

Extract common table patterns to a shared component:

```javascript
// shared/components/DataTable.js
function DataTable({ columns, rows, filters, selected, onToggle, onSelectAll }) { ... }
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Container | `Feature.container.js` | `AppsTable.container.js` |
| View | `Feature.view.js` | `AppsTable.view.js` |
| Sub-component | `ComponentName.js` | `CreateAppModal.js` |
| Hook | `useFeatureName.js` | `useFilters.js` |
| Service | `featureService.js` | `appsService.js` |
| Block (namespace details) | `FeatureBlock.js` | `BasicInfoBlock.js` |

## Script Loading Order

Since this app uses Babel standalone (no bundler), script order matters:

1. **React/ReactDOM** - Core libraries
2. **Babel** - JSX transformation
3. **Services** - `apiClient.js` first, then domain services
4. **Utils** - `url.js`, `helpers.js`
5. **Shared Hooks** - `useFilters.js`, `useSelection.js`
6. **Shared Components** - `HelpIconButton.js`, etc.
7. **Feature Hooks** - Custom hooks per feature
8. **Feature Components** - Views and sub-components
9. **Feature Containers** - Container components
10. **App Components** - `App.view.js`
11. **App Container** - `App.container.js` (entry point, must load last)

## Best Practices

### Stateful vs Stateless Decision

**Use Container (stateful) when:**
- Component needs to call APIs
- Component manages multiple pieces of related state
- Component needs access to routing/navigation
- Component orchestrates multiple child components

**Use Component (stateless) when:**
- Component only renders UI based on props
- Component calls callbacks for user interactions
- Component has only local UI state (form inputs)
- Component is reusable across different containers

### Hook Guidelines

- One hook per domain/feature area
- Hooks should be composable
- Return both state and operations
- Use `useCallback` for stable function references
- Document parameters and return values

### Service Guidelines

- One service per backend resource
- Functions should be pure async operations
- Return plain data, no React state updates
- Throw errors on failure (let caller handle)
- Use descriptive function names (e.g., `loadApps`, `createApp`)

### Common Patterns to Extract

1. **Filtering** - Every table has similar filter logic
2. **Selection** - Checkbox selection with select-all
3. **Modals** - Create/Edit/Delete confirmation patterns
4. **Table Rows** - Row rendering with actions
5. **Block Editing** - Edit/Save/Cancel pattern in namespace details
