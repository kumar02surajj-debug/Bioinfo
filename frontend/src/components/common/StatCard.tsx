import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'sky' | 'emerald' | 'amber' | 'purple' | 'rose' | 'indigo';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'sky',
  badge,
}) => {
  const colorMap = {
    sky: {
      bg: 'from-sky-500/10 to-transparent border-sky-500/20 text-sky-400',
      iconBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
    amber: {
      bg: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    },
    purple: {
      bg: 'from-purple-500/10 to-transparent border-purple-500/20 text-purple-400',
      iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    },
    rose: {
      bg: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-400',
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    },
    indigo: {
      bg: 'from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-400',
      iconBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    },
  }[color];

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-b ${colorMap.bg} border backdrop-blur-md shadow-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.01]`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">{title}</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1 sm:mt-1.5 tracking-tight break-words">{value}</h3>
          {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-snug break-words">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2 sm:p-2.5 rounded-xl border ${colorMap.iconBg} shadow-inner shrink-0`}>
            <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
          </div>
        )}
      </div>
      {badge && (
        <div className="mt-2.5 sm:mt-3">
          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border ${colorMap.badgeBg}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
