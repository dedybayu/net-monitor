import { useState, useCallback } from 'react';
import { NodeDetailResponse, StatusApiResponse } from '@/src/app/(dashboard)/workspaces/[workspace_id]/topology/types';
import { ServiceForm } from './types';
import { svcToForm } from './utils';
import { ErrorBanner } from './ErrorBanner';
import { ServiceFormFields } from './ServiceFormFields';
import { MiniLatencyChart } from './MiniLatencyChart';

export function ServiceRow({
  workspaceId,
  svc,
  nodeId,
  serviceStatusData,
  onMutated,
}: {
  workspaceId: number;
  svc: NodeDetailResponse['services'][number];
  nodeId: string;
  serviceStatusData: StatusApiResponse | undefined;
  onMutated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(() => svcToForm(svc));
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  const set = (field: keyof ServiceForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const ip = svc.node_service_ip_address?.trim();
  const port = svc.node_service_port;
  const hasPort = port && port > 0;
  const liveStatus = serviceStatusData?.nodes.find(
    (n) => n.target === (hasPort ? `${ip}:${port}` : ip)
  );
  const isOnline = liveStatus?.status === 'online';

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/nodes/${nodeId}/services/${svc.node_service_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name, description: form.description, ip: form.ip,
            method: form.method, port: form.method === 'TCP' ? form.port : undefined,
          }),
        }
      );
      if (!res.ok) throw new Error('Gagal mengupdate service');
      setIsEditing(false);
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, form, nodeId, svc.node_service_id, onMutated]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/nodes/${nodeId}/services/${svc.node_service_id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Gagal menghapus service');
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  }, [workspaceId, nodeId, svc.node_service_id, onMutated]);

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-warning/15 bg-warning/10">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-warning/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-warning">
              Edit: {svc.node_service_name}
            </span>
          </div>
          <button type="button" onClick={() => { setForm(svcToForm(svc)); setError(null); setIsEditing(false); setDeleteConfirm(false); }}
            className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">
          <ServiceFormFields form={form} set={set} />
          {error && <ErrorBanner message={error} />}
          {deleteConfirm ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-error/10 border border-error/25">
              <span className="text-[11px] font-bold text-error">Hapus service ini?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteConfirm(false)} className="btn btn-ghost btn-xs">Batal</button>
                <button type="button" onClick={handleDelete} disabled={isDeleting} className="btn btn-error btn-xs font-bold">
                  {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : 'Hapus'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => setDeleteConfirm(true)}
                className="btn btn-ghost btn-xs text-error hover:bg-error/10 gap-1 font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setForm(svcToForm(svc)); setIsEditing(false); }} className="btn btn-ghost btn-sm text-xs">Batal</button>
                <button type="submit" disabled={isSaving} className="btn btn-warning btn-sm text-xs px-6 font-bold">
                  {isSaving ? <span className="loading loading-spinner loading-xs"></span> : 'Simpan'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div 
        onClick={() => setIsChartExpanded(!isChartExpanded)}
        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
          isOnline 
            ? 'bg-success/5 border-success/20 hover:bg-success/10' 
            : 'bg-error/5 border-error/20 hover:bg-error/10'
        } ${isChartExpanded ? 'ring-2 ring-primary/20 ring-offset-1 ring-offset-base-100' : ''}`}
      >
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-[10px] border transition-colors ${
            isOnline ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
          }`}>
            {hasPort ? port : 'PING'}
          </div>
          <div className="flex flex-col">
            <h4 className="text-sm font-bold opacity-90 leading-none flex items-center gap-2">
              {svc.node_service_name}
              {isChartExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </h4>
            <span className="text-[10px] font-mono font-medium opacity-60 bg-base-300/50 px-1.5 py-0.5 rounded mt-1.5">
              {ip} ({hasPort ? 'TCP' : 'ICMP'})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <div className={`badge ${isOnline ? 'badge-success' : 'badge-error'} badge-xs font-black px-2 py-2`}>
              {isOnline ? 'UP' : 'DOWN'}
            </div>
            <span className={`text-[10px] font-mono font-bold ${isOnline ? 'text-success' : 'text-error'}`}>
              {liveStatus?.latency || 'timeout'}
            </span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
            title="Edit service">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {isChartExpanded && (
        <div className="px-2 pb-2 animate-in slide-in-from-top-2 duration-300">
          <MiniLatencyChart 
            workspaceId={workspaceId}
            nodeIp={svc.node_service_ip_address}
            nodePort={svc.node_service_port}
            nodeMethod={svc.node_service_method}
            type="service"
          />
        </div>
      )}
    </div>
  );
}
