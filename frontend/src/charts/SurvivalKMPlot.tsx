import React from 'react';
import type { SurvivalResponse } from '../types';
import { PlotWrapper } from './PlotWrapper';

interface SurvivalKMPlotProps {
  data: SurvivalResponse;
}

export const SurvivalKMPlot: React.FC<SurvivalKMPlotProps> = ({ data }) => {
  const { high_group, low_group, gene_id, hazard_ratio, hr_ci_lower, hr_ci_upper, log_rank_p_value } = data;

  const createGroupTraces = (
    group: typeof high_group,
    name: string,
    color: string,
    fillColor: string
  ) => {
    const times = group.km_curve.map((p) => p.time);
    const probs = group.km_curve.map((p) => p.survival_probability * 100);
    const ciLower = group.km_curve.map((p) => (p.ci_lower !== undefined ? p.ci_lower * 100 : 0));
    const ciUpper = group.km_curve.map((p) => (p.ci_upper !== undefined ? p.ci_upper * 100 : 100));

    // Censored points
    const censoredPoints = group.km_curve.filter((p) => p.censored_at_time > 0);

    const stepLineTrace = {
      x: times,
      y: probs,
      mode: 'lines',
      name: `${name} (n=${group.sample_count})`,
      line: { shape: 'hv', color: color, width: 2.5 },
      customdata: group.km_curve.map((p) => [
        p.time,
        (p.survival_probability * 100).toFixed(1) + '%',
        p.number_at_risk,
        p.events_at_time,
        p.censored_at_time,
      ]),
      hovertemplate:
        `<b>${name}</b><br>` +
        'Time: %{customdata[0]} mo<br>' +
        'Survival: %{customdata[1]}<br>' +
        'At Risk: %{customdata[2]}<br>' +
        'Events: %{customdata[3]}<br>' +
        'Censored: %{customdata[4]}<extra></extra>',
    };

    // Shaded CI band
    const ciTrace = {
      x: [...times, ...times.slice().reverse()],
      y: [...ciUpper, ...ciLower.slice().reverse()],
      fill: 'toself',
      fillcolor: fillColor,
      line: { color: 'transparent' },
      name: `${name} 95% CI`,
      showlegend: false,
      hoverinfo: 'skip',
    };

    // Censored markers
    const censoredTrace = {
      x: censoredPoints.map((p) => p.time),
      y: censoredPoints.map((p) => p.survival_probability * 100),
      mode: 'markers',
      name: `${name} Censored (+)`,
      marker: {
        symbol: 'cross',
        size: 8,
        color: color,
        line: { color: '#ffffff', width: 1 },
      },
      showlegend: false,
      hoverinfo: 'skip',
    };

    return [ciTrace, stepLineTrace, censoredTrace];
  };

  const highTraces = createGroupTraces(
    high_group,
    'High Expression (≥ Cutoff)',
    '#f43f5e',
    'rgba(244, 63, 94, 0.12)'
  );
  const lowTraces = createGroupTraces(
    low_group,
    'Low Expression (< Cutoff)',
    '#38bdf8',
    'rgba(56, 189, 248, 0.12)'
  );

  const formattedP =
    log_rank_p_value < 0.0001
      ? log_rank_p_value.toExponential(3)
      : log_rank_p_value.toFixed(4);

  const layout = {
    title: {
      text: `Kaplan-Meier Survival Estimation: ${gene_id} (Cutoff: ${data.cutoff_value.toFixed(2)})`,
      font: { color: '#f1f5f9', size: 14, family: 'Inter, sans-serif' },
    },
    xaxis: {
      title: 'Follow-up Time (Months)',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
    yaxis: {
      title: 'Overall Survival Probability (%)',
      range: [0, 105],
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
    legend: {
      x: 0.65,
      y: 0.95,
      bgcolor: 'rgba(15, 23, 42, 0.85)',
      bordercolor: 'rgba(51, 65, 85, 0.6)',
      borderwidth: 1,
    },
    annotations: [
      {
        xref: 'paper',
        yref: 'paper',
        x: 0.04,
        y: 0.12,
        text:
          `<b>Log-rank p:</b> ${formattedP}<br>` +
          `<b>Hazard Ratio:</b> ${hazard_ratio.toFixed(2)} [95% CI: ${hr_ci_lower.toFixed(2)} - ${hr_ci_upper.toFixed(2)}]`,
        showarrow: false,
        align: 'left',
        bgcolor: 'rgba(15, 23, 42, 0.9)',
        bordercolor: '#475569',
        borderwidth: 1,
        borderpad: 6,
        font: { color: '#f8fafc', size: 11, family: 'JetBrains Mono, monospace' },
      },
    ],
  };

  return (
    <div className="min-h-[440px]">
      <PlotWrapper
        data={[...highTraces, ...lowTraces]}
        layout={layout}
        title={`Kaplan-Meier Survival Plot — ${gene_id}`}
        filename={`transcriptox_survival_${gene_id}`}
      />
    </div>
  );
};
