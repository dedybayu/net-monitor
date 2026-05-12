'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NodeDetailResponse, StatusApiResponse, NodeService } from '../types';

import { NodeEditForm, ServiceRow, AddServiceForm, MiniLatencyChart } from '@/src/components/shared/NodeDetail';
// ── Types ──────────────────────────────────────────────────────────────────

interface NodeDetailModalProps {
  workspaceId: number;
  selectedNodeId: string | null;
  activeNodeData: { label: string; status: string; latency: string } | undefined;
  nodeDetail: NodeDetailResponse | undefined;
  isDetailLoading: boolean;
  serviceStatusData: StatusApiResponse | undefined;
  onServiceAdded: () => void;
  onNodeDeleted: () => void;   // close modal + refresh canvas after node deleted
  onClose: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────

export function NodeDetailModal({
  workspaceId,
  selectedNodeId,
  activeNodeData,
  nodeDetail,
  isDetailLoading,
  serviceStatusData,
  onServiceAdded,
  onNodeDeleted,
  onClose,
}: NodeDetailModalProps) {
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [deleteNodeConfirm, setDeleteNodeConfirm] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [deleteNodeError, setDeleteNodeError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleServiceAdded = useCallback(() => {
    setIsAddingService(false);
    onServiceAdded();
  }, [onServiceAdded]);

  const handleNodeEdited = useCallback(() => {
    setIsEditingNode(false);
    onServiceAdded(); // revalidates full node detail
  }, [onServiceAdded]);

  const handleDeleteNode = useCallback(async () => {
    if (!selectedNodeId) return;
    setIsDeletingNode(true);
    setDeleteNodeError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/nodes/${selectedNodeId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Gagal menghapus node');
      onNodeDeleted();
    } catch (err) {
      setDeleteNodeError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setIsDeletingNode(false);
      setDeleteNodeConfirm(false);
    }
  }, [workspaceId, selectedNodeId, onNodeDeleted]);

  const hasServices = nodeDetail?.services && nodeDetail.services.length > 0;

  const modalContent = (
    <div className="modal modal-open z-[9999]">
      <div className="modal-box w-11/12 max-w-6xl border border-base-300 shadow-2xl bg-base-100 p-0 overflow-hidden">

        {/* ── Header (view) ── */}
        {!isEditingNode && (
          <div className={`p-6 ${nodeDetail ? 'bg-base-200' : 'animate-pulse bg-base-300'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-2xl uppercase tracking-tighter">
                    {nodeDetail?.node_label || activeNodeData?.label || 'Loading...'}
                  </h3>
                  <div className={`badge ${activeNodeData?.status === 'online' ? 'badge-success' : 'badge-error'} badge-sm font-black`}>
                    {activeNodeData?.status?.toUpperCase()}
                  </div>
                </div>
                <p className="text-xs opacity-60 font-mono mt-1">
                  Target: {nodeDetail?.node_ip_address}
                  {nodeDetail?.node_port !== 0 && `:${nodeDetail?.node_port}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {/* Edit node button */}
                {nodeDetail && (
                  <button onClick={() => setIsEditingNode(true)}
                    className="btn btn-ghost btn-sm btn-circle opacity-40 hover:opacity-100 transition-opacity"
                    title="Edit node">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header (edit node form) ── */}
        {isEditingNode && nodeDetail && selectedNodeId && (
          <NodeEditForm
            workspaceId={workspaceId}
            nodeId={selectedNodeId}
            nodeDetail={nodeDetail}
            onSuccess={handleNodeEdited}
            onCancel={() => setIsEditingNode(false)}
          />
        )}

        {/* Description */}
        {!isEditingNode && (
          <div className="px-6 py-4 border-b border-base-300">
            <p className="text-sm opacity-80 italic">
              {nodeDetail?.node_description || 'Tidak ada deskripsi tersedia untuk node ini.'}
            </p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200 rounded-2xl p-4 border border-base-300 shadow-inner flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Node Latency</span>
              <span className={`text-3xl font-black font-mono ${activeNodeData?.status === 'online' ? 'text-primary' : 'text-error'}`}>
                {activeNodeData?.latency || '...'}
              </span>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 border border-base-300 shadow-inner flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Check Method</span>
              <span className="text-xl font-black uppercase">{nodeDetail?.node_method || '---'}</span>
            </div>
          </div>

          {/* Mini Latency Chart */}
          {nodeDetail && (
            <MiniLatencyChart
              workspaceId={workspaceId}
              nodeIp={nodeDetail.node_ip_address}
              nodePort={nodeDetail.node_port}
              nodeMethod={nodeDetail.node_method}
            />
          )}

          {/* Services section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                  Active Services Monitoring
                </span>
                {hasServices && (
                  <span className="badge badge-outline badge-xs animate-pulse text-primary font-bold">LIVE</span>
                )}
              </div>
              {!isAddingService && (
                <button onClick={() => setIsAddingService(true)}
                  className="btn btn-ghost btn-xs gap-1.5 text-primary font-bold hover:bg-primary/10 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Service
                </button>
              )}
            </div>

            {isAddingService && selectedNodeId && (
              <div className="mb-4">
                <AddServiceForm workspaceId={workspaceId} nodeId={selectedNodeId} nodeIp={nodeDetail!.node_ip_address} onSuccess={handleServiceAdded} onCancel={() => setIsAddingService(false)} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
              {isDetailLoading ? (
                <div className="flex justify-center p-10">
                  <span className="loading loading-dots loading-md opacity-20"></span>
                </div>
              ) : hasServices ? (
                nodeDetail!.services.map((svc: NodeService) => (
                  <ServiceRow key={svc.node_service_id} svc={svc}
                    workspaceId={workspaceId} nodeId={selectedNodeId!} serviceStatusData={serviceStatusData} onMutated={onServiceAdded} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-6 bg-base-200/50 rounded-3xl border-2 border-dashed border-base-300">
                  <div className="p-4 bg-base-100 rounded-full shadow-sm mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v4M7 7h10" />
                    </svg>
                  </div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 text-center">No Services Registered</h4>
                  <p className="text-[10px] opacity-30 text-center mt-2 max-w-[200px] leading-relaxed">
                    This device is monitored via its main target ({nodeDetail?.node_method}).
                  </p>
                  {!isAddingService && (
                    <button onClick={() => setIsAddingService(true)}
                      className="btn btn-ghost btn-xs mt-4 text-primary font-bold hover:bg-primary/10">
                      + Configure Services
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-6 bg-base-200/50 border-t border-base-300">
          {/* Delete node confirmation */}
          {deleteNodeConfirm ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-error/10 border border-error/25 mb-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-error uppercase tracking-wide">Hapus node ini?</span>
                <span className="text-[10px] opacity-60 mt-0.5">Semua service akan ikut terhapus.</span>
              </div>
              <div className="flex gap-2">
                {deleteNodeError && <span className="text-[10px] text-error font-bold self-center">{deleteNodeError}</span>}
                <button onClick={() => { setDeleteNodeConfirm(false); setDeleteNodeError(null); }}
                  className="btn btn-ghost btn-xs">Batal</button>
                <button onClick={handleDeleteNode} disabled={isDeletingNode} className="btn btn-error btn-xs font-bold px-4">
                  {isDeletingNode ? <span className="loading loading-spinner loading-xs"></span> : 'Hapus Node'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between items-center">
            {/* Delete node trigger */}
            <button
                onClick={() => setDeleteNodeConfirm(true)}
                disabled={deleteNodeConfirm || !nodeDetail}
                className="btn btn-ghost btn-sm text-error hover:bg-error/10 gap-1.5 font-bold disabled:opacity-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus Node
              </button>

              <button onClick={onClose} className="btn btn-primary rounded-xl px-10 font-bold uppercase text-xs">
                Close Detail
              </button>
            </div>
          </div>
        </div>
        <div className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      </div>
    );

    if (!mounted) return null;
    return createPortal(modalContent, document.body);
}
