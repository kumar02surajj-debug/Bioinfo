from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class PCARequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    n_components: int = Field(3, ge=2, le=10, description="Number of principal components to calculate")

class PCASampleCoord(BaseModel):
    sample_id: str
    condition: str
    pc1: float
    pc2: float
    pc3: Optional[float] = None

class GeneLoading(BaseModel):
    gene_id: str
    loading: float

class PCAResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    explained_variance_ratio: List[float]
    cumulative_variance_ratio: List[float]
    samples: List[PCASampleCoord]
    top_loadings_pc1: List[GeneLoading]
    top_loadings_pc2: List[GeneLoading]
    normalization_note: str
