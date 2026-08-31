from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Literal

RegulationFilter = Literal["ALL", "UP", "DOWN"]

class EnrichmentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    database: str = Field("GO_Biological_Process_2023", description="Enrichr gene set library name")
    organism: str = Field("Human", description="Organism: Human, Mouse, or Rat")
    regulation_filter: RegulationFilter = Field("ALL", description="Filter DEGs by regulation state: ALL, UP, or DOWN")
    custom_genes: Optional[List[str]] = Field(default_factory=list, description="Optional custom gene symbol list")

class PathwayItem(BaseModel):
    term: str
    database: str
    overlap: str
    gene_count: int
    p_value: float
    adj_p_value: float
    combined_score: Optional[float] = None
    genes: List[str]
    gene_ratio: float

class EnrichmentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    database: str
    organism: str
    regulation_filter: RegulationFilter
    input_gene_count: int
    significant_pathways_count: int
    results: List[PathwayItem]
    service_status: Literal["ok", "partial", "error"]
    service_message: Optional[str] = None
