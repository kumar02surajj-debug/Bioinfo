import React from 'react';
import type { PathwayItem } from '../types';
import { PlotWrapper } from './PlotWrapper';

interface EnrichmentDotPlotProps {
  data: PathwayItem[];
  topN?: number;
}

export const EnrichmentDotPlot: React.FC<EnrichmentDotPlotProps> = ({
  data,
  topN = 15,
}) => {
  const topItems = data.slice(0, topN).reverse(); // Reverse for bottom-to-top display

  // Truncate long term names for clean display
  const cleanTerms = topItems.map((d) => {
    const t = d.term.split(' (GO:')[0];
    return t.length > 45 ? `${t.slice(0, 42)}...` : t;
  });

  const negLogFdr = topItems.map((d) => -Math.log10(Math.max(1e-50, d.adj_p_value)));
  const counts = topItems.map((d) => d.gene_count);
  const maxCount = Math.max(...counts, 1);
  const sizes = counts.map((c) => Math.max(10, Math.min(28, (c / maxCount) * 24 + 8)));

  const trace = {
    x: topItems.map((d) => d.gene_ratio),
    y: cleanTerms,
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: sizes,
      color: negLogFdr,
      colorscale: [
        [0, '#0284c7'],
        [0.5, '#38bdf8'],
        [0.75, '#fb7185'],
        [1, '#e11d48'],
      ],
      colorbar: {
        title: '-log10(FDR)',
        tickfont: { color: '#94a3b8', size: 10, family: 'JetBrains Mono, monospace' },
        titlefont: { color: '#cbd5e1', size: 11, family: 'Inter, sans-serif' },
      },
      line: { color: '#ffffff', width: 1 },
      opacity: 0.9,
    },
    customdata: topItems.map((d) => [
      d.term,
      d.overlap,
      (d.gene_ratio * 100).toFixed(1) + '%',
      d.adj_p_value < 0.0001 ? d.adj_p_value.toExponential(3) : d.adj_p_value.toFixed(4),
      d.genes.slice(0, 8).join(', ') + (d.genes.length > 8 ? '...' : ''),
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b><br>' +
      'Overlap: %{customdata[1]} (Gene Ratio: %{customdata[2]})<br>' +
      'FDR: %{customdata[3]}<br>' +
      'Genes: %{customdata[4]}<extra></extra>',
  };

  const layout = {
    title: {
      text: `Pathway Enrichment Dot Plot (Top ${topItems.length} Terms)`,
      font: { color: '#f1f5f9', size: 14, family: 'Inter, sans-serif' },
    },
    xaxis: {
      title: 'Gene Ratio (Overlapping Genes / Input Genes)',
      tickformat: '.1%',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 11, color: '#cbd5e1', family: 'Inter, sans-serif' },
    },
    margin: { l: 240, r: 40, t: 45, b: 60 },
  };

  return (
    <PlotWrapper
      data={[trace]}
      layout={layout}
      title={`Enrichment Dot Plot (Top ${topItems.length} Terms)`}
      filename="transcriptox_enrichment_dotplot"
      style={{ minHeight: '480px' }}
    />
  );
};
