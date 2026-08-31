from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Literal

SplitMethod = Literal["median", "tertile", "custom"]

class SurvivalRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    gene_id: str = Field(..., description="Target gene identifier to evaluate for prognostic association")
    split_method: SplitMethod = Field("median", description="Expression threshold split: median, tertile, or custom")
    custom_cutoff: Optional[float] = Field(None, description="Custom expression threshold value if split_method is custom")

class KMPoint(BaseModel):
    time: float
    survival_probability: float
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    events_at_time: int
    censored_at_time: int
    number_at_risk: int

class SurvivalGroupData(BaseModel):
    name: str
    sample_count: int
    event_count: int
    median_survival_time: Optional[float] = None
    km_curve: List[KMPoint]

class RiskTableRow(BaseModel):
    time: float
    high_at_risk: int
    low_at_risk: int

class SurvivalResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    gene_id: str
    split_method: SplitMethod
    cutoff_value: float
    high_group: SurvivalGroupData
    low_group: SurvivalGroupData
    log_rank_p_value: float
    hazard_ratio: float
    hr_ci_lower: float
    hr_ci_upper: float
    wald_p_value: float
    risk_table: List[RiskTableRow]
    association_disclaimer: str
