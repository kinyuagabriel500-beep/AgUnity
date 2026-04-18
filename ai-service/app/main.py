from fastapi import FastAPI

from app.api.routes import router as api_router
from app.core.config import settings
from app.jobs.alert_scheduler import start_scheduler, stop_scheduler


app = FastAPI(
    title="AGUNITY AI Service",
    description="AI advisory and recommendation service for AGUNITY (AgOS)",
    version="1.0.0",
)


# ✅ Health check (Render uses this)
@app.get("/health")
def health():
    return {"status": "ok", "service": "agunity-ai"}


# ✅ Optional root check (useful for quick browser test)
@app.get("/")
def root():
    return {"message": "AGUNITY AI Service is running"}


# ✅ Startup event (safe handling)
@app.on_event("startup")
async def on_startup():
    try:
        start_scheduler()
        print("✅ Scheduler started")
    except Exception as e:
        print(f"❌ Scheduler failed to start: {e}")


# ✅ Shutdown event (safe handling)
@app.on_event("shutdown")
async def on_shutdown():
    try:
        stop_scheduler()
        print("🛑 Scheduler stopped")
    except Exception as e:
        print(f"❌ Scheduler shutdown error: {e}")


# ✅ Include API routes LAST
app.include_router(api_router)