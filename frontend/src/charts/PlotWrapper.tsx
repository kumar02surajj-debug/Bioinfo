import React, { useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Download, Maximize2, Minimize2, Copy, Check, Sparkles } from 'lucide-react';

interface PlotWrapperProps {
  data: any[];
  layout?: Record<string, any>;
  config?: Record<string, any>;
  style?: React.CSSProperties;
  className?: string;
  useResizeHandler?: boolean;
  title?: string;
  filename?: string;
  enableToolbar?: boolean;
}

export const PlotWrapper: React.FC<PlotWrapperProps> = ({
  data,
  layout = {},
  config = {},
  style = { width: '100%', height: '100%', minHeight: '380px' },
  className = '',
  useResizeHandler = true,
  title,
  filename = 'transcriptox_visualization',
  enableToolbar = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const plotRef = useRef<any>(null);

  // Modern Dark Bioinformatics theme defaults
  const defaultLayout = {
    autosize: true,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(11, 15, 25, 0.7)',
    font: {
      family: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#94a3b8',
      size: 11,
    },
    margin: { l: 60, r: 35, t: 45, b: 60, pad: 4 },
    xaxis: {
      gridcolor: 'rgba(51, 65, 85, 0.4)',
      zerolinecolor: 'rgba(71, 85, 105, 0.6)',
      tickfont: { color: '#94a3b8', size: 10, family: 'JetBrains Mono, monospace' },
      titlefont: { color: '#e2e8f0', size: 12, family: 'Inter, sans-serif' },
    },
    yaxis: {
      gridcolor: 'rgba(51, 65, 85, 0.4)',
      zerolinecolor: 'rgba(71, 85, 105, 0.6)',
      tickfont: { color: '#94a3b8', size: 10, family: 'JetBrains Mono, monospace' },
      titlefont: { color: '#e2e8f0', size: 12, family: 'Inter, sans-serif' },
    },
    hoverlabel: {
      bgcolor: '#0f172a',
      bordercolor: '#38bdf8',
      font: { color: '#f8fafc', family: 'Inter, sans-serif', size: 11 },
    },
    legend: {
      font: { color: '#cbd5e1', size: 11 },
      bgcolor: 'rgba(15, 23, 42, 0.8)',
      bordercolor: 'rgba(51, 65, 85, 0.6)',
      borderwidth: 1,
    },
    ...layout,
  };

  const defaultConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: filename,
      height: 900,
      width: 1400,
      scale: 3, // 300 DPI high-res export
    },
    ...config,
  };

  const handleDownloadSVG = () => {
    try {
      const Plotly = (window as any).Plotly;
      if (Plotly && plotRef.current && plotRef.current.el) {
        Plotly.downloadImage(plotRef.current.el, {
          format: 'svg',
          width: 1400,
          height: 900,
          filename: `${filename}_vector`,
        });
      }
    } catch (e) {
      console.error('Failed to export SVG:', e);
    }
  };

  const handleDownloadPNG = () => {
    try {
      const Plotly = (window as any).Plotly;
      if (Plotly && plotRef.current && plotRef.current.el) {
        Plotly.downloadImage(plotRef.current.el, {
          format: 'png',
          width: 1600,
          height: 1000,
          scale: 3,
          filename: `${filename}_publication_300dpi`,
        });
      }
    } catch (e) {
      console.error('Failed to export PNG:', e);
    }
  };

  const handleCopyJSON = () => {
    try {
      const plotData = { data, layout: defaultLayout };
      navigator.clipboard.writeText(JSON.stringify(plotData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy plot data:', e);
    }
  };

  return (
    <>
      <div className={`relative group flex flex-col w-full h-full min-h-[380px] rounded-2xl bg-slate-900/40 border border-slate-800/80 p-2 sm:p-4 backdrop-blur-md transition-all duration-200 hover:border-slate-700/80 ${className}`}>
        {/* Top Mini Toolbar */}
        {enableToolbar && (
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-800/60 px-1 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold truncate">
              {title && <span className="truncate">{title}</span>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleDownloadSVG}
                title="Download Publication Vector (SVG)"
                className="px-2 py-1 rounded-lg bg-slate-800/70 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span>SVG</span>
              </button>
              <button
                onClick={handleDownloadPNG}
                title="Download 300-DPI High-Res PNG"
                className="px-2 py-1 rounded-lg bg-slate-800/70 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
              >
                <Download className="w-3 h-3 text-blue-400" />
                <span>PNG (300 DPI)</span>
              </button>
              <button
                onClick={handleCopyJSON}
                title="Copy Plot JSON Specification"
                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                title="Expand Fullscreen View"
                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-all"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Plotly Canvas */}
        <div className="flex-1 w-full h-full min-h-[340px]">
          <Plot
            ref={plotRef}
            data={data}
            layout={defaultLayout}
            config={defaultConfig}
            style={style}
            useResizeHandler={useResizeHandler}
          />
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-bold text-slate-100">{title || 'Expanded Chart View'}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Fullscreen Canvas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSVG}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export SVG</span>
              </button>
              <button
                onClick={handleDownloadPNG}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export 300-DPI PNG</span>
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-0">
            <Plot
              data={data}
              layout={{
                ...defaultLayout,
                autosize: true,
                margin: { l: 70, r: 40, t: 50, b: 70, pad: 4 },
              }}
              config={defaultConfig}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler={true}
            />
          </div>
        </div>
      )}
    </>
  );
};
