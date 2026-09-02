import React from 'react';

export type StatusBadgeType =
  | 'connected'
  | 'disconnected'
  | 'loading'
  | 'connecting'
  | 'retrying'
  | 'offline'
  | 'active'
  | 'completed'
  | 'pending';

interface StatusBadgeProps {
  status: StatusBadgeType;
  text?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, size = 'md' }) => {
  const getStyles = () => {
    switch (status) {
      case 'connected':
      case 'completed':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          defaultText: status === 'connected' ? 'Backend Connected ✓' : 'Completed',
        };
      case 'disconnected':
      case 'offline':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          defaultText: 'Backend Offline',
        };
      case 'connecting':
      case 'loading':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          dot: 'bg-cyan-400 animate-pulse',
          defaultText: 'Connecting to backend...',
        };
      case 'retrying':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400 animate-ping',
          defaultText: 'Retrying connection...',
        };
      case 'active':
        return {
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
          dot: 'bg-sky-400 animate-pulse',
          defaultText: 'In Progress',
        };
      case 'pending':
      default:
        return {
          bg: 'bg-slate-700/30 border-slate-600/30 text-slate-400',
          dot: 'bg-slate-500',
          defaultText: 'Pending',
        };
    }
  };

  const config = getStyles();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} shadow-sm backdrop-blur-xs transition-colors`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className="truncate">{text || config.defaultText}</span>
    </span>
  );
};
