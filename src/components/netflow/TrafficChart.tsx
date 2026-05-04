'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BandwidthDataPoint, AppTrafficSummary } from '@/types/traffic';
import { formatBytes, APP_COLORS } from '@/types/traffic';

interface TrafficChartProps {
  data: BandwidthDataPoint[];
  appSummary: AppTrafficSummary[];
  useBits: boolean;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label, useBits }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  useBits?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="card bg-base-100/90 shadow-md border border-base-200/50 p-3 min-w-[180px]">
      <p className="text-xs text-base-content/60 mb-2 font-semibold">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs py-0.5">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-base-content/80">{entry.name}</span>
            </div>
            <span className="font-mono font-semibold text-base-content">
              {formatBytes(entry.value, useBits)}
            </span>
          </div>
        ))}
    </div>
  );
}

export default function TrafficChart({ data, appSummary, useBits }: TrafficChartProps) {
  // Get top 6 apps for stacked area
  const topApps = appSummary.slice(0, 6).map((a) => a.application);

  return (
    <div className="card bg-base-100 shadow-md border border-base-200/50 p-5" id="traffic-chart">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-base-content">
            Bandwidth Over Time
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            Real-time bandwidth per application
          </p>
        </div>
        <div className="badge badge-ghost badge-sm font-mono">
          {data.length} data points
        </div>
      </div>

      <div className="w-full h-[450px]">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                {topApps.map((app) => (
                  <linearGradient key={app} id={`grad-${app.replace(/[^a-zA-Z]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={APP_COLORS[app] || APP_COLORS['Other']} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={APP_COLORS[app] || APP_COLORS['Other']} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 250 / 0.2)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatBytes(v, useBits)}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip useBits={useBits} />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
                iconSize={8}
              />
              {topApps.map((app) => (
                <Area
                  key={app}
                  type="monotone"
                  dataKey={app}
                  stackId="1"
                  stroke={APP_COLORS[app] || APP_COLORS['Other']}
                  fill={`url(#grad-${app.replace(/[^a-zA-Z]/g, '')})`}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-base-content/30">
            <div className="text-center">
              <div className="loading loading-ring loading-lg mb-2"></div>
              <p className="text-sm">Waiting for traffic data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
