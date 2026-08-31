import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

interface AlertBannerProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string | React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-sky-950/40 border-sky-500/30 text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      titleColor: 'text-sky-300',
    },
    success: {
      bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      titleColor: 'text-emerald-300',
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      titleColor: 'text-amber-300',
    },
    error: {
      bg: 'bg-rose-950/40 border-rose-500/30 text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      titleColor: 'text-rose-300',
    },
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${styles.bg} backdrop-blur-md transition-all ${className}`}
    >
      {styles.icon}
      <div className="flex-1 text-sm">
        {title && <h4 className={`font-semibold mb-0.5 ${styles.titleColor}`}>{title}</h4>}
        <div className="leading-relaxed opacity-90">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
