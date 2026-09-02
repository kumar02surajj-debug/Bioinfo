import React, { useState } from 'react';
import type { ClusteringResponse } from '../types';
import { PlotWrapper } from './PlotWrapper';
import { Palette } from 'lucide-react';

interface ClusterHeatmapProps {
  data: ClusteringResponse;
  highlightGene?: string;
}

export const ClusterHeatmap: React.FC<ClusterHeatmapProps> = ({
  data,
  highlightGene,
}) => {
  const [colorScheme, setColorScheme] = useState<string>('RdBu_r');

  // Palette definitions
  const getColorscale = (scheme: string): [number, string][] | string => {
    switch (scheme) {
      case 'RdBu_r':
        return [
          [0.0, '#0284c7'], // Strong Down / Negative Z
          [0.25, '#38bdf8'],
          [0.5, '#0f172a'], // Mean / Zero Z
          [0.75, '#fb7185'],
          [1.0, '#e11d48'], // Strong Up / Positive Z
        ];
      case 'Viridis':
        return 'Viridis';
      case 'Magma':
        return 'Magma';
      case 'Plasma':
        return 'Plasma';
      case 'Coolwarm':
        return [
          [0.0, '#3b82f6'],
          [0.5, '#f8fafc'],
          [1.0, '#ef4444'],
        ];
      default:
        return [
          [0.0, '#0284c7'],
          [0.25, '#38bdf8'],
          [0.5, '#0f172a'],
          [0.75, '#fb7185'],
          [1.0, '#e11d48'],
        ];
    }
  };

  const trace = {
    z: data.z_scores,
    x: data.sample_ids,
    y: data.gene_ids,
    type: 'heatmap',
    colorscale: getColorscale(colorScheme),
    zmin: -2.5,
    zmax: 2.5,
    colorbar: {
      title: 'Z-Score',
      tickfont: { color: '#94a3b8', size: 9, family: 'JetBrains Mono, monospace' },
      titlefont: { color: '#cbd5e1', size: 10, family: 'Inter, sans-serif' },
    },
    hovertemplate:
      '<b>Gene:</b> %{y}<br>' +
      '<b>Sample:</b> %{x}<br>' +
      '<b>Z-Score:</b> %{z:.3f}<extra></extra>',
  };

  // Adjust plot height dynamically
  const dynamicHeight = Math.min(1000, Math.max(420, data.gene_ids.length * 18));

  const layout = {
    title: {
      text: `Hierarchical Clustered Heatmap (${data.gene_ids.length} Genes x ${data.sample_ids.length} Samples)`,
      font: { color: '#f1f5f9', size: 13, family: 'Inter, sans-serif' },
    },
    xaxis: {
      tickangle: -45,
      tickfont: { color: '#cbd5e1', size: 9, family: 'JetBrains Mono, monospace' },
      automargin: true,
    },
    yaxis: {
      autorange: 'reversed',
      automargin: true,
      tickfont: {
        color: (data.gene_ids.map((g) => (g === highlightGene ? '#38bdf8' : '#94a3b8')) as any),
        size: data.gene_ids.length > 60 ? 8 : 9,
        family: 'JetBrains Mono, monospace',
      },
    },
    margin: { l: 80, r: 40, t: 45, b: 70 },
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>
            Clustering: <strong className="text-purple-400">{data.linkage_method}</strong> linkage, <strong className="text-cyan-400">{data.distance_metric}</strong> distance
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium min-h-[34px]"
          >
            <option value="RdBu_r">Diverging (Blue-Slate-Red)</option>
            <option value="Coolwarm">Coolwarm (Blue-White-Red)</option>
            <option value="Viridis">Viridis (Sequential)</option>
            <option value="Magma">Magma (Sequential)</option>
            <option value="Plasma">Plasma (Sequential)</option>
          </select>
        </div>
      </div>

      <div style={{ height: `${dynamicHeight}px` }}>
        <PlotWrapper
          data={[trace]}
          layout={layout}
          title={`Clustered Heatmap (${data.gene_ids.length} Genes)`}
          filename="transcriptox_hierarchical_heatmap"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};
