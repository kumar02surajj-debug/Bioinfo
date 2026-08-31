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
    <div className={`p-5 rounded-2xl bg-gradient-to-b ${colorMap.bg} border backdrop-blur-md shadow-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.01]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1.5 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${colorMap.iconBg} shadow-inner`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {badge && (
        <div className="mt-3">
          <span className={`inline-block px-2 py-0.5 text-2xs font-medium rounded-md border ${colorMap.badgeBg}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
