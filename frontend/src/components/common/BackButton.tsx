import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';

interface BackButtonProps {
  label?: string;
  className?: string;
  onClick?: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  className = '',
  onClick,
}) => {
  const { goBack } = useAnalysis();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      goBack();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Go back"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 text-xs font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 cursor-pointer ${className}`}
    >
      <ChevronLeft className="w-4 h-4 text-cyan-400 shrink-0" />
      <span>{label}</span>
    </button>
  );
};
