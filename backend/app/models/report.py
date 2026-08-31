from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class ReportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    include_qc: bool = True
    include_pca: bool = True
    include_deg: bool = True
    include_clustering: bool = True
    include_enrichment: bool = True
    include_survival: bool = True
    survival_gene: Optional[str] = None
