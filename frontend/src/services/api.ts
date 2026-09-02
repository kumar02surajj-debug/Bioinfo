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

/**
 * Resolved backend base URL.
 *
 * Priority:
 *  1. VITE_API_BASE_URL env var — must be set in Vercel (or any CI) dashboard for production.
 *  2. http://localhost:8000 — fallback ONLY when running in local dev mode (import.meta.env.DEV).
 *
 * If VITE_API_BASE_URL is not set in a production build, an error is thrown at
 * startup so the misconfiguration is immediately visible rather than silently
 * sending every request to localhost (which fails for deployed users).
 */
function resolveBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, ''); // strip trailing slash
  }
  if (import.meta.env.DEV) {
    // Local development convenience — use localhost when env var is absent
    return 'http://localhost:8000';
  }
  // Production build without VITE_API_BASE_URL set → fail loudly
  throw new Error(
    '[TranscriptoX] VITE_API_BASE_URL is not set. ' +
    'Add it to your Vercel project environment variables and redeploy. ' +
    'Example: VITE_API_BASE_URL=https://transcriptox-api.onrender.com'
  );
}

export const BASE_URL = resolveBaseUrl();

export const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for standard computations
export const REPORT_TIMEOUT_MS = 90000; // 90 seconds for heavy HTML report bundle generation
export const HEALTH_PING_TIMEOUT_MS = 8000; // 8 seconds per health check poll ping

export class ApiError extends Error {
  status: number;
  detail?: string;
  isTimeout?: boolean;
  constructor(message: string, status: number, detail?: string, isTimeout: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.isTimeout = isTimeout;
  }
}

/**
 * Enhanced fetch wrapper with AbortController timeout support and friendly error messages.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      const seconds = Math.round(timeoutMs / 1000);
      throw new ApiError(
        `Request timed out after ${seconds}s. The backend server may be waking up from sleep (cold start) or processing a heavy task. Please try again.`,
        408,
        `Operation exceeded timeout of ${seconds} seconds`,
        true
      );
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Unable to reach backend server at ${BASE_URL}. If the backend is hosted on a free tier, it may take up to 60s to wake up.`,
      0,
      error?.message || 'Network request failed'
    );
  } finally {
    clearTimeout(timeoutId);
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
    throw new ApiError(
      errorDetail || `Request failed with status ${response.status}`,
      response.status,
      errorDetail
    );
  }
  return response.json();
}

/**
 * Health check with configurable short timeout for fast retry polling.
 */
export async function checkHealth(timeoutMs: number = HEALTH_PING_TIMEOUT_MS): Promise<HealthResponse> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/health`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  }, timeoutMs);
  return handleResponse<HealthResponse>(response);
}

export async function uploadDataset(
  expressionFile: File,
  metadataFile?: File | null,
  survivalFile?: File | null
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('expression_file', expressionFile);
  if (metadataFile) {
    formData.append('metadata_file', metadataFile);
  }
  if (survivalFile) {
    formData.append('survival_file', survivalFile);
  }

  const response = await fetchWithTimeout(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  }, DEFAULT_TIMEOUT_MS);
  return handleResponse<UploadResponse>(response);
}

export async function confirmMetadata(
  datasetId: string,
  sampleConditions: Record<string, string>
): Promise<UploadResponse> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/upload/confirm-metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      sample_conditions: sampleConditions,
    }),
  }, DEFAULT_TIMEOUT_MS);
  return handleResponse<UploadResponse>(response);
}

export async function loadDemoDataset(): Promise<UploadResponse> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/upload/demo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  }, DEFAULT_TIMEOUT_MS);
  return handleResponse<UploadResponse>(response);
}

export async function runQC(
  datasetId: string,
  params?: { normalization?: string }
): Promise<QCResponse> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/qc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      normalization: params?.normalization || 'log2_cpm',
    }),
  }, DEFAULT_TIMEOUT_MS);
  return handleResponse<QCResponse>(response);
}

export async function runPCA(
  datasetId: string,
  params?: { n_components?: number }
): Promise<PCAResponse> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/pca`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      n_components: params?.n_components || 3,
    }),
  }, DEFAULT_TIMEOUT_MS);
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/differential-expression`, {
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
  }, DEFAULT_TIMEOUT_MS);
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/clustering`, {
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
  }, DEFAULT_TIMEOUT_MS);
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/enrichment`, {
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
  }, DEFAULT_TIMEOUT_MS);
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/survival`, {
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
  }, DEFAULT_TIMEOUT_MS);
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      ...reportOptions,
    }),
  }, REPORT_TIMEOUT_MS);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(errorData.detail || 'Failed to generate report', response.status);
  }
  return response.blob();
}
