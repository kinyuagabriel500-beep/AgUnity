from app.integrations.weather_client import fetch_weather
from app.schemas import SmartAdvisoryRequest, SmartAdvisoryResponse


def evaluate_rules(activity: str, rainfall_probability: int) -> list[str]:
    rules: list[str] = []
    normalized = activity.lower()

    if normalized == "fertilizer" and rainfall_probability > 80:
        rules.append("IF rainfall > 80% THEN delay fertilizer")
    if normalized == "spraying" and rainfall_probability > 70:
        rules.append("IF rainfall > 70% THEN postpone spraying for 24 hours")
    if rainfall_probability < 30:
        rules.append("IF rainfall < 30% THEN prioritize irrigation check")

    return rules


def build_advisory(activity: str, rainfall_probability: int, rule_hits: list[str]) -> str:
    if rule_hits:
        return f"Action guidance for {activity}: " + "; ".join(rule_hits)
    if rainfall_probability > 60:
        return f"Action guidance for {activity}: monitor rain trend before field operation."
    return f"Action guidance for {activity}: weather risk is moderate-to-low, proceed with caution."


async def generate_smart_advisory(payload: SmartAdvisoryRequest) -> SmartAdvisoryResponse:
    weather = await fetch_weather(payload.location)
    rainfall_probability = int(weather.get("rainfall_probability", 50))
    triggered_rules = evaluate_rules(payload.activity, rainfall_probability)
    advisory = build_advisory(payload.activity, rainfall_probability, triggered_rules)

    return SmartAdvisoryResponse(
        advisory=advisory,
        weather=weather,
        triggered_rules=triggered_rules,
        context={
            "location": payload.location,
            "crop": payload.crop,
            "season": payload.season,
        },
    )
