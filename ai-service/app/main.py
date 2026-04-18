from fastapi import FastAPI

from app.api.routes import router as api_router
from app.core.config import settings
from app.jobs.alert_scheduler import start_scheduler, stop_scheduler

app = FastAPI(
    title="AGUNITY AI Service",
    description="AI advisory and recommendation service for AGUNITY (AgOS)",
    version="1.0.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "agunity-ai-service"}


@app.on_event("startup")
async def on_startup() -> None:
    start_scheduler()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    stop_scheduler()


app.include_router(api_router)
