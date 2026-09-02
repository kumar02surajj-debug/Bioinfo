from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional

class SampleMetadataItem(BaseModel):
    sample_id: str
    condition: str
    batch: Optional[str] = None
    tissue_type: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None

class SurvivalMetadataItem(BaseModel):
    sample_id: str
    time: float = Field(..., description="Follow-up or event time")
    event: int = Field(..., description="0 = censored, 1 = event")

class ConfirmMetadataRequest(BaseModel):
    dataset_id: str
    sample_conditions: Dict[str, str] = Field(..., description="Mapping of sample_id to condition name")

class UploadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    dataset_id: str
    dataset_name: str
    gene_count: int
    sample_count: int
    samples: List[str]
    conditions: List[str]
    condition_counts: Dict[str, int]
    has_survival: bool
    is_demo: bool = False
    genes_preview: List[str]
    metadata_preview: List[Dict[str, Any]]
    survival_preview: Optional[List[Dict[str, Any]]] = None
    requires_group_confirmation: bool = False
    suggested_groups: Optional[Dict[str, str]] = None
    group_pattern_detected: bool = False

