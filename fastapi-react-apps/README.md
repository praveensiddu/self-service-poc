
## How to start the application

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

React app runs at `http://localhost:8000/` access from the browzer

## Documentation

Full specification documentation is in `docs/`:

- **Docs index**: `docs/README.md`
- **Requirements**: `docs/requirements/overview.md`
- **Architecture**: `docs/design/architecture.md`
- **Workspace data model**: `docs/design/workspace-data-model.md`
- **API contracts**: `docs/design/api-contracts.md`
