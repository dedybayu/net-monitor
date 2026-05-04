'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { AppTrafficSummary } from '@/types/traffic';
import { formatBytes, APP_COLORS } from '@/types/traffic';

interface AppBreakdownProps {
  data: AppTrafficSummary[];
  useBits: boolean;
}

function CustomTooltip({ active, payload, useBits }: {
  active?: boolean;
  payload?: Array<{ payload: AppTrafficSummary }>;
  useBits?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="card bg-base-100/90 shadow-md border border-base-200/50 p-3">
      <p className="text-sm font-bold" style={{ color: item.color }}>
        {item.application}
      </p>
      <p className="text-xs text-base-content/70 mt-1">
        {formatBytes(item.totalBytes, useBits)} · {item.flowCount} flows
      </p>
    </div>
  );
}

export default function AppBreakdown({ data, useBits }: AppBreakdownProps) {
  const totalBytes = data.reduce((sum, d) => sum + d.totalBytes, 0);

  // Separate "Other" from named apps, then take top 8 named apps
  const namedApps = data.filter((d) => d.application !== 'Other');
  const existingOther = data.filter((d) => d.application === 'Other');

  const top8 = namedApps.slice(0, 8);

  // Combine remaining named apps + any existing "Other" into one "Others" entry
  const restBytes = namedApps.slice(8).reduce((sum, d) => sum + d.totalBytes, 0)
    + existingOther.reduce((sum, d) => sum + d.totalBytes, 0);
  const restFlows = namedApps.slice(8).reduce((sum, d) => sum + d.flowCount, 0)
    + existingOther.reduce((sum, d) => sum + d.flowCount, 0);

  const chartData = restBytes > 0
    ? [
        ...top8,
        {
          application: 'Others',
          totalBytes: restBytes,
          totalPackets: 0,
          flowCount: restFlows,
          color: APP_COLORS['Other'],
        },
      ]
    : top8;

  return (
    <div className="card bg-base-100 shadow-md border border-base-200/50 p-5" id="app-breakdown">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-base-content">
          Application Breakdown
        </h2>
        <p className="text-xs text-base-content/50 mt-0.5">
          Traffic distribution by application
        </p>
      </div>

      {chartData.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Pie Chart */}
          <div className="w-full lg:w-1/2 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="totalBytes"
                  animationDuration={300}
                  stroke="none"
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.color}
                      opacity={0.85}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip useBits={useBits} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend list */}
          <div className="w-full lg:w-1/2 space-y-2">
            {chartData.map((item) => {
              const pct = totalBytes > 0
                ? ((item.totalBytes / totalBytes) * 100).toFixed(1)
                : '0';

              return (
                <div
                  key={item.application}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-300/30 hover:bg-base-300/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-base-content/90">
                      {item.application}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-base-content/60">
                      {formatBytes(item.totalBytes, useBits)}
                    </span>
                    <span className="text-xs font-bold min-w-[40px] text-right" style={{ color: item.color }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[220px] text-base-content/30">
          <div className="text-center">
            <div className="loading loading-ring loading-lg mb-2"></div>
            <p className="text-sm">Waiting for traffic data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
