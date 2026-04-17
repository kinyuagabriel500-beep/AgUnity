from datetime import datetime, UTC

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings

scheduler = AsyncIOScheduler()
recent_alerts: list[dict] = []


def _alert_signature(alert: dict) -> tuple[str, str]:
    return (alert.get("title", ""), alert.get("message", ""))


def _run_alert_job() -> None:
    # Placeholder alert job; replace with DB-backed farmer targeting in later steps.
    alert = {
        "timestamp": datetime.now(UTC).isoformat(),
        "title": "Weather Advisory Check",
        "message": "Review smart advisories before fertilizer or spraying operations.",
    }
    if recent_alerts and _alert_signature(recent_alerts[-1]) == _alert_signature(alert):
        recent_alerts[-1] = alert
    else:
        recent_alerts.append(alert)
    if len(recent_alerts) > 50:
        del recent_alerts[:-50]


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(_run_alert_job, CronTrigger.from_crontab(settings.alert_cron), id="ufip-alert-job")
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
