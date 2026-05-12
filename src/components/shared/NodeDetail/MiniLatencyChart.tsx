'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const latencyFetcher = (url: string) => fetch(url).then(r => r.json());

export function MiniLatencyChart({
  workspaceId,
  nodeIp,
  nodePort,
  nodeMethod,
  type = 'node',
}: {
  workspaceId: number;
  nodeIp: string;
  nodePort: number;
  nodeMethod: string;
  type?: 'node' | 'service';
}) {
  const [range, setRange] = useState('15m');
  const host = nodeMethod === 'TCP' && nodePort > 0 ? `${nodeIp}:${nodePort}` : nodeIp;

  const refreshInterval = range === '15m' || range === '30m' ? 3000 : 60000;

  const { data: rawData, isLoading } = useSWR(
    `/api/monitoring/latency?workspace_id=${workspaceId}&host=${encodeURIComponent(host)}&range=${range}&type=${type}`,
    latencyFetcher,
    { refreshInterval }
  );

  const chartData = useMemo(() => {
    if (!rawData || rawData.error) return [];
    return rawData.map((item: Record<string, unknown>) => {
      const date = new Date(item.time as string);
      let formattedTime = '';
      
      if (range === '15m' || range === '30m' || range === '1h') {
        formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } else {
        formattedTime = date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      return {
        ...item,
        formattedTime,
        value: item[host] ?? null,
      };
    });
  }, [rawData, host, range]);

  const blueColor = '#3b82f6'; 

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MiniTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0].value != null) {
      return (
        <div className="bg-base-100/95 border border-base-300 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl text-[10px]">
          <div className="flex flex-col">
            <span className="font-black text-primary">{payload[0].value.toFixed(2)} ms</span>
            <span className="text-base-content/40 mt-0.5">{payload[0].payload.formattedTime}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-base-200/50 rounded-2xl p-5 border border-base-300 shadow-inner">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            Latency Trend
          </span>
          <span className="text-[9px] font-mono opacity-30 mt-0.5">{host}</span>
        </div>

        <div className="flex bg-base-300/50 p-0.5 rounded-lg border border-base-300 overflow-hidden">
          {['15m', '1h', '1d', '3d', '7d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 text-[9px] font-black transition-all ${
                range === r 
                  ? 'bg-blue-500 text-white rounded-md shadow-sm' 
                  : 'text-base-content/40 hover:text-base-content/70'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[180px] w-full relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200/20 backdrop-blur-[1px] z-10 rounded-xl">
            <span className="loading loading-spinner loading-xs text-blue-500"></span>
          </div>
        )}

        {(!chartData || chartData.length === 0) && !isLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-base-content/30 border-2 border-dashed border-base-300 rounded-xl bg-base-300/20">
            <span className="text-[10px] font-bold uppercase tracking-widest">No data available</span>
            <span className="text-[8px] mt-1 opacity-60">Try a larger range or check worker status</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={blueColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={blueColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} vertical={false} />
              <XAxis
                dataKey="formattedTime"
                stroke="currentColor"
                opacity={0.4}
                fontSize={8}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
                tickMargin={8}
              />
              <YAxis
                stroke="currentColor"
                opacity={0.4}
                fontSize={8}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}ms`}
                width={45}
                tickMargin={5}
              />
              <Tooltip content={<MiniTooltip />} cursor={{ stroke: blueColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area
                type="monotone"
                dataKey="value"
                name={host}
                stroke={blueColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#miniGrad)"
                activeDot={{ r: 3, strokeWidth: 0, fill: blueColor }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
