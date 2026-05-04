'use client';

import { TrendingUp, Users, BarChart3, Layers } from 'lucide-react';
import { formatBps } from '@/types/traffic';

interface StatsCardsProps {
  totalBytesPerSecond: number;
  activeUsers: number;
  topApplication: string;
  totalFlows: number;
  useBits: boolean;
}

const cards = [
  {
    key: 'bandwidth',
    label: 'Bandwidth',
    icon: TrendingUp,
    colorClass: 'text-info',
    bgClass: 'bg-info/15',
  },
  {
    key: 'users',
    label: 'Active Users',
    icon: Users,
    colorClass: 'text-success',
    bgClass: 'bg-success/15',
  },
  {
    key: 'topApp',
    label: 'Top Application',
    icon: BarChart3,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/15',
  },
  {
    key: 'flows',
    label: 'Total Flows',
    icon: Layers,
    colorClass: 'text-secondary',
    bgClass: 'bg-secondary/15',
  },
];

export default function StatsCards({
  totalBytesPerSecond,
  activeUsers,
  topApplication,
  totalFlows,
  useBits,
}: StatsCardsProps) {
  const values: Record<string, string> = {
    bandwidth: formatBps(totalBytesPerSecond, useBits),
    users: activeUsers.toLocaleString(),
    topApp: topApplication || 'N/A',
    flows: totalFlows.toLocaleString(),
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="card bg-base-100 shadow-md border border-base-200/50 p-5"
            id={`stat-${card.key}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
                {card.label}
              </span>
              <div className={`p-2 rounded-lg ${card.bgClass}`}>
                <Icon className={`w-4 h-4 ${card.colorClass}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.colorClass} tracking-tight`}>
              {values[card.key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
