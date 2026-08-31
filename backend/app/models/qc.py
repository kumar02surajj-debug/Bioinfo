from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Optional

class QCRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    normalization: str = Field("log2_cpm", description="Normalization method: log2_cpm or median_ratios")

class LibrarySizeItem(BaseModel):
    sample_id: str
    condition: str
    library_size: float

class ExpressionDistItem(BaseModel):
    sample_id: str
    condition: str
    min: float
    q1: float
    median: float
    q3: float
    max: float
    mean: float

class CorrelationMatrixData(BaseModel):
    samples: List[str]
    conditions: List[str]
    matrix: List[List[float]]

class QCSummaryMetrics(BaseModel):
    total_genes: int
    total_samples: int
    mean_library_size: float
    median_library_size: float
    genes_with_zero_counts: int
    zero_fraction_total: float
    normalization_applied: str

class TransformedMatrixPreview(BaseModel):
    genes: List[str]
    samples: List[str]
    values: List[List[float]]

class QCResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str
    summary: QCSummaryMetrics
    library_sizes: List[LibrarySizeItem]
    expression_distributions: List[ExpressionDistItem]
    correlation: CorrelationMatrixData
    transformed_matrix_preview: TransformedMatrixPreview
