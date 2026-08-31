import React from 'react';
import type { LibrarySizeItem } from '../types';
import { PlotWrapper } from './PlotWrapper';

interface LibrarySizeChartProps {
  data: LibrarySizeItem[];
}

export const LibrarySizeChart: React.FC<LibrarySizeChartProps> = ({ data }) => {
  // Group by condition for distinct colors
  const conditions = Array.from(new Set(data.map((d) => d.condition)));
  const palette = ['#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#fb7185', '#2dd4bf'];

  const traces = conditions.map((cond, idx) => {
    const subset = data.filter((d) => d.condition === cond);
    return {
      x: subset.map((d) => d.sample_id),
      y: subset.map((d) => d.library_size),
      type: 'bar',
      name: `${cond} (n=${subset.length})`,
      marker: {
        color: palette[idx % palette.length],
        line: { color: 'rgba(255,255,255,0.25)', width: 1 },
      },
      text: subset.map((d) => `${(d.library_size / 1e6).toFixed(2)}M reads`),
      textposition: 'auto',
      hoverinfo: 'x+y+name',
    };
  });

  const layout = {
    title: {
      text: 'Total Sequencing Reads (Library Size per Sample)',
      font: { color: '#f1f5f9', size: 14, family: 'Inter, sans-serif' },
    },
    barmode: 'group',
    xaxis: {
      title: 'Sample Identifier',
      tickangle: -45,
      tickfont: { color: '#cbd5e1', size: 10, family: 'JetBrains Mono, monospace' },
    },
    yaxis: {
      title: 'Total Raw Read Counts',
      zeroline: true,
      zerolinecolor: 'rgba(100, 116, 139, 0.4)',
    },
  };

  return (
    <PlotWrapper
      data={traces}
      layout={layout}
      title="Sequencing Library Sizes"
      filename="transcriptox_qc_library_sizes"
    />
  );
};
