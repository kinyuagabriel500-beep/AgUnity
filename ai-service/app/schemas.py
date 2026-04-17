from pydantic import BaseModel, Field


class AdvisoryContext(BaseModel):
    location: str = Field(..., min_length=2, max_length=120)
    crop: str = Field(..., min_length=2, max_length=80)
    season: str = Field(..., min_length=2, max_length=60)


class AskRequest(AdvisoryContext):
    question: str = Field(..., min_length=3, max_length=1000)


class AskResponse(BaseModel):
    response: str
    context: AdvisoryContext
    confidence: float = Field(..., ge=0, le=1)


class RecommendationRequest(AdvisoryContext):
    pass


class RecommendationResponse(BaseModel):
    recommendations: list[str]
    rationale: str
    context: AdvisoryContext


class SmartAdvisoryRequest(AdvisoryContext):
    activity: str = Field(..., min_length=3, max_length=80)


class SmartAdvisoryResponse(BaseModel):
    advisory: str
    weather: dict
    triggered_rules: list[str]
    context: AdvisoryContext


class EnterpriseContext(BaseModel):
    type: str = Field(..., min_length=2, max_length=80)
    subtype: str = Field(..., min_length=2, max_length=120)
    start_date: str = Field(..., min_length=8, max_length=20)
    scale_units: float = Field(default=1, gt=0)
    horizon_days: int = Field(default=120, ge=14, le=540)


class EnterpriseCalendarRequest(EnterpriseContext):
    template: dict | None = None


class EnterprisePredictYieldRequest(BaseModel):
    type: str = Field(..., min_length=2, max_length=80)
    subtype: str = Field(..., min_length=2, max_length=120)
    scale_units: float = Field(default=1, gt=0)
    cycle_days: int = Field(default=120, ge=7, le=730)
    output_unit: str = Field(default="units", min_length=1, max_length=40)


class EnterpriseCostOptimizationRequest(BaseModel):
    type: str = Field(..., min_length=2, max_length=80)
    subtype: str = Field(..., min_length=2, max_length=120)
    resources: list[dict] = Field(default_factory=list)


class EnterpriseActionRequest(BaseModel):
    type: str = Field(..., min_length=2, max_length=80)
    subtype: str = Field(..., min_length=2, max_length=120)
    upcoming_tasks: list[dict] = Field(default_factory=list)
