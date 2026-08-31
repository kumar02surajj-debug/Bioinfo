import React from 'react';
import type { DEGItem } from '../types';
import { PlotWrapper } from './PlotWrapper';

interface MAPlotProps {
  data: DEGItem[];
  log2fcCutoff: number;
}

export const MAPlot: React.FC<MAPlotProps> = ({ data, log2fcCutoff }) => {
  const upGenes = data.filter((d) => d.status === 'UP');
  const downGenes = data.filter((d) => d.status === 'DOWN');
  const notSigGenes = data.filter((d) => d.status === 'NOT_SIG');

  const createTrace = (subset: DEGItem[], name: string, color: string) => {
    return {
      x: subset.map((d) => d.base_mean),
      y: subset.map((d) => d.log2fc),
      mode: 'markers',
      type: 'scatter',
      name: `${name} (${subset.length})`,
      text: subset.map((d) => d.gene_id),
      marker: {
        color: color,
        size: subset.length > 500 ? 5 : 7,
        opacity: name === 'Not Significant' ? 0.35 : 0.85,
        line: { color: 'rgba(255,255,255,0.2)', width: 0.5 },
      },
      customdata: subset.map((d) => [
        d.gene_id,
        d.base_mean.toFixed(2),
        d.log2fc.toFixed(3),
        d.adj_p_value < 0.0001 ? d.adj_p_value.toExponential(3) : d.adj_p_value.toFixed(4),
      ]),
      hovertemplate:
        '<b>%{customdata[0]}</b><br>' +
        'Mean Expression (A): %{customdata[1]}<br>' +
        'log2FC (M): %{customdata[2]}<br>' +
        'FDR: %{customdata[3]}<extra></extra>',
    };
  };

  const traces = [
    createTrace(notSigGenes, 'Not Significant', '#64748b'),
    createTrace(upGenes, 'Up-regulated', '#f43f5e'),
    createTrace(downGenes, 'Down-regulated', '#38bdf8'),
  ];

  const layout = {
    title: {
      text: `MA Plot (Mean Log Expression vs log2FC)`,
      font: { color: '#f1f5f9', size: 14, family: 'Inter, sans-serif' },
    },
    xaxis: {
      title: 'Average Normalized Expression [A = 0.5 * (Mean_Trt + Mean_Ctrl)]',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
    yaxis: {
      title: 'log2 Fold Change [M]',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
    shapes: [
      {
        type: 'line',
        x0: 0,
        x1: 1,
        xref: 'paper',
        y0: log2fcCutoff,
        y1: log2fcCutoff,
        line: { color: '#f43f5e', width: 1.5, dash: 'dash' },
      },
      {
        type: 'line',
        x0: 0,
        x1: 1,
        xref: 'paper',
        y0: -log2fcCutoff,
        y1: -log2fcCutoff,
        line: { color: '#38bdf8', width: 1.5, dash: 'dash' },
      },
    ],
    hovermode: 'closest',
  };

  return (
    <PlotWrapper
      data={traces}
      layout={layout}
      title="MA Plot — Expression vs Fold Change"
      filename="transcriptox_ma_plot"
    />
  );
};
