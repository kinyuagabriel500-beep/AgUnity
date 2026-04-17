from app.schemas import AdvisoryContext, AskRequest, RecommendationResponse


def generate_advice(payload: AskRequest) -> tuple[str, float]:
    prompt_context = (
        f"For {payload.crop} in {payload.location} during {payload.season} season, "
        f"recommended guidance is to monitor soil moisture, scout pests weekly, "
        "and split fertilizer application to reduce input losses."
    )
    answer = (
        f"{prompt_context} Question received: '{payload.question}'. "
        "Action now: prioritize field scouting and apply only needed inputs."
    )
    return answer, 0.82


def recommend_crops(context: AdvisoryContext) -> RecommendationResponse:
    location = context.location.lower()
    season = context.season.lower()
    base = ["maize", "beans", "sorghum"]

    if "coast" in location or "mombasa" in location:
        base = ["cassava", "cowpeas", "green grams"]
    elif "rift" in location or "nakuru" in location:
        base = ["wheat", "potatoes", "barley"]

    if "dry" in season:
        base = [crop for crop in base if crop in {"sorghum", "cassava", "cowpeas", "green grams"}] or [
            "sorghum",
            "cowpeas",
            "pigeon peas",
        ]

    rationale = (
        f"Recommendations consider local suitability for {context.location}, expected seasonal pattern "
        f"({context.season}), and resilience alternatives around {context.crop}."
    )
    return RecommendationResponse(recommendations=base, rationale=rationale, context=context)
