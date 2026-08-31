from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Union

class ClusteringRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    deg_top_n: Union[int, str] = Field(50, description="Top N DEGs (e.g. 20, 50, 100) or 'all'")
    distance_metric: str = Field("euclidean", description="Distance metric: euclidean, correlation, cosine")
    linkage_method: str = Field("average", description="Linkage method: average, complete, ward, single")
    custom_genes: Optional[List[str]] = Field(default_factory=list, description="Custom gene IDs to cluster")

class ClusteringResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    gene_ids: List[str]
    sample_ids: List[str]
    z_scores: List[List[float]] # [gene_idx][sample_idx]
    sample_conditions: List[str]
    distance_metric: str
    linkage_method: str
    gene_order_indices: List[int]
    sample_order_indices: List[int]
