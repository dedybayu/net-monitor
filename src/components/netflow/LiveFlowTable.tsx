'use client';

import { useRef, useEffect } from 'react';
import type { ClassifiedFlow } from '@/types/traffic';
import { formatBytes, formatDuration, APP_COLORS } from '@/types/traffic';

interface LiveFlowTableProps {
  flows: ClassifiedFlow[];
  useBits: boolean;
}

export default function LiveFlowTable({ flows, useBits }: LiveFlowTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new flows arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [flows.length]);

  return (
    <div className="card bg-base-100 shadow-md border border-base-200/50 p-5" id="live-flow-table">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-base-content">
            Live Traffic Flows
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            Recent flow records — newest first
          </p>
        </div>
        <div className="badge badge-ghost badge-sm font-mono">
          {flows.length} flows
        </div>
      </div>

      <div ref={containerRef} className="overflow-auto max-h-[400px] rounded-lg">
        <table className="table table-xs table-pin-rows">
          <thead>
            <tr className="bg-base-300/80">
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Time</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Source IP</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Destination</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Port</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Proto</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Duration</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Application</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider text-right">Bytes</th>
            </tr>
          </thead>
          <tbody>
            {flows.length > 0 ? (
              flows.map((flow, idx) => {
                const time = new Date(flow.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const appColor = APP_COLORS[flow.application] || APP_COLORS['Other'];

                return (
                  <tr
                    key={flow.id}
                    className={`hover:bg-base-content/5 transition-colors ${idx === 0 ? 'flow-row-enter' : ''}`}
                  >
                    <td className="font-mono text-[11px] text-base-content/60">
                      {time}
                    </td>
                    <td className="font-mono text-[11px]">
                      {flow.srcIp}
                    </td>
                    <td className="font-mono text-[11px] max-w-[160px] truncate" title={flow.hostname}>
                      {flow.hostname !== flow.dstIp ? flow.hostname : flow.dstIp}
                    </td>
                    <td className="font-mono text-[11px] text-base-content/60">
                      {flow.dstPort}
                    </td>
                    <td>
                      <span className="badge badge-ghost badge-xs font-mono">
                        {flow.protocol}
                      </span>
                    </td>
                    <td className="font-mono text-[11px] text-base-content/60">
                      {formatDuration(flow.duration)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: appColor }}
                        />
                        <span className="text-xs font-medium" style={{ color: appColor }}>
                          {flow.application}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-[11px] text-right">
                      {formatBytes(flow.bytes, useBits)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-12 text-base-content/30">
                  <div className="loading loading-dots loading-md mb-2"></div>
                  <p className="text-sm">Waiting for flow data...</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
