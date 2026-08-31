# TranscriptoX — Pipeline Architecture & Technical Design

## System Architecture

```
TranscriptoX/
├── frontend/
│   ├── src/
│   │   ├── components/        # UI components (Header, Sidebar, Stepper, StatusBadge, DataTable, StatCard)
│   │   ├── charts/            # Plotly bioinformatics visualizers (PCAPlot, VolcanoPlot, MAPlot, ClusterHeatmap, EnrichmentDotPlot, SurvivalKMPlot)
│   │   ├── pages/             # Route views (Dashboard, Upload, QC, Differential, Clustering, Enrichment, Survival, Results, Documentation)
│   │   ├── context/           # Centralized session state (AnalysisContext.tsx)
│   │   ├── services/          # HTTP API client (api.ts)
│   │   └── types/             # TypeScript definitions
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI setup, CORS, router inclusion
│   │   ├── api/               # Router endpoints (upload, qc, pca, differential, clustering, enrichment, survival, report)
│   │   ├── services/          # Computation engines (data_processing, qc, pca, differential, clustering, enrichment, survival, report)
│   │   ├── models/            # Pydantic schema contracts
│   │   └── utils/             # Synthetic demo generator
│   └── tests/                 # Full pytest integration test suite
├── data/
│   └── example/               # Synthetic benchmark CSV files
├── docs/                      # Technical and biological reference manuals
├── results/                   # Output storage
└── README.md
```

## Data Flow & Centralized Session

All pipeline stages communicate through a unified data stream:
1. **Data Ingestion:** Raw count matrix + Sample metadata validated against schema.
2. **Quality Control & PCA:** Log2-CPM normalization computed once and cached.
3. **Differential Expression:** Parametric Welch's t-test + BH FDR multiple testing.
4. **Clustering & Heatmap:** Automatically consumes top significant DEGs, scales to Z-scores, and generates hierarchical trees.
5. **Pathway Enrichment:** Queries live Enrichr endpoints via GSEAPy for GO/KEGG/Reactome pathways.
6. **Survival Analysis:** Fits Kaplan-Meier survival curves and Cox PH regression for selected biomarkers.
7. **Report Compilation:** Aggregates findings into a self-contained HTML report.
