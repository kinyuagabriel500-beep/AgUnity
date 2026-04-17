import httpx

from app.core.config import settings


async def fetch_weather(location: str) -> dict:
    params = {"q": location, "appid": settings.weather_api_key, "units": "metric"}
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(settings.weather_base_url, params=params)
            response.raise_for_status()
            data = response.json()
            return {
                "temperature_c": data.get("main", {}).get("temp"),
                "humidity": data.get("main", {}).get("humidity"),
                "rainfall_probability": min(
                    100, max(0, int((data.get("clouds", {}).get("all") or 0) * 0.9))
                ),
                "condition": (data.get("weather") or [{}])[0].get("main", "Unknown"),
            }
    except Exception:
        # Safe fallback for low-bandwidth or intermittent API conditions.
        return {
            "temperature_c": None,
            "humidity": None,
            "rainfall_probability": 50,
            "condition": "Unknown",
        }
