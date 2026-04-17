from datetime import date, datetime, timedelta

from app.services.enterprise_templates import ENTERPRISE_TEMPLATES, get_template


def _parse_start_date(value: str | None) -> date:
    if not value:
        return date.today()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return date.today()


def _cadence_days(frequency: str) -> int:
    mapping = {
        "daily": 1,
        "weekly": 7,
        "monthly": 30,
        "quarterly": 90,
        "biannual": 180,
        "annual": 365,
    }
    return mapping.get(str(frequency or "").lower(), 7)


def generate_calendar(template: dict, start_date: str, horizon_days: int = 120, scale: float = 1) -> list[dict]:
    start = _parse_start_date(start_date)
    end = start + timedelta(days=max(int(horizon_days), 14))
    tasks: list[dict] = []

    for item in template.get("default_calendar", []):
        task_name = item.get("task", "Activity")
        if "day" in item:
            scheduled = start + timedelta(days=max(int(item["day"]) - 1, 0))
            if scheduled <= end:
                tasks.append(
                    {
                        "activity_type": task_name,
                        "scheduled_date": scheduled.isoformat(),
                        "status": "scheduled",
                        "meta": {"rule": "day", "times": item.get("times", [])},
                    }
                )
            continue

        if "week" in item:
            scheduled = start + timedelta(days=max((int(item["week"]) - 1) * 7, 0))
            if scheduled <= end:
                tasks.append(
                    {
                        "activity_type": task_name,
                        "scheduled_date": scheduled.isoformat(),
                        "status": "scheduled",
                        "meta": {"rule": "week", "times": item.get("times", [])},
                    }
                )
            continue

        frequency = item.get("frequency")
        if frequency:
            step = _cadence_days(frequency)
            current = start
            while current <= end:
                tasks.append(
                    {
                        "activity_type": task_name,
                        "scheduled_date": current.isoformat(),
                        "status": "scheduled",
                        "meta": {"rule": str(frequency).lower(), "times": item.get("times", [])},
                    }
                )
                current += timedelta(days=step)
            continue

        if "season" in item:
            scheduled = start + timedelta(days=90)
            if scheduled <= end:
                tasks.append(
                    {
                        "activity_type": task_name,
                        "scheduled_date": scheduled.isoformat(),
                        "status": "scheduled",
                        "meta": {"rule": "season", "season": item.get("season")},
                    }
                )

    # Add one AI context task for enterprise health monitoring.
    tasks.append(
        {
            "activity_type": "AI Health Review",
            "scheduled_date": (start + timedelta(days=1)).isoformat(),
            "status": "scheduled",
            "meta": {"rule": "ai", "scale": scale},
        }
    )

    deduped: dict[tuple[str, str], dict] = {}
    for task in tasks:
        key = (task["activity_type"], task["scheduled_date"])
        if key not in deduped:
            deduped[key] = task

    return sorted(deduped.values(), key=lambda row: (row["scheduled_date"], row["activity_type"]))


def predict_yield(payload: dict) -> dict:
    enterprise_type = str(payload.get("type", "")).lower()
    subtype = str(payload.get("subtype", "")).lower()
    scale_units = float(payload.get("scale_units", 1) or 1)
    cycle_days = int(payload.get("cycle_days", 120) or 120)

    base_map = {
        "livestock": 1.8,
        "aquaculture": 2.1,
        "crop": 2.4,
        "horticulture": 2.0,
        "tree_crop": 1.5,
        "specialized": 2.6,
    }
    subtype_multiplier = 1.0
    if "broiler" in subtype:
        subtype_multiplier = 1.3
    elif "dairy" in subtype:
        subtype_multiplier = 1.25
    elif subtype in {"rice", "maize", "wheat"}:
        subtype_multiplier = 1.15

    predicted_output = max(base_map.get(enterprise_type, 1.8) * subtype_multiplier * scale_units * (cycle_days / 90), 0.1)
    confidence = 0.72

    return {
        "predicted_output": round(predicted_output, 2),
        "unit": payload.get("output_unit", "units"),
        "confidence": confidence,
        "drivers": [
            "Enterprise template lifecycle",
            "Scale units",
            "Cycle duration",
        ],
    }


def optimize_costs(payload: dict) -> dict:
    resources = payload.get("resources") or []
    if not isinstance(resources, list):
        resources = []

    total_cost = 0.0
    by_type: dict[str, float] = {}
    for item in resources:
        resource_type = str(item.get("resource_type", "other")).lower()
        cost = float(item.get("cost", 0) or 0)
        total_cost += cost
        by_type[resource_type] = by_type.get(resource_type, 0) + cost

    ranked = sorted(by_type.items(), key=lambda pair: pair[1], reverse=True)
    top_items = [name for name, _ in ranked[:2]]

    recommendations = []
    for name in top_items:
        recommendations.append(f"Review supplier pricing and consumption for {name} to reduce costs by 8-15 percent.")

    if not recommendations:
        recommendations.append("No resource costs supplied. Start tracking resource entries for optimization.")

    target_savings = round(total_cost * 0.12, 2)
    return {
        "total_cost": round(total_cost, 2),
        "target_savings": target_savings,
        "recommendations": recommendations,
    }


def recommend_actions(payload: dict) -> dict:
    enterprise_type = str(payload.get("type", "")).lower()
    subtype = str(payload.get("subtype", "")).lower()
    upcoming_tasks = payload.get("upcoming_tasks") or []

    actions = []
    if isinstance(upcoming_tasks, list):
        for task in upcoming_tasks[:3]:
            actions.append(
                {
                    "priority": "high",
                    "action": f"Complete {task.get('activity_type', 'scheduled activity')} on {task.get('scheduled_date', 'planned date')}",
                }
            )

    if enterprise_type == "livestock" and "dairy" in subtype:
        actions.append({"priority": "medium", "action": "Track daily milk yield and compare with previous week trend."})
    if enterprise_type == "aquaculture":
        actions.append({"priority": "high", "action": "Monitor dissolved oxygen before morning feeding."})
    if enterprise_type in {"crop", "horticulture", "tree_crop"}:
        actions.append({"priority": "medium", "action": "Scout pest and disease incidence twice this week."})

    if not actions:
        actions.append({"priority": "medium", "action": "Record operational data to unlock richer AI recommendations."})

    return {
        "actions": actions,
        "decision_summary": "Recommendations are generated from template stage, task queue, and enterprise context.",
    }


def build_enterprise_blueprint(payload: dict) -> dict:
    template = get_template(payload.get("type", ""), payload.get("subtype", ""))
    if not template:
        return {
            "found": False,
            "message": "Template not found for selected enterprise.",
        }

    scale = float(payload.get("scale_units", 1) or 1)
    horizon_days = int(payload.get("horizon_days", 120) or 120)
    tasks = generate_calendar(template, payload.get("start_date"), horizon_days=horizon_days, scale=scale)

    return {
        "found": True,
        "template": template,
        "calendar": tasks,
    }


def list_templates() -> list[dict]:
    return ENTERPRISE_TEMPLATES
