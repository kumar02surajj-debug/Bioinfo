import React from 'react';
import type { ExpressionDistItem } from '../types';
import { PlotWrapper } from './PlotWrapper';

interface ExpressionDistributionChartProps {
  data: ExpressionDistItem[];
}

export const ExpressionDistributionChart: React.FC<ExpressionDistributionChartProps> = ({ data }) => {
  const traces = data.map((d) => ({
    type: 'box',
    name: d.sample_id,
    q1: [d.q1],
    median: [d.median],
    q3: [d.q3],
    lowerfence: [d.min],
    upperfence: [d.max],
    mean: [d.mean],
    boxpoints: false,
    hoverinfo: 'name+q1+median+q3+min+max+mean',
    marker: {
      color: d.condition.toLowerCase().includes('ctrl') ? '#38bdf8' : '#34d399',
    },
    line: { width: 1.5 },
  }));

  const layout = {
    title: {
      text: 'Sample Expression Distributions (log2(CPM + 1))',
      font: { color: '#f1f5f9', size: 14, family: 'Inter, sans-serif' },
    },
    showlegend: false,
    xaxis: {
      title: 'Sample Identifier',
      tickangle: -45,
      tickfont: { color: '#cbd5e1', size: 10, family: 'JetBrains Mono, monospace' },
    },
    yaxis: {
      title: 'log2(CPM + 1) Normalized Expression',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
  };

  return (
    <PlotWrapper
      data={traces}
      layout={layout}
      title="Sample Expression Boxplots (log2-CPM)"
      filename="transcriptox_qc_expression_distributions"
    />
  );
};
