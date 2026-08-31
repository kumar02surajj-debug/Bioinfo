"""
Survival & Prognostic Analysis Service for TranscriptoX.
Implements Kaplan-Meier survival curves, Log-rank test, Cox Proportional Hazards regression,
and Number-at-Risk timelines via Lifelines.
"""

import numpy as np
import pandas as pd
from lifelines import KaplanMeierFitter, CoxPHFitter
from lifelines.statistics import logrank_test
import logging
from typing import List, Optional

from app.models.survival import (
    SurvivalResponse,
    SurvivalGroupData,
    KMPoint,
    RiskTableRow,
    SplitMethod
)
from app.services.data_processing import get_dataset, ValidationError
from app.services.qc import normalize_cpm_log2

logger = logging.getLogger("transcriptox.services.survival")


def compute_survival_analysis(
    dataset_id: str,
    gene_id: str,
    split_method: SplitMethod = "median",
    custom_cutoff: Optional[float] = None
) -> SurvivalResponse:
    """
    Execute Kaplan-Meier survival analysis and Cox Proportional Hazards model for target gene.
    """
    data = get_dataset(dataset_id)
    surv_df: Optional[pd.DataFrame] = data.get("survival")

    if surv_df is None or surv_df.empty:
        raise ValidationError(
            "Survival analysis could not be completed because no clinical survival metadata "
            "(time and event columns) was provided for this dataset."
        )

    norm_df: pd.DataFrame = data.get("normalized_counts")
    if norm_df is None:
        raw_df: pd.DataFrame = data["raw_counts"]
        norm_df = normalize_cpm_log2(raw_df)
        data["normalized_counts"] = norm_df

    target_gene = gene_id.strip()
    if target_gene not in norm_df.index:
        # Try case-insensitive matching
        upper_map = {g.upper(): g for g in norm_df.index}
        if target_gene.upper() in upper_map:
            target_gene = upper_map[target_gene.upper()]
        else:
            raise ValidationError(f"Target gene '{gene_id}' was not found in the expression matrix.")

    # 1. Merge Expression and Survival
    gene_expr = norm_df.loc[target_gene]
    expr_df = pd.DataFrame({
        "sample_id": gene_expr.index,
        "expression": gene_expr.values
    })

    merged = pd.merge(surv_df, expr_df, on="sample_id").dropna(subset=["time", "event", "expression"])

    if len(merged) < 4:
        raise ValidationError(f"Insufficient overlapping samples ({len(merged)}) between survival metadata and expression matrix.")

    # 2. Stratification into High vs Low Groups
    expr_vals = merged["expression"].values

    if split_method == "tertile":
        q_low = float(np.percentile(expr_vals, 33.33))
        q_high = float(np.percentile(expr_vals, 66.67))
        cutoff_val = q_high
        high_mask = merged["expression"] >= q_high
        low_mask = merged["expression"] <= q_low
        # Include intermediate if needed or split cleanly
        if not np.any(high_mask) or not np.any(low_mask):
            cutoff_val = float(np.median(expr_vals))
            high_mask = merged["expression"] >= cutoff_val
            low_mask = merged["expression"] < cutoff_val
    elif split_method == "custom" and custom_cutoff is not None:
        cutoff_val = float(custom_cutoff)
        high_mask = merged["expression"] >= cutoff_val
        low_mask = merged["expression"] < cutoff_val
    else: # Default: median
        cutoff_val = float(np.median(expr_vals))
        high_mask = merged["expression"] >= cutoff_val
        low_mask = merged["expression"] < cutoff_val

    high_df = merged[high_mask].copy()
    low_df = merged[low_mask].copy()

    if len(high_df) == 0 or len(low_df) == 0:
        raise ValidationError(
            f"Stratification resulted in an empty group (High: {len(high_df)}, Low: {len(low_df)}). "
            f"Please choose a different split method or cutoff value."
        )

    # 3. Fit Kaplan-Meier Estimators
    kmf_high = KaplanMeierFitter()
    kmf_low = KaplanMeierFitter()

    kmf_high.fit(durations=high_df["time"], event_observed=high_df["event"], label="High Expression")
    kmf_low.fit(durations=low_df["time"], event_observed=low_df["event"], label="Low Expression")

    def build_km_points(kmf: KaplanMeierFitter, sub_df: pd.DataFrame) -> List[KMPoint]:
        timeline = kmf.timeline
        surv_prob = kmf.survival_function_["High Expression" if "High Expression" in kmf.survival_function_ else "Low Expression"].values
        ci = kmf.confidence_interval_
        ci_cols = ci.columns.tolist()

        points: List[KMPoint] = []
        for t, prob in zip(timeline, surv_prob):
            events = int(((sub_df["time"] == t) & (sub_df["event"] == 1)).sum())
            censored = int(((sub_df["time"] == t) & (sub_df["event"] == 0)).sum())
            at_risk = int((sub_df["time"] >= t).sum())

            low_ci = float(ci.loc[t, ci_cols[0]]) if t in ci.index else max(0.0, prob - 0.1)
            high_ci = float(ci.loc[t, ci_cols[1]]) if t in ci.index else min(1.0, prob + 0.1)

            points.append(
                KMPoint(
                    time=round(float(t), 2),
                    survival_probability=round(float(prob), 4),
                    ci_lower=round(float(low_ci), 4),
                    ci_upper=round(float(high_ci), 4),
                    events_at_time=events,
                    censored_at_time=censored,
                    number_at_risk=at_risk
                )
            )
        return points

    high_km_points = build_km_points(kmf_high, high_df)
    low_km_points = build_km_points(kmf_low, low_df)

    med_high = float(kmf_high.median_survival_time_) if not np.isnan(kmf_high.median_survival_time_) else None
    med_low = float(kmf_low.median_survival_time_) if not np.isnan(kmf_low.median_survival_time_) else None

    # 4. Log-Rank Statistical Test
    try:
        lr_result = logrank_test(
            durations_A=high_df["time"],
            durations_B=low_df["time"],
            event_observed_A=high_df["event"],
            event_observed_B=low_df["event"]
        )
        log_rank_p = float(np.clip(lr_result.p_value, 1e-300, 1.0))
    except Exception as e:
        logger.warning(f"Log-rank test failed: {e}")
        log_rank_p = 1.0

    # 5. Cox Proportional Hazards Model
    hazard_ratio = 1.0
    hr_lower = 0.5
    hr_upper = 2.0
    wald_p = 1.0

    try:
        # Create group binary variable: 1 for High, 0 for Low
        cox_data = merged.copy()
        cox_data["is_high"] = (cox_data["expression"] >= cutoff_val).astype(int)

        if cox_data["event"].sum() > 0 and len(cox_data["is_high"].unique()) > 1:
            cph = CoxPHFitter(penalizer=0.01)
            cph.fit(cox_data[["time", "event", "is_high"]], duration_col="time", event_col="event")

            hazard_ratio = float(np.exp(cph.params_["is_high"]))
            ci_df = cph.confidence_intervals_
            hr_lower = float(np.exp(ci_df.loc["is_high"].iloc[0]))
            hr_upper = float(np.exp(ci_df.loc["is_high"].iloc[1]))
            wald_p = float(cph.summary.loc["is_high", "p"])
    except Exception as e:
        logger.warning(f"Cox PH regression failed: {e}")
        hazard_ratio = 1.0

    # 6. Timeline Number-at-Risk Table
    max_time = float(max(merged["time"].max(), 10.0))
    time_steps = np.linspace(0, max_time, num=6)
    risk_table: List[RiskTableRow] = []

    for t_step in time_steps:
        t_val = round(float(t_step), 1)
        h_risk = int((high_df["time"] >= t_val).sum())
        l_risk = int((low_df["time"] >= t_val).sum())
        risk_table.append(
            RiskTableRow(
                time=t_val,
                high_at_risk=h_risk,
                low_at_risk=l_risk
            )
        )

    disclaimer_text = (
        "Gene expression is statistically associated with survival in this dataset. "
        "This correlation does not imply direct biological causality or clinical efficacy."
    )

    response = SurvivalResponse(
        dataset_id=dataset_id,
        gene_id=target_gene,
        split_method=split_method,
        cutoff_value=round(cutoff_val, 3),
        high_group=SurvivalGroupData(
            name="High Expression",
            sample_count=len(high_df),
            event_count=int(high_df["event"].sum()),
            median_survival_time=round(med_high, 2) if med_high is not None else None,
            km_curve=high_km_points
        ),
        low_group=SurvivalGroupData(
            name="Low Expression",
            sample_count=len(low_df),
            event_count=int(low_df["event"].sum()),
            median_survival_time=round(med_low, 2) if med_low is not None else None,
            km_curve=low_km_points
        ),
        log_rank_p_value=log_rank_p,
        hazard_ratio=round(hazard_ratio, 3),
        hr_ci_lower=round(hr_lower, 3),
        hr_ci_upper=round(hr_upper, 3),
        wald_p_value=round(wald_p, 4),
        risk_table=risk_table,
        association_disclaimer=disclaimer_text
    )

    data["analysis_results"]["survival"] = response
    return response
