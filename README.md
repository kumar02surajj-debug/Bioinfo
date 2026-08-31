# TranscriptoX — Integrated Transcriptomic Analysis Pipeline

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Plotly](https://img.shields.io/badge/Plotly-Interactive-3F4F75.svg?style=flat&logo=plotly)](https://plotly.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**TranscriptoX** is an end-to-end bioinformatics workspace for RNA-seq and transcriptomic profiling. It unifies quality control, dimensional reduction, differential expression, hierarchical clustering, functional pathway enrichment, and clinical survival modeling into an automated analysis pipeline.

---

## Workflow Overview

```
Upload → 01 QC + PCA → 02 Differential Expression → 03 Clustering + Heatmap
       → 04 Pathway Enrichment → 05 Survival Analysis → Results → HTML Report
```

Results flow automatically from one module to the next without manual gene list copy-pasting or file reformatting.

---

## Key Features

1. **Strict Data Validation & Demo Launcher:**
   - Ingestion of raw count matrices, sample metadata, and clinical survival timelines.
   - Comprehensive integrity checks (duplicate genes, sample column mismatches, non-numeric values).
   - 1-click Synthetic Benchmark Dataset loader.
2. **Quality Control & Standardized PCA:**
   - Sequencing depth (library sizes), zero-count proportions, and expression distribution boxplots.
   - Pairwise Pearson correlation heatmap across samples.
   - 2D/3D PCA decomposition computed strictly on standardized $\log_2(\text{CPM} + 1)$ counts with top driver gene loadings.
3. **Differential Gene Expression (DEG):**
   - Parametric Welch's two-sample $t$-test with Benjamini-Hochberg (BH) False Discovery Rate (FDR) adjustment.
   - Interactive Volcano Plots and MA Plots with threshold markers.
   - Searchable, sortable, and paginated master DEG table with CSV export.
4. **Hierarchical Clustering & Heatmaps:**
   - Automatically consumes significant DEGs or user-defined gene sets.
   - Row-wise $Z$-score standardization ($\mu=0, \sigma=1$).
   - Interactive dendrogram-ordered heatmap with sample phenotype annotation bars.
5. **Functional Pathway Enrichment:**
   - Direct integration with **GSEAPy** querying live **Enrichr** libraries (Gene Ontology BP/MF/CC, KEGG Pathways, Reactome).
   - Support for Human (*Homo sapiens*), Mouse (*Mus musculus*), and Rat (*Rattus norvegicus*).
   - Interactive Dot Plots (Gene Ratio vs Pathway) and Significance Bar Charts.
   - Zero synthetic fabrication: honest network error handling if external servers are unreachable.
6. **Clinical Survival Analysis:**
   - Stratification of patient cohorts into High vs Low expression groups (Median, Tertile, or Custom cutoffs).
   - Kaplan-Meier survival curves with 95% confidence intervals and censored event ticks.
   - Non-parametric Log-rank test and Cox Proportional Hazards regression (Hazard Ratio, 95% CI, Wald $p$-value).
   - Timeline Number-at-Risk table.
7. **Results Hub & Standalone HTML Report:**
   - Consolidated summary cards across all pipeline stages.
   - Batch CSV data export hub.
   - Standalone, styled HTML analysis report generator containing full methods, tables, and disclaimers.
8. **Bioinformatics Reference Handbook:**
   - Complete in-app documentation covering mathematical formulations, statistical approximations, and interpretation guides.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Plotly.js / react-plotly.js, Lucide React icons.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, Pandas, NumPy, SciPy, scikit-learn, statsmodels, lifelines, GSEAPy.
- **Security & Integrity:** Zero required API keys, zero external AI chatbots, no database required, no fake results.

---

## Directory Structure

```
TranscriptoX/
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout and common components (Header, Sidebar, Stepper, DataTable, StatCard)
│   │   ├── charts/            # Plotly chart components (Volcano, PCA, Heatmap, DotPlot, SurvivalKM)
│   │   ├── pages/             # Page views (Dashboard, Upload, QC, DEG, Clustering, Enrichment, Survival, Results, Docs)
│   │   ├── context/           # AnalysisContext.tsx (Central session state)
│   │   ├── services/          # api.ts (Central HTTP client)
│   │   └── types/             # TypeScript type definitions
├── backend/
│   ├── app/
│   │   ├── main.py            # Application entry, CORS, and router registrations
│   │   ├── api/               # Router endpoints (upload, qc, pca, differential, clustering, enrichment, survival, report)
│   │   ├── services/          # Statistical and bioinformatics analysis services
│   │   ├── models/            # Pydantic schemas
│   │   └── utils/             # Demo dataset generation
│   └── tests/                 # Full backend pytest suite
├── data/
│   └── example/               # Synthetic demo CSV files (expression, metadata, survival)
├── docs/                      # Technical manuals
├── results/                   # Output storage
└── README.md
```

---

## Installation & Running Locally

### Prerequisites
- Node.js (v18+) & npm
- Python (3.11+)

### 1. Backend Setup
```bash
cd TranscriptoX/backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be live at: `http://127.0.0.1:8000` (Swagger UI at `/docs`).

### 2. Frontend Setup
```bash
cd TranscriptoX/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be live at: `http://localhost:5173`.

---

## Input Data Formats

### 1. Expression Matrix (`expression.csv`)
Rows represent unique gene symbols; columns represent sample identifiers:
```csv
gene_id,Sample_Ctrl_01,Sample_Ctrl_02,Sample_Trt_01,Sample_Trt_02
TP53,142,156,23,19
EGFR,45,52,380,412
MYC,12,18,520,495
```

### 2. Sample Metadata (`metadata.csv`)
```csv
sample_id,condition,batch
Sample_Ctrl_01,Control,Batch1
Sample_Ctrl_02,Control,Batch1
Sample_Trt_01,Treatment,Batch2
Sample_Trt_02,Treatment,Batch2
```

### 3. Clinical Survival Data (`survival.csv` — Optional)
```csv
sample_id,time,event
Sample_Ctrl_01,48.5,0
Sample_Ctrl_02,36.2,1
Sample_Trt_01,14.8,1
Sample_Trt_02,22.1,0
```
*Note: `event` must be `0` (censored/alive) or `1` (event/death).*

---

## Statistical Methodology & Transparency

- **Normalization:** $\text{CPM}_{ij} = \frac{\text{Count}_{ij}}{\text{LibrarySize}_j} \times 10^6$, $\log_2(\text{CPM}_{ij} + 1.0)$.
- **Differential Expression:** Two-sample Welch's $t$-test on log2(CPM+1) normalized counts with Benjamini-Hochberg FDR correction. *Note: This serves as an exploratory statistical approximation compared to negative binomial generalized linear models (e.g. DESeq2/edgeR).*
- **Clustering:** Row-wise $Z$-score standardization ($Z = \frac{x - \mu}{\sigma}$) and hierarchical clustering via SciPy.
- **Enrichment:** Fisher's Exact test against official Enrichr gene set libraries via GSEAPy.
- **Survival:** Kaplan-Meier product-limit estimator, Log-rank test, and Cox Proportional Hazards regression via Lifelines.

---

## Testing & Verification

Run the comprehensive backend pytest suite:
```bash
cd TranscriptoX/backend
python -m pytest tests
```

---

## Scientific Disclaimer

> **TranscriptoX is intended for scientific research, academic education, and exploratory bioinformatics discovery.**
> All statistical associations, hazard ratios, $p$-values, and pathway enrichments must be independently validated through wet-lab experimental assays (e.g., RT-qPCR, Western blot, functional knockdowns) prior to any clinical, diagnostic, or therapeutic decision-making.
