import React, { useState } from 'react';
import type { PCAResponse } from '../types';
import { PlotWrapper } from './PlotWrapper';
import { Box, Layers, Sparkles } from 'lucide-react';

interface PCAPlotProps {
  data: PCAResponse;
}

export const PCAPlot: React.FC<PCAPlotProps> = ({ data }) => {
  const [is3D, setIs3D] = useState<boolean>(false);
  const [showLoadings, setShowLoadings] = useState<boolean>(true);

  const pc1Var = data.explained_variance_ratio[0]
    ? (data.explained_variance_ratio[0] * 100).toFixed(1)
    : '0';
  const pc2Var = data.explained_variance_ratio[1]
    ? (data.explained_variance_ratio[1] * 100).toFixed(1)
    : '0';
  const pc3Var = data.explained_variance_ratio[2]
    ? (data.explained_variance_ratio[2] * 100).toFixed(1)
    : '0';

  const conditions = Array.from(new Set(data.samples.map((s) => s.condition)));
  const palette = ['#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#fb7185', '#2dd4bf'];

  const traces2D: any[] = conditions.map((cond, idx) => {
    const subset = data.samples.filter((s) => s.condition === cond);
    return {
      x: subset.map((s) => s.pc1),
      y: subset.map((s) => s.pc2),
      mode: 'markers+text',
      type: 'scatter',
      name: `${cond} (n=${subset.length})`,
      text: subset.map((s) => s.sample_id),
      textposition: 'top center',
      textfont: { size: 9, color: '#cbd5e1', family: 'JetBrains Mono, monospace' },
      marker: {
        size: 11,
        color: palette[idx % palette.length],
        line: { color: '#ffffff', width: 1.5 },
        opacity: 0.9,
      },
      hovertemplate:
        '<b>%{text}</b><br>' +
        `<b>Group:</b> ${cond}<br>` +
        '<b>PC1:</b> %{x:.3f}<br>' +
        '<b>PC2:</b> %{y:.3f}<extra></extra>',
    };
  });

  const traces3D: any[] = conditions.map((cond, idx) => {
    const subset = data.samples.filter((s) => s.condition === cond);
    return {
      x: subset.map((s) => s.pc1),
      y: subset.map((s) => s.pc2),
      z: subset.map((s) => s.pc3 || 0),
      mode: 'markers+text',
      type: 'scatter3d',
      name: `${cond} (n=${subset.length})`,
      text: subset.map((s) => s.sample_id),
      textposition: 'top center',
      textfont: { size: 8, color: '#cbd5e1', family: 'JetBrains Mono, monospace' },
      marker: {
        size: 6,
        color: palette[idx % palette.length],
        line: { color: '#ffffff', width: 1 },
        opacity: 0.9,
      },
      hovertemplate:
        '<b>%{text}</b><br>' +
        `<b>Group:</b> ${cond}<br>` +
        '<b>PC1:</b> %{x:.3f}<br>' +
        '<b>PC2:</b> %{y:.3f}<br>' +
        '<b>PC3:</b> %{z:.3f}<extra></extra>',
    };
  });

  // Top Gene Loadings on PC1 & PC2 (if available)
  if (showLoadings && !is3D && data.top_loadings_pc1 && data.top_loadings_pc1.length > 0) {
    const maxSamplePC1 = Math.max(...data.samples.map((s) => Math.abs(s.pc1)), 1);
    const maxSamplePC2 = Math.max(...data.samples.map((s) => Math.abs(s.pc2)), 1);
    const scaleFactor = Math.min(maxSamplePC1, maxSamplePC2) * 0.8;

    // Combine top driver genes from PC1 and PC2
    const pc1Map = new Map(data.top_loadings_pc1.map((g) => [g.gene_id, g.loading]));
    const pc2Map = new Map((data.top_loadings_pc2 || []).map((g) => [g.gene_id, g.loading]));
    const driverGenes = Array.from(new Set([...data.top_loadings_pc1.slice(0, 5).map(g => g.gene_id), ...(data.top_loadings_pc2 || []).slice(0, 5).map(g => g.gene_id)]));

    const loadingTrace = {
      x: driverGenes.map((g) => (pc1Map.get(g) || 0) * scaleFactor),
      y: driverGenes.map((g) => (pc2Map.get(g) || 0) * scaleFactor),
      mode: 'markers+text',
      type: 'scatter',
      name: 'Top Driver Loadings',
      text: driverGenes,
      textposition: 'bottom center',
      textfont: { size: 9, color: '#facc15', family: 'JetBrains Mono, monospace' },
      marker: {
        symbol: 'diamond',
        size: 7,
        color: '#facc15',
        line: { color: '#ca8a04', width: 1 },
      },
      hovertemplate:
        '<b>Driver Gene:</b> %{text}<br>' +
        '<b>PC1 Loading:</b> %{customdata[0]:.4f}<br>' +
        '<b>PC2 Loading:</b> %{customdata[1]:.4f}<extra></extra>',
      customdata: driverGenes.map((g) => [pc1Map.get(g) || 0, pc2Map.get(g) || 0]),
    };
    traces2D.push(loadingTrace);
  }

  const layout2D = {
    title: {
      text: `PCA (PC1 vs PC2) — Log2-CPM Normalized`,
      font: { color: '#f1f5f9', size: 13, family: 'Inter, sans-serif' },
    },
    xaxis: {
      title: `PC1 (${pc1Var}% Var)`,
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
      automargin: true,
    },
    yaxis: {
      title: `PC2 (${pc2Var}% Var)`,
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
      automargin: true,
    },
    hovermode: 'closest',
  };

  const layout3D = {
    title: {
      text: `3D PCA Space — Log2-CPM Normalized`,
      font: { color: '#f1f5f9', size: 13, family: 'Inter, sans-serif' },
    },
    scene: {
      xaxis: { title: `PC1 (${pc1Var}%)`, gridcolor: 'rgba(51, 65, 85, 0.5)' },
      yaxis: { title: `PC2 (${pc2Var}%)`, gridcolor: 'rgba(51, 65, 85, 0.5)' },
      zaxis: { title: `PC3 (${pc3Var}%)`, gridcolor: 'rgba(51, 65, 85, 0.5)' },
      bgcolor: 'rgba(11, 15, 25, 0.8)',
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>
            2D Variance: <strong className="text-cyan-400">{(Number(pc1Var) + Number(pc2Var)).toFixed(1)}%</strong>
          </span>
          {is3D && (
            <span>
              • 3D Variance: <strong className="text-purple-400">{(Number(pc1Var) + Number(pc2Var) + Number(pc3Var)).toFixed(1)}%</strong>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!is3D && data.top_loadings_pc1 && data.top_loadings_pc1.length > 0 && (
            <button
              onClick={() => setShowLoadings(!showLoadings)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors min-h-[34px] cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{showLoadings ? 'Hide Drivers' : 'Show Drivers'}</span>
            </button>
          )}
          <button
            onClick={() => setIs3D(!is3D)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors min-h-[34px] cursor-pointer"
          >
            {is3D ? <Layers className="w-3 h-3 text-cyan-400" /> : <Box className="w-3 h-3 text-purple-400" />}
            <span>{is3D ? '2D View' : '3D View'}</span>
          </button>
        </div>
      </div>

      <PlotWrapper
        data={is3D ? traces3D : traces2D}
        layout={is3D ? layout3D : layout2D}
        title={is3D ? '3D PCA Decomposition' : '2D PCA Projection'}
        filename={is3D ? 'transcriptox_pca_3d' : 'transcriptox_pca_2d'}
      />
    </div>
  );
};
