import React from 'react';

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'loading' | 'active' | 'completed' | 'pending';
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
          defaultText: status === 'connected' ? 'Backend Connected' : 'Completed',
        };
      case 'disconnected':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          defaultText: 'Disconnected',
        };
      case 'loading':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400 animate-ping',
          defaultText: 'Connecting...',
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
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} shadow-sm backdrop-blur-xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{text || config.defaultText}</span>
    </span>
  );
};
