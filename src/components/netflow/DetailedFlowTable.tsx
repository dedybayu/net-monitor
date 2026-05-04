'use client';

import { useRef, useEffect } from 'react';
import type { ClassifiedFlow } from '@/types/traffic';
import { formatBytes, formatDuration, formatTcpFlags, APP_COLORS } from '@/types/traffic';

interface DetailedFlowTableProps {
  flows: ClassifiedFlow[];
  useBits: boolean;
}

export default function DetailedFlowTable({ flows, useBits }: DetailedFlowTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new flows arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [flows.length]);

  return (
    <div className="card bg-base-100 shadow-md border border-base-200/50 p-5" id="detailed-flow-table">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-base-content">
            Detailed Flow Analysis
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            Full NetFlow v9 attributes for deep inspection
          </p>
        </div>
        <div className="flex gap-2">
          <div className="badge badge-primary badge-sm font-mono">
            Full Inspection
          </div>
        </div>
      </div>

      <div ref={containerRef} className="overflow-auto max-h-[600px] rounded-lg">
        <table className="table table-xs table-pin-rows">
          <thead>
            <tr className="bg-base-300/80">
              <th className="text-[10px] uppercase tracking-wider">Time</th>
              <th className="text-[10px] uppercase tracking-wider">Src IP</th>
              <th className="text-[10px] uppercase tracking-wider">Dst IP</th>
              <th className="text-[10px] uppercase tracking-wider text-right">Src Port</th>
              <th className="text-[10px] uppercase tracking-wider text-left">Dst Port</th>
              <th className="text-[10px] uppercase tracking-wider text-center">Proto</th>
              <th className="text-[10px] uppercase tracking-wider text-center">Flags</th>
              <th className="text-[10px] uppercase tracking-wider text-center">Duration</th>
              <th className="text-[10px] uppercase tracking-wider text-center">I/O</th>
              <th className="text-[10px] uppercase tracking-wider text-center">TOS</th>
              <th className="text-[10px] uppercase tracking-wider">Application</th>
              <th className="text-[10px] uppercase tracking-wider text-right">Bytes</th>
              <th className="text-[10px] uppercase tracking-wider text-right">Packets</th>
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
                    className="hover:bg-base-content/5 transition-colors border-b border-base-200/50"
                  >
                    <td className="font-mono text-[10px] text-base-content/50">
                      {time}
                    </td>
                    <td className="font-mono text-[11px] font-medium">
                      {flow.srcIp}
                    </td>
                    <td className="font-mono text-[11px] font-medium">
                      {flow.dstIp}
                    </td>
                    <td className="font-mono text-[10px] text-right text-base-content/50">
                      {flow.srcPort}
                    </td>
                    <td className="font-mono text-[10px] text-left">
                      {flow.dstPort}
                    </td>
                    <td className="text-center">
                      <span className="badge badge-outline badge-xs font-mono opacity-70">
                        {flow.protocol}
                      </span>
                    </td>
                    <td className="text-center font-mono text-[10px]">
                      <span className={`px-1 rounded ${flow.tcpFlags > 0 ? 'bg-warning/10 text-warning' : 'text-base-content/20'}`}>
                        {formatTcpFlags(flow.tcpFlags)}
                      </span>
                    </td>
                    <td className="font-mono text-[10px] text-center text-base-content/60">
                      {formatDuration(flow.duration)}
                    </td>
                    <td className="font-mono text-[10px] text-center">
                      <span className="text-success">{flow.inputInt}</span>
                      <span className="mx-0.5 text-base-content/20">|</span>
                      <span className="text-error">{flow.outputInt}</span>
                    </td>
                    <td className="font-mono text-[10px] text-center text-base-content/40">
                      {flow.tos}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: appColor }}
                        />
                        <span className="text-[11px] font-semibold" style={{ color: appColor }}>
                          {flow.application}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-[11px] text-right font-bold">
                      {formatBytes(flow.bytes, useBits)}
                    </td>
                    <td className="font-mono text-[10px] text-right text-base-content/50">
                      {flow.packets}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={13} className="text-center py-12 text-base-content/30">
                  <div className="loading loading-dots loading-md mb-2"></div>
                  <p className="text-sm">Waiting for detailed flow records...</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
