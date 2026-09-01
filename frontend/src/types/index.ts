export type AnalysisStep =
  | 'dashboard'
  | 'upload'
  | 'qc'
  | 'differential'
  | 'clustering'
  | 'enrichment'
  | 'survival'
  | 'results'
  | 'docs'
  | 'howtouse';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface SampleMeta {
  sample_id: string;
  condition: string;
  batch?: string;
  [key: string]: any;
}

export interface SurvivalMeta {
  sample_id: string;
  time: number;
  event: number; // 0 = censored, 1 = event
}

export interface UploadResponse {
  dataset_id: string;
  dataset_name: string;
  gene_count: number;
  sample_count: number;
  samples: string[];
  conditions: string[];
  condition_counts: Record<string, number>;
  has_survival: boolean;
  is_demo: boolean;
  genes_preview: string[];
  metadata_preview: SampleMeta[];
  survival_preview?: SurvivalMeta[];
}

export interface LibrarySizeItem {
  sample_id: string;
  condition: string;
  library_size: number;
}

export interface ZeroCountItem {
  gene_id: string;
  zero_count: number;
  zero_percentage: number;
}

export interface ExpressionDistItem {
  sample_id: string;
  condition: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
}

export interface CorrelationMatrixData {
  samples: string[];
  conditions: string[];
  matrix: number[][]; // 2D correlation matrix
}

export interface QCSummaryMetrics {
  total_genes: number;
  total_samples: number;
  mean_library_size: number;
  median_library_size: number;
  genes_with_zero_counts: number;
  zero_fraction_total: number;
  normalization_applied: string;
}

export interface QCResponse {
  dataset_id: string;
  summary: QCSummaryMetrics;
  library_sizes: LibrarySizeItem[];
  expression_distributions: ExpressionDistItem[];
  correlation: CorrelationMatrixData;
  transformed_matrix_preview: {
    genes: string[];
    samples: string[];
    values: number[][];
  };
}

export interface PCASampleCoord {
  sample_id: string;
  condition: string;
  pc1: number;
  pc2: number;
  pc3?: number;
}

export interface GeneLoading {
  gene_id: string;
  loading: number;
}

export interface PCAResponse {
  dataset_id: string;
  explained_variance_ratio: number[]; // [pc1, pc2, pc3, ...]
  cumulative_variance_ratio: number[];
  samples: PCASampleCoord[];
  top_loadings_pc1: GeneLoading[];
  top_loadings_pc2: GeneLoading[];
  normalization_note: string;
}

export type RegulationStatus = 'UP' | 'DOWN' | 'NOT_SIG';
export type RegulationFilter = 'ALL' | 'UP' | 'DOWN';

export interface DEGItem {
  gene_id: string;
  mean_control: number;
  mean_treatment: number;
  log2fc: number;
  p_value: number;
  adj_p_value: number; // FDR (Benjamini-Hochberg)
  status: RegulationStatus;
  base_mean: number;
}

export interface DifferentialResponse {
  dataset_id: string;
  control_group: string;
  treatment_group: string;
  log2fc_threshold: number;
  fdr_threshold: number;
  total_tested_genes: number;
  up_regulated_count: number;
  down_regulated_count: number;
  not_sig_count: number;
  results: DEGItem[];
  methodology_note: string;
}

export interface ClusteringResponse {
  dataset_id: string;
  gene_ids: string[];
  sample_ids: string[];
  z_scores: number[][]; // [gene_idx][sample_idx]
  sample_conditions: string[];
  distance_metric: string;
  linkage_method: string;
  gene_order_indices: number[];
  sample_order_indices: number[];
}

export interface PathwayItem {
  term: string;
  database: string;
  overlap: string;
  gene_count: number;
  p_value: number;
  adj_p_value: number;
  combined_score?: number;
  genes: string[];
  gene_ratio: number;
}

export interface EnrichmentResponse {
  dataset_id: string;
  database: string;
  organism: string;
  regulation_filter: 'ALL' | 'UP' | 'DOWN';
  input_gene_count: number;
  significant_pathways_count: number;
  results: PathwayItem[];
  service_status: 'ok' | 'partial' | 'error';
  service_message?: string;
}

export type SplitMethod = 'median' | 'tertile' | 'custom';

export interface KMPoint {
  time: number;
  survival_probability: number;
  ci_lower?: number;
  ci_upper?: number;
  events_at_time: number;
  censored_at_time: number;
  number_at_risk: number;
}

export interface SurvivalGroupData {
  name: string;
  sample_count: number;
  event_count: number;
  median_survival_time: number | null;
  km_curve: KMPoint[];
}

export interface RiskTableRow {
  time: number;
  high_at_risk: number;
  low_at_risk: number;
}

export interface SurvivalResponse {
  dataset_id: string;
  gene_id: string;
  split_method: 'median' | 'tertile' | 'custom';
  cutoff_value: number;
  high_group: SurvivalGroupData;
  low_group: SurvivalGroupData;
  log_rank_p_value: number;
  hazard_ratio: number;
  hr_ci_lower: number;
  hr_ci_upper: number;
  wald_p_value: number;
  risk_table: RiskTableRow[];
  association_disclaimer: string;
}
