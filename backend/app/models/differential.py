from pydantic import BaseModel, ConfigDict, Field
from typing import List, Literal

RegulationStatus = Literal["UP", "DOWN", "NOT_SIG"]

class DifferentialRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    control_group: str = Field(..., description="Control condition label in metadata")
    treatment_group: str = Field(..., description="Treatment/Comparison condition label in metadata")
    log2fc_threshold: float = Field(1.0, ge=0.0, le=10.0, description="Absolute log2 Fold Change cutoff (e.g. 1.0 for 2-fold)")
    fdr_threshold: float = Field(0.05, gt=0.0, le=1.0, description="False Discovery Rate (BH adjusted p-value) cutoff")

class DEGItem(BaseModel):
    gene_id: str
    mean_control: float
    mean_treatment: float
    log2fc: float
    p_value: float
    adj_p_value: float
    status: RegulationStatus
    base_mean: float

class DifferentialResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    control_group: str
    treatment_group: str
    log2fc_threshold: float
    fdr_threshold: float
    total_tested_genes: int
    up_regulated_count: int
    down_regulated_count: int
    not_sig_count: int
    results: List[DEGItem]
    methodology_note: str
