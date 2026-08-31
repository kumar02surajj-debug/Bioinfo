# TranscriptoX — Backend API Reference

## Endpoints

### 1. Health Check
- `GET /api/health`
- Response: `{"status": "ok", "service": "TranscriptoX Backend", "version": "1.0.0"}`

### 2. Dataset Upload & Ingestion
- `POST /api/upload`
  - Multipart Form: `expression_file`, `metadata_file`, `survival_file` (optional)
- `POST /api/upload/demo`
  - Loads synthetic benchmark RNA-seq dataset (600 genes x 16 samples)

### 3. Quality Control (QC)
- `POST /api/qc`
  - Body: `{"dataset_id": "...", "normalization": "log2_cpm"}`
  - Returns: Library sizes, expression distributions, Pearson correlation matrix, normalized matrix preview.

### 4. Principal Component Analysis (PCA)
- `POST /api/pca`
  - Body: `{"dataset_id": "...", "n_components": 3}`
  - Returns: Explained variance ratios, 2D/3D sample projection coordinates, top PC1/PC2 gene loadings.

### 5. Differential Expression (DEG)
- `POST /api/differential-expression`
  - Body: `{"dataset_id": "...", "control_group": "Control", "treatment_group": "Treatment", "log2fc_threshold": 1.0, "fdr_threshold": 0.05}`
  - Returns: Log2FC, Welch's t-test p-values, Benjamini-Hochberg FDR q-values, UP/DOWN status.

### 6. Hierarchical Clustering
- `POST /api/clustering`
  - Body: `{"dataset_id": "...", "deg_top_n": 50, "distance_metric": "euclidean", "linkage_method": "average"}`
  - Returns: Ordered gene & sample IDs, Z-score matrix, sample condition bars.

### 7. Functional Pathway Enrichment
- `POST /api/enrichment`
  - Body: `{"dataset_id": "...", "database": "GO_Biological_Process", "organism": "Human", "regulation_filter": "ALL"}`
  - Returns: Over-represented GO terms, KEGG pathways, Reactome pathways via GSEAPy.

### 8. Clinical Survival Analysis
- `POST /api/survival`
  - Body: `{"dataset_id": "...", "gene_id": "TP53", "split_method": "median"}`
  - Returns: Kaplan-Meier curve step points, Log-rank p-value, Hazard Ratio + 95% CI, Number-at-risk table.

### 9. Report Compilation
- `POST /api/report`
  - Body: `{"dataset_id": "...", "include_qc": true, ...}`
  - Returns: Standalone downloadable HTML analysis report.
