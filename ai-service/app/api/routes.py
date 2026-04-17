from fastapi import APIRouter

from app.schemas import AskRequest, AskResponse, RecommendationRequest, RecommendationResponse
from app.schemas import SmartAdvisoryRequest, SmartAdvisoryResponse
from app.schemas import (
    EnterpriseContext,
    EnterpriseCalendarRequest,
    EnterprisePredictYieldRequest,
    EnterpriseCostOptimizationRequest,
    EnterpriseActionRequest,
)
from app.jobs.alert_scheduler import recent_alerts
from app.services.advisory_engine import generate_advice, recommend_crops
from app.services.smart_advisory import generate_smart_advisory
from app.services.enterprise_engine import (
    list_templates,
    build_enterprise_blueprint,
    generate_calendar,
    predict_yield,
    optimize_costs,
    recommend_actions,
)

router = APIRouter()


def _alert_signature(alert: dict) -> tuple[str, str]:
    return (alert.get("title", ""), alert.get("message", ""))


@router.post("/ask", response_model=AskResponse)
def ask_advisor(payload: AskRequest) -> AskResponse:
    response, confidence = generate_advice(payload)
    return AskResponse(
        response=response,
        confidence=confidence,
        context={
            "location": payload.location,
            "crop": payload.crop,
            "season": payload.season,
        },
    )


@router.post("/recommend", response_model=RecommendationResponse)
def recommend(payload: RecommendationRequest) -> RecommendationResponse:
    return recommend_crops(payload)


@router.post("/smart-advisory", response_model=SmartAdvisoryResponse)
async def smart_advisory(payload: SmartAdvisoryRequest) -> SmartAdvisoryResponse:
    return await generate_smart_advisory(payload)


@router.get("/alerts/recent")
def recent_weather_alerts() -> dict:
    unique_alerts = []
    seen = set()
    for alert in reversed(recent_alerts):
        signature = _alert_signature(alert)
        if signature in seen:
            continue
        seen.add(signature)
        unique_alerts.append(alert)

    unique_alerts.reverse()
    return {"alerts": unique_alerts[-10:]}


@router.get("/enterprise/templates")
def enterprise_templates() -> dict:
    return {"items": list_templates()}


@router.post("/enterprise/create")
def enterprise_create(payload: EnterpriseContext) -> dict:
    return build_enterprise_blueprint(payload.model_dump())


@router.post("/enterprise/generate-calendar")
def enterprise_generate_calendar(payload: EnterpriseCalendarRequest) -> dict:
    source_template = payload.template
    if not source_template:
        blueprint = build_enterprise_blueprint(payload.model_dump())
        if not blueprint.get("found"):
            return blueprint
        source_template = blueprint["template"]

    items = generate_calendar(
        source_template,
        payload.start_date,
        horizon_days=payload.horizon_days,
        scale=payload.scale_units,
    )
    return {"items": items}


@router.post("/enterprise/predict-yield")
def enterprise_predict_yield(payload: EnterprisePredictYieldRequest) -> dict:
    return predict_yield(payload.model_dump())


@router.post("/enterprise/optimize-costs")
def enterprise_optimize_costs(payload: EnterpriseCostOptimizationRequest) -> dict:
    return optimize_costs(payload.model_dump())


@router.post("/enterprise/recommend-actions")
def enterprise_recommend_actions(payload: EnterpriseActionRequest) -> dict:
    return recommend_actions(payload.model_dump())
