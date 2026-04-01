import { NodeDetailResponse, StatusApiResponse } from '../types';

interface NodeDetailModalProps {
  activeNodeData: { label: string; status: string; latency: string } | undefined;
  nodeDetail: NodeDetailResponse | undefined;
  isDetailLoading: boolean;
  serviceStatusData: StatusApiResponse | undefined;
  onClose: () => void;
}

export function NodeDetailModal({
  activeNodeData,
  nodeDetail,
  isDetailLoading,
  serviceStatusData,
  onClose,
}: NodeDetailModalProps) {
  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl border border-base-300 shadow-2xl bg-base-100 p-0 overflow-hidden">

        {/* Header */}
        <div className={`p-6 ${nodeDetail ? 'bg-base-200' : 'animate-pulse bg-base-300'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-black text-2xl uppercase tracking-tighter">
                  {nodeDetail?.node_label || activeNodeData?.label || 'Loading...'}
                </h3>
                <div
                  className={`badge ${
                    activeNodeData?.status === 'online' ? 'badge-success' : 'badge-error'
                  } badge-sm font-black`}
                >
                  {activeNodeData?.status?.toUpperCase()}
                </div>
              </div>
              <p className="text-xs opacity-60 font-mono mt-1">
                Target: {nodeDetail?.node_ip_address}
                {nodeDetail?.node_port !== 0 && `:${nodeDetail?.node_port}`}
              </p>
            </div>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-4 border-b border-base-300 bg-base-50">
          <p className="text-sm opacity-80 italic mb-6">
            {nodeDetail?.node_description || 'Tidak ada deskripsi tersedia untuk node ini.'}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200 rounded-2xl p-4 border border-base-300 shadow-inner flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Node Latency</span>
              <span
                className={`text-3xl font-black font-mono ${
                  activeNodeData?.status === 'online' ? 'text-primary' : 'text-error'
                }`}
              >
                {activeNodeData?.latency || '...'}
              </span>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 border border-base-300 shadow-inner flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Check Method</span>
              <span className="text-xl font-black uppercase">{nodeDetail?.node_method || '---'}</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                Active Services Monitoring
              </span>
              {nodeDetail?.services && nodeDetail.services.length > 0 && (
                <span className="badge badge-outline badge-xs animate-pulse text-primary font-bold">
                  LIVE STATUS
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2">
              {isDetailLoading ? (
                <div className="flex justify-center p-10">
                  <span className="loading loading-dots loading-md opacity-20"></span>
                </div>
              ) : nodeDetail?.services && nodeDetail.services.length > 0 ? (
                nodeDetail.services.map((svc) => {
                  const ip = svc.node_service_ip_address?.trim();
                  const port = svc.node_service_port;
                  const hasPort = port && port > 0;
                  const targetKey = hasPort ? `${ip}:${port}` : ip;
                  const liveStatus = serviceStatusData?.nodes.find((n) => n.target === targetKey);
                  const isSvcOnline = liveStatus?.status === 'online';

                  return (
                    <div
                      key={svc.node_service_id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 ${
                        isSvcOnline
                          ? 'bg-success/5 border-success/20'
                          : 'bg-error/5 border-error/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-[10px] border transition-colors ${
                            isSvcOnline
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-error/10 text-error border-error/20'
                          }`}
                        >
                          {hasPort ? port : 'PING'}
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-sm font-bold opacity-90 leading-none">
                            {svc.node_service_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-mono font-medium opacity-60 bg-base-300/50 px-1.5 py-0.5 rounded">
                              {ip} ({hasPort ? 'TCP' : 'ICMP'})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`badge ${
                            isSvcOnline ? 'badge-success' : 'badge-error'
                          } badge-xs font-black px-2 py-2`}
                        >
                          {isSvcOnline ? 'UP' : 'DOWN'}
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            isSvcOnline ? 'text-success' : 'text-error'
                          }`}
                        >
                          {liveStatus?.latency || 'timeout'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-base-200/50 rounded-3xl border-2 border-dashed border-base-300">
                  <div className="p-4 bg-base-100 rounded-full shadow-sm mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v4M7 7h10"/>
                    </svg>
                  </div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 text-center">
                    No Services Registered
                  </h4>
                  <p className="text-[10px] opacity-30 text-center mt-2 max-w-[200px] leading-relaxed">
                    This device is currently only monitored via its main target ({nodeDetail?.node_method}).
                  </p>
                  <button className="btn btn-ghost btn-xs mt-4 text-primary font-bold hover:bg-primary/10">
                    + Configure Services
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-base-200/50 border-t border-base-300 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-primary rounded-xl px-10 font-bold uppercase text-xs"
          >
            Close Detail
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    </div>
  );
}