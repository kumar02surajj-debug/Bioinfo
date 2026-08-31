# Statistical Methodology & Mathematical Formulations

## 1. Normalization
- **Counts Per Million (CPM):**
  $$\text{CPM}_{ij} = \frac{X_{ij}}{\sum_{k=1}^m X_{kj}} \times 10^6$$
- **Log2 CPM Transformation:**
  $$\log_2(\text{CPM}_{ij} + 1)$$

## 2. Principal Component Analysis (PCA)
- Standardized feature vector across samples:
  $$Z_{ij} = \frac{\log_2(\text{CPM}_{ij} + 1) - \mu_i}{\sigma_i}$$
- Singular Value Decomposition (SVD) of centered covariance matrix.

## 3. Differential Expression Analysis
- **Log2 Fold Change:**
  $$\log_2\text{FC}_g = \bar{X}_{\text{treatment}, g} - \bar{X}_{\text{control}, g}$$
- **Welch's Two-Sample t-statistic:**
  $$t = \frac{\bar{X}_1 - \bar{X}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}$$
- **Benjamini-Hochberg FDR:**
  $$q_{(i)} = \min \left( \frac{p_{(i)} \cdot m}{i}, q_{(i+1)} \right)$$

## 4. Hierarchical Clustering
- Row Z-score standardization across samples.
- Agglomerative hierarchical linkage with Euclidean, Correlation, or Cosine distances.

## 5. Kaplan-Meier Survival Estimation
- Non-parametric step estimator:
  $$\hat{S}(t) = \prod_{t_i \le t} \left( 1 - \frac{d_i}{n_i} \right)$$
- Log-rank test and univariate Cox Proportional Hazards regression.
