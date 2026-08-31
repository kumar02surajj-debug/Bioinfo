import React from 'react';
import type { CorrelationMatrixData } from '../types';
import { PlotWrapper } from './PlotWrapper';

interface CorrelationHeatmapChartProps {
  data: CorrelationMatrixData;
}

export const CorrelationHeatmapChart: React.FC<CorrelationHeatmapChartProps> = ({ data }) => {
  const trace = {
    z: data.matrix,
    x: data.samples,
    y: data.samples,
    type: 'heatmap',
    colorscale: [
      [0, '#0b0f19'],
      [0.3, '#0369a1'],
      [0.7, '#0ea5e9'],
      [1, '#38bdf8'],
    ],
    zmin: Math.max(0.5, Math.min(...data.matrix.flat())),
    zmax: 1.0,
    colorbar: {
      title: 'Pearson r',
      tickfont: { color: '#94a3b8', size: 10, family: 'JetBrains Mono, monospace' },
      titlefont: { color: '#cbd5e1', size: 11, family: 'Inter, sans-serif' },
    },
    hoverongaps: false,
    hovertemplate: '<b>Sample 1:</b> %{y}<br><b>Sample 2:</b> %{x}<br><b>Pearson r:</b> %{z:.4f}<extra></extra>',
  };

  const layout = {
    title: {
      text: 'Sample-to-Sample Correlation Heatmap (Pearson r on log2-CPM)',
      font: { color: '#f1f5f9', size: 14, family: 'Inter, sans-serif' },
    },
    xaxis: {
      tickangle: -45,
      tickfont: { color: '#cbd5e1', size: 10, family: 'JetBrains Mono, monospace' },
    },
    yaxis: {
      autorange: 'reversed',
      tickfont: { color: '#cbd5e1', size: 10, family: 'JetBrains Mono, monospace' },
    },
    margin: { l: 90, r: 40, t: 45, b: 90 },
  };

  return (
    <PlotWrapper
      data={[trace]}
      layout={layout}
      title="Sample-to-Sample Correlation Heatmap"
      filename="transcriptox_qc_correlation_heatmap"
    />
  );
};
