import React from 'react';
import type { PathwayItem } from '../types';
import { PlotWrapper } from './PlotWrapper';

interface EnrichmentBarChartProps {
  data: PathwayItem[];
  topN?: number;
}

export const EnrichmentBarChart: React.FC<EnrichmentBarChartProps> = ({
  data,
  topN = 15,
}) => {
  const topItems = data.slice(0, topN).reverse();

  const cleanTerms = topItems.map((d) => {
    const t = d.term.split(' (GO:')[0];
    return t.length > 35 ? `${t.slice(0, 32)}...` : t;
  });

  const negLogFdr = topItems.map((d) => -Math.log10(Math.max(1e-50, d.adj_p_value)));

  const trace = {
    x: negLogFdr,
    y: cleanTerms,
    type: 'bar',
    orientation: 'h',
    marker: {
      color: negLogFdr,
      colorscale: [
        [0, '#0284c7'],
        [0.5, '#38bdf8'],
        [0.75, '#fb7185'],
        [1, '#e11d48'],
      ],
      line: { color: 'rgba(255,255,255,0.2)', width: 1 },
    },
    customdata: topItems.map((d) => [
      d.term,
      d.overlap,
      d.adj_p_value < 0.0001 ? d.adj_p_value.toExponential(3) : d.adj_p_value.toFixed(4),
      d.genes.slice(0, 8).join(', ') + (d.genes.length > 8 ? '...' : ''),
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b><br>' +
      '-log10(FDR): %{x:.2f}<br>' +
      'Overlap: %{customdata[1]}<br>' +
      'FDR: %{customdata[2]}<br>' +
      'Genes: %{customdata[3]}<extra></extra>',
  };

  const layout = {
    title: {
      text: `Pathway Significance Bar Chart (Top ${topItems.length} Terms)`,
      font: { color: '#f1f5f9', size: 13, family: 'Inter, sans-serif' },
    },
    xaxis: {
      title: '-log10 False Discovery Rate (-log10 FDR)',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
      automargin: true,
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 10, color: '#cbd5e1', family: 'Inter, sans-serif' },
    },
    margin: { l: 140, r: 35, t: 45, b: 55 },
  };

  return (
    <PlotWrapper
      data={[trace]}
      layout={layout}
      title={`Pathway Significance Bar Chart (Top ${topItems.length})`}
      filename="transcriptox_enrichment_barchart"
      style={{ minHeight: '440px' }}
    />
  );
};
