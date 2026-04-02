import React, { memo } from 'react'; // 1. Import memo
import { Handle, Position, NodeProps } from 'reactflow';

export interface MonitorNodeData {
  label: string;
  target: string;
  method: 'ICMP' | 'TCP';
  status: 'online' | 'offline';
  latency: string;
}

// 2. Gunakan memo untuk membungkus komponen
export const MonitorNode = memo(({ data }: NodeProps<MonitorNodeData>) => {
  const isOnline = data.status === 'online';

  return (
    <div className={`
      card w-52 shadow-xl border transition-all duration-300
      ${isOnline 
        ? 'bg-success/10 border-success/30 hover:border-success/50' 
        : 'bg-error/10 border-error/30 hover:border-error/60'
      }
      /* 3. Tambahkan hint hardware acceleration */
      transform-gpu
    `}>
      
      <div className="card-body p-4 gap-2">
        <div className="flex justify-between items-center">
          <div className={`badge ${data.method === 'ICMP' ? 'badge-info' : 'badge-secondary'} badge-xs font-bold scale-90`}>
            {data.method}
          </div>
          <div className={`badge ${isOnline ? 'badge-success' : 'badge-error text-error-content'} badge-xs gap-1 font-black px-2 py-2`}>
            {/* 4. Gunakan animasi hanya jika diperlukan (mengurangi kalkulasi frame GPU) */}
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${isOnline ? 'animate-pulse' : ''}`}></span>
            {data.status.toUpperCase()}
          </div>
        </div>

        <div className="mt-1">
          <h3 className={`text-sm font-black truncate leading-tight ${!isOnline && 'text-error'}`}>
            {data.label}
          </h3>
          <p className="text-[9px] font-mono opacity-50 truncate">{data.target}</p>
        </div>

        <div className={`
          rounded-xl p-2 flex items-center justify-between border shadow-inner transition-colors
          ${isOnline ? 'bg-success/20 border-success/20' : 'bg-error/20 border-error/20'}
        `}>
          <div className="flex flex-col">
            <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">Latency</span>
            <span className={`text-sm font-black font-mono leading-none ${isOnline ? 'text-primary' : 'text-error'}`}>
              {data.latency}
            </span>
          </div>
          <span className="badge badge-outline badge-xs opacity-40 uppercase font-bold text-[7px]">
            {data.method === 'ICMP' ? 'Net' : 'Svc'}
          </span>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary border-2 border-base-100" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary border-2 border-base-100" />
    </div>
  );
});

// 5. Tambahkan displayName untuk mempermudah debugging React DevTools
MonitorNode.displayName = 'MonitorNode';