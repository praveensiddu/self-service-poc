
## How to start the application

```bash
# from kselfservice/
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8888
```

React app runs at `http://localhost:8888/`

## Documentation

Full specification documentation is in `docs/`:

- **Docs index**: `docs/README.md`
- **Requirements**: `docs/requirements/overview.md`
- **Architecture**: `docs/design/architecture.md`
- **Workspace data model**: `docs/design/workspace-data-model.md`
- **API contracts**: `docs/design/api-contracts.md`
