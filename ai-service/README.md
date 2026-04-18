# AGUNITY AI Service (FastAPI)

AI advisory microservice for the AGUNITY (AgOS) platform.

## Endpoints

- `POST /ask` - Context-aware farm advisory chatbot response
- `POST /recommend` - Crop recommendations based on location, crop, and season

## Run Locally

```bash
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
