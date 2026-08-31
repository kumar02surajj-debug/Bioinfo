import React, { useState } from 'react';
import type { DEGItem } from '../types';
import { PlotWrapper } from './PlotWrapper';
import { Eye, EyeOff } from 'lucide-react';

interface VolcanoPlotProps {
  data: DEGItem[];
  log2fcCutoff: number;
  fdrCutoff: number;
}

export const VolcanoPlot: React.FC<VolcanoPlotProps> = ({
  data,
  log2fcCutoff,
  fdrCutoff,
}) => {
  const [showTopLabels, setShowTopLabels] = useState<boolean>(true);

  const upGenes = data.filter((d) => d.status === 'UP');
  const downGenes = data.filter((d) => d.status === 'DOWN');
  const notSigGenes = data.filter((d) => d.status === 'NOT_SIG');

  // Find top 10 most significant DEGs (lowest FDR, then highest |log2FC|)
  const significantDEGs = [...upGenes, ...downGenes].sort((a, b) => {
    if (a.adj_p_value !== b.adj_p_value) return a.adj_p_value - b.adj_p_value;
    return Math.abs(b.log2fc) - Math.abs(a.log2fc);
  });
  const top10DEGs = significantDEGs.slice(0, 10);

  const createTrace = (subset: DEGItem[], name: string, color: string) => {
    return {
      x: subset.map((d) => d.log2fc),
      y: subset.map((d) => -Math.log10(Math.max(1e-300, d.adj_p_value))),
      mode: 'markers',
      type: 'scatter',
      name: `${name} (${subset.length})`,
      text: subset.map((d) => d.gene_id),
      marker: {
        color: color,
        size: subset.length > 500 ? 5 : 7,
        opacity: name === 'Not Significant' ? 0.35 : 0.85,
        line: { color: 'rgba(255,255,255,0.3)', width: 0.5 },
      },
      customdata: subset.map((d) => [
        d.gene_id,
        d.log2fc.toFixed(3),
        d.adj_p_value < 0.0001 ? d.adj_p_value.toExponential(3) : d.adj_p_value.toFixed(4),
        d.p_value < 0.0001 ? d.p_value.toExponential(3) : d.p_value.toFixed(4),
      ]),
      hovertemplate:
        '<b>%{customdata[0]}</b><br>' +
        'log2FC: %{customdata[1]}<br>' +
        'FDR (adj. p): %{customdata[2]}<br>' +
        'p-value: %{customdata[3]}<extra></extra>',
    };
  };

  // Special Highlight trace for Top 10 genes
  const top10Trace = {
    x: top10DEGs.map((d) => d.log2fc),
    y: top10DEGs.map((d) => -Math.log10(Math.max(1e-300, d.adj_p_value))),
    mode: showTopLabels ? 'markers+text' : 'markers',
    type: 'scatter',
    name: `Top ${top10DEGs.length} Driver DEGs`,
    text: top10DEGs.map((d) => d.gene_id),
    textposition: 'top center',
    textfont: { size: 11, color: '#f8fafc', family: 'JetBrains Mono, monospace' },
    marker: {
      color: '#facc15', // Neon gold yellow ring
      size: 11,
      symbol: 'circle-open',
      line: { color: '#facc15', width: 2 },
    },
    hoverinfo: 'skip',
    showlegend: true,
  };

  const traces = [
    createTrace(notSigGenes, 'Not Significant', '#64748b'),
    createTrace(upGenes, 'Up-regulated', '#f43f5e'),
    createTrace(downGenes, 'Down-regulated', '#38bdf8'),
    ...(top10DEGs.length > 0 ? [top10Trace] : []),
  ];

  const yThreshold = -Math.log10(fdrCutoff);

  const layout = {
    title: {
      text: `Volcano Plot (log2FC vs -log10 FDR) — ${upGenes.length} Up, ${downGenes.length} Down`,
      font: { color: '#f1f5f9', size: 14, family: 'Inter, sans-serif' },
    },
    xaxis: {
      title: 'log2 Fold Change (Treatment vs Control)',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
    yaxis: {
      title: '-log10 False Discovery Rate (-log10 FDR)',
      zeroline: false,
    },
    shapes: [
      // Left vertical cutoff
      {
        type: 'line',
        x0: -log2fcCutoff,
        x1: -log2fcCutoff,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#38bdf8', width: 1.5, dash: 'dash' },
      },
      // Right vertical cutoff
      {
        type: 'line',
        x0: log2fcCutoff,
        x1: log2fcCutoff,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#f43f5e', width: 1.5, dash: 'dash' },
      },
      // Horizontal FDR cutoff
      {
        type: 'line',
        x0: 0,
        x1: 1,
        xref: 'paper',
        y0: yThreshold,
        y1: yThreshold,
        line: { color: '#facc15', width: 1.5, dash: 'dash' },
      },
    ],
    annotations: [
      {
        xref: 'paper',
        yref: 'paper',
        x: 0.98,
        y: 0.96,
        text: `<span style="color:#f43f5e"><b>UP: ${upGenes.length}</b></span> | <span style="color:#38bdf8"><b>DOWN: ${downGenes.length}</b></span>`,
        showarrow: false,
        align: 'right',
        bgcolor: 'rgba(15, 23, 42, 0.85)',
        bordercolor: 'rgba(51, 65, 85, 0.6)',
        borderwidth: 1,
        borderpad: 6,
        font: { size: 11 },
      },
    ],
    hovermode: 'closest',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Thresholds: <strong className="text-slate-200">|log2FC| ≥ {log2fcCutoff}</strong>, <strong className="text-slate-200">FDR ≤ {fdrCutoff}</strong></span>
        </div>
        <button
          onClick={() => setShowTopLabels(!showTopLabels)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          {showTopLabels ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-amber-400" />}
          <span>{showTopLabels ? 'Hide Top Gene Labels' : 'Show Top Gene Labels'}</span>
        </button>
      </div>

      <PlotWrapper
        data={traces}
        layout={layout}
        title="Volcano Plot — Differential Gene Expression"
        filename="transcriptox_volcano_plot"
      />
    </div>
  );
};
