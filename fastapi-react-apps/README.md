
## How to start the application

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

React app runs at `http://localhost:3000/` access from the browzer
