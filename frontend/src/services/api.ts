import type {
  HealthResponse,
  UploadResponse,
  QCResponse,
  PCAResponse,
  DifferentialResponse,
  ClusteringResponse,
  EnrichmentResponse,
  SurvivalResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errData.error || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }
    throw new ApiError(errorDetail || `Request failed with status ${response.status}`, response.status, errorDetail);
  }
  return response.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    return await handleResponse<HealthResponse>(response);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Unable to reach backend server. Please verify backend is running on ' + BASE_URL,
      0,
      error?.message
    );
  }
}

export async function uploadDataset(
  expressionFile: File,
  metadataFile: File,
  survivalFile?: File | null
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('expression_file', expressionFile);
  formData.append('metadata_file', metadataFile);
  if (survivalFile) {
    formData.append('survival_file', survivalFile);
  }

  const response = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<UploadResponse>(response);
}

export async function loadDemoDataset(): Promise<UploadResponse> {
  const response = await fetch(`${BASE_URL}/api/upload/demo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
  return handleResponse<UploadResponse>(response);
}

export async function runQC(
  datasetId: string,
  params?: { normalization?: string }
): Promise<QCResponse> {
  const response = await fetch(`${BASE_URL}/api/qc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      normalization: params?.normalization || 'log2_cpm',
    }),
  });
  return handleResponse<QCResponse>(response);
}

export async function runPCA(
  datasetId: string,
  params?: { n_components?: number }
): Promise<PCAResponse> {
  const response = await fetch(`${BASE_URL}/api/pca`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      n_components: params?.n_components || 3,
    }),
  });
  return handleResponse<PCAResponse>(response);
}

export async function runDifferentialExpression(
  datasetId: string,
  params: {
    control_group: string;
    treatment_group: string;
    log2fc_threshold?: number;
    fdr_threshold?: number;
  }
): Promise<DifferentialResponse> {
  const response = await fetch(`${BASE_URL}/api/differential-expression`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      control_group: params.control_group,
      treatment_group: params.treatment_group,
      log2fc_threshold: params.log2fc_threshold ?? 1.0,
      fdr_threshold: params.fdr_threshold ?? 0.05,
    }),
  });
  return handleResponse<DifferentialResponse>(response);
}

export async function runClustering(
  datasetId: string,
  params: {
    deg_top_n?: number | 'all';
    distance_metric?: string;
    linkage_method?: string;
    custom_genes?: string[];
  }
): Promise<ClusteringResponse> {
  const response = await fetch(`${BASE_URL}/api/clustering`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      deg_top_n: params.deg_top_n ?? 50,
      distance_metric: params.distance_metric ?? 'euclidean',
      linkage_method: params.linkage_method ?? 'average',
      custom_genes: params.custom_genes ?? [],
    }),
  });
  return handleResponse<ClusteringResponse>(response);
}

export async function runEnrichment(
  datasetId: string,
  params: {
    database: string;
    organism?: string;
    regulation_filter?: 'ALL' | 'UP' | 'DOWN';
    custom_genes?: string[];
  }
): Promise<EnrichmentResponse> {
  const response = await fetch(`${BASE_URL}/api/enrichment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      database: params.database,
      organism: params.organism ?? 'Human',
      regulation_filter: params.regulation_filter ?? 'ALL',
      custom_genes: params.custom_genes ?? [],
    }),
  });
  return handleResponse<EnrichmentResponse>(response);
}

export async function runSurvival(
  datasetId: string,
  params: {
    gene_id: string;
    split_method?: 'median' | 'tertile' | 'custom';
    custom_cutoff?: number;
  }
): Promise<SurvivalResponse> {
  const response = await fetch(`${BASE_URL}/api/survival`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      gene_id: params.gene_id,
      split_method: params.split_method ?? 'median',
      custom_cutoff: params.custom_cutoff,
    }),
  });
  return handleResponse<SurvivalResponse>(response);
}

export async function generateReport(
  datasetId: string,
  reportOptions: {
    include_qc?: boolean;
    include_pca?: boolean;
    include_deg?: boolean;
    include_clustering?: boolean;
    include_enrichment?: boolean;
    include_survival?: boolean;
    survival_gene?: string;
  }
): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/api/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      ...reportOptions,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(errorData.detail || 'Failed to generate report', response.status);
  }
  return response.blob();
}
