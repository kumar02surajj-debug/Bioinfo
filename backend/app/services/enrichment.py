"""
Pathway & Functional Enrichment Service for TranscriptoX.
Interfaces with GSEAPy and Enrichr for GO terms, KEGG, and Reactome pathways.
Zero fabrication: returns honest network error states if external knowledgebases are unreachable.
"""

import gseapy as gp
import pandas as pd
import numpy as np
import logging
from typing import List, Optional

from app.models.enrichment import EnrichmentResponse, PathwayItem, RegulationFilter
from app.services.data_processing import get_dataset, ValidationError

logger = logging.getLogger("transcriptox.services.enrichment")

# Supported gene set libraries
DATABASE_MAP = {
    "GO_Biological_Process": {
        "human": "GO_Biological_Process_2023",
        "mouse": "GO_Biological_Process_2023",
        "rat": "GO_Biological_Process_2023",
    },
    "GO_Molecular_Function": {
        "human": "GO_Molecular_Function_2023",
        "mouse": "GO_Molecular_Function_2023",
        "rat": "GO_Molecular_Function_2023",
    },
    "GO_Cellular_Component": {
        "human": "GO_Cellular_Component_2023",
        "mouse": "GO_Cellular_Component_2023",
        "rat": "GO_Cellular_Component_2023",
    },
    "KEGG_Pathways": {
        "human": "KEGG_2021_Human",
        "mouse": "KEGG_2019_Mouse",
        "rat": "KEGG_2019_Rat",
    },
    "Reactome_Pathways": {
        "human": "Reactome_2022",
        "mouse": "Reactome_2022",
        "rat": "Reactome_2022",
    },
}


def resolve_gene_set_library(database_key: str, organism: str) -> str:
    """Resolve normalized library name for organism."""
    org_key = organism.lower()
    if database_key in DATABASE_MAP:
        return DATABASE_MAP[database_key].get(org_key, DATABASE_MAP[database_key]["human"])
    # If direct library name passed
    return database_key


def compute_enrichment(
    dataset_id: str,
    database: str = "GO_Biological_Process_2023",
    organism: str = "Human",
    regulation_filter: RegulationFilter = "ALL",
    custom_genes: Optional[List[str]] = None
) -> EnrichmentResponse:
    """
    Execute pathway enrichment analysis via GSEAPy Enrichr.
    """
    data = get_dataset(dataset_id)

    # 1. Determine Gene List
    gene_list: List[str] = []

    if custom_genes and len(custom_genes) > 0:
        gene_list = [g.strip().upper() for g in custom_genes if g.strip()]
    elif "deg_results_df" in data:
        deg_df: pd.DataFrame = data["deg_results_df"]

        if regulation_filter == "UP":
            subset = deg_df[deg_df["status"] == "UP"].sort_values("adj_p_value")
        elif regulation_filter == "DOWN":
            subset = deg_df[deg_df["status"] == "DOWN"].sort_values("adj_p_value")
        else: # ALL
            subset = deg_df[deg_df["status"].isin(["UP", "DOWN"])].sort_values("adj_p_value")

        if not subset.empty:
            # Rank by significance and select up to top 500 driver genes for optimal Enrichr performance
            top_subset = subset.head(500)
            gene_list = [str(g).upper() for g in top_subset.index.tolist()]
        else:
            # If no DEGs passed threshold, fallback to top 50 ranked genes
            gene_list = [str(g).upper() for g in deg_df.sort_values("adj_p_value").index[:50]]
    else:
        # Fallback to top variable genes
        norm_df = data.get("normalized_counts", data["raw_counts"])
        stds = norm_df.std(axis=1)
        gene_list = [str(g).upper() for g in stds.sort_values(ascending=False).index[:50]]

    # Deduplicate and remove empty
    gene_list = list(dict.fromkeys(gene_list))
    input_count = len(gene_list)

    if input_count < 3:
        return EnrichmentResponse(
            dataset_id=dataset_id,
            database=database,
            organism=organism,
            regulation_filter=regulation_filter,
            input_gene_count=input_count,
            significant_pathways_count=0,
            results=[],
            service_status="partial",
            service_message=f"At least 3 valid gene symbols are required for pathway enrichment analysis (received {input_count} genes). Please adjust significance thresholds or supply custom genes."
        )

    # 2. Resolve Library
    lib_name = resolve_gene_set_library(database, organism)

    # 3. Query GSEAPy Enrichr
    try:
        enr = gp.enrichr(
            gene_list=gene_list,
            gene_sets=lib_name,
            organism=organism.lower(),
            outdir=None,
            no_plot=True,
            cutoff=1.0 # Return all pathways to allow client-side threshold exploration
        )

        res_df: pd.DataFrame = enr.results

        if res_df is None or res_df.empty:
            return EnrichmentResponse(
                dataset_id=dataset_id,
                database=lib_name,
                organism=organism,
                regulation_filter=regulation_filter,
                input_gene_count=input_count,
                significant_pathways_count=0,
                results=[],
                service_status="ok",
                service_message="No significantly enriched terms found for this gene set."
            )

        # Standardize column headers
        res_df.columns = [str(c).strip().replace(" ", "_") for c in res_df.columns]

        # Parse terms
        pathway_items: List[PathwayItem] = []
        sig_count = 0

        for _, row in res_df.iterrows():
            term = str(row.get("Term", "Unknown Term"))
            overlap_str = str(row.get("Overlap", "0/0"))
            pval = float(row.get("P-value", row.get("p_value", 1.0)))
            adj_pval = float(row.get("Adjusted_P-value", row.get("adjusted_p_value", 1.0)))
            combined_score = float(row.get("Combined_Score", 0.0)) if "Combined_Score" in row else None

            genes_raw = str(row.get("Genes", ""))
            genes_list = [g.strip() for g in genes_raw.split(";") if g.strip()]

            # Compute overlap integer count and gene ratio
            try:
                k_val = int(overlap_str.split("/")[0])
            except Exception:
                k_val = len(genes_list)

            gene_ratio = round(k_val / input_count, 4) if input_count > 0 else 0.0

            if adj_pval < 0.05:
                sig_count += 1

            pathway_items.append(
                PathwayItem(
                    term=term,
                    database=lib_name,
                    overlap=overlap_str,
                    gene_count=k_val,
                    p_value=pval,
                    adj_p_value=adj_pval,
                    combined_score=round(combined_score, 2) if combined_score is not None else None,
                    genes=genes_list,
                    gene_ratio=gene_ratio
                )
            )

        # Sort by Adjusted P-value ascending
        pathway_items.sort(key=lambda x: x.adj_p_value)

        response = EnrichmentResponse(
            dataset_id=dataset_id,
            database=lib_name,
            organism=organism,
            regulation_filter=regulation_filter,
            input_gene_count=input_count,
            significant_pathways_count=sig_count,
            results=pathway_items[:100], # Top 100 terms
            service_status="ok",
            service_message=None
        )

        data["analysis_results"]["enrichment"] = response
        return response

    except Exception as e:
        logger.error(f"GSEAPy Enrichr query failed: {str(e)}", exc_info=True)
        # Honest error reporting without fake fabrication
        return EnrichmentResponse(
            dataset_id=dataset_id,
            database=lib_name,
            organism=organism,
            regulation_filter=regulation_filter,
            input_gene_count=input_count,
            significant_pathways_count=0,
            results=[],
            service_status="error",
            service_message=f"This analysis could not be completed because the enrichment service is unavailable or unable to reach the Enrichr library ('{lib_name}'). Error: {str(e)}"
        )
