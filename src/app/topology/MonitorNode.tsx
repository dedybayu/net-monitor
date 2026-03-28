import React from 'react';
import { Handle, Position } from 'reactflow';

export const MonitorNode = ({ data }: any) => {
  const isOnline = data.status === 'online';

  return (
    <div className={`card w-52 bg-base-100 shadow-xl border border-base-300 transition-all ${isOnline ? 'hover:border-success/50' : 'hover:border-error/50'}`}>
      <div className="card-body p-4 gap-2">
        {/* Header Status */}
        <div className="flex justify-between items-center">
          <div className={`badge ${data.method === 'ICMP' ? 'badge-info' : 'badge-secondary'} badge-xs font-bold scale-90`}>
            {data.method}
          </div>
          <div className={`badge ${isOnline ? 'badge-success' : 'badge-error'} badge-xs gap-1 font-black px-2 py-2`}>
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${isOnline ? 'animate-pulse' : ''}`}></span>
            {data.status.toUpperCase()}
          </div>
        </div>

        {/* Device Info */}
        <div className="mt-1">
          <h3 className="text-sm font-black truncate leading-tight">{data.label}</h3>
          <p className="text-[9px] font-mono opacity-50 truncate">{data.target}</p>
        </div>

        {/* Latency Display (Identik Dashboard) */}
        <div className="bg-base-200 rounded-xl p-2 flex items-center justify-between border border-base-300 shadow-inner">
          <div className="flex flex-col">
            <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">Latency</span>
            <span className="text-sm font-black font-mono text-primary leading-none">{data.latency}</span>
          </div>
          <span className="badge badge-outline badge-xs opacity-40 uppercase font-bold text-[7px]">{data.method === 'ICMP' ? 'Net' : 'Svc'}</span>
        </div>
      </div>

      {/* Handles untuk Koneksi */}
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary border-2 border-base-100" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary border-2 border-base-100" />
    </div>
  );
};