'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import { NodeDetailResponse, StatusApiResponse, NodeService } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

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

interface ServiceForm {
  name: string;
  description: string;
  ip: string;
  method: 'ICMP' | 'TCP';
  port: string;
}

interface NodeForm {
  label: string;
  description: string;
  ip: string;
  method: 'ICMP' | 'TCP';
  port: string;
}

const EMPTY_SERVICE_FORM: ServiceForm = {
  name: '', description: '', ip: '', method: 'ICMP', port: '',
};

// const WORKSPACE_ID = 1;

// ── Helpers ────────────────────────────────────────────────────────────────

function svcToForm(svc: NodeDetailResponse['services'][number]): ServiceForm {
  const hasPort = svc.node_service_port > 0;
  return {
    name: svc.node_service_name,
    description: svc.node_service_description || '',
    ip: svc.node_service_ip_address,
    method: hasPort ? 'TCP' : 'ICMP',
    port: hasPort ? String(svc.node_service_port) : '',
  };
}

function nodeToForm(node: NodeDetailResponse): NodeForm {
  const hasPort = node.node_port > 0;
  return {
    label: node.node_label,
    description: node.node_description || '',
    ip: node.node_ip_address,
    method: node.node_method as 'ICMP' | 'TCP',
    port: hasPort ? String(node.node_port) : '',
  };
}

// ── Shared UI atoms ────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-error/10 border border-error/20">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[11px] font-bold text-error">{message}</span>
    </div>
  );
}

// ── Shared service form fields ─────────────────────────────────────────────

function ServiceFormFields({
  form,
  set,
}: {
  form: ServiceForm;
  set: (field: keyof ServiceForm, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Nama Service</span>
          </label>
          <input type="text" placeholder="e.g. HTTP, MySQL"
            className="input input-bordered input-sm w-full text-xs focus:input-primary"
            value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Deskripsi</span>
          </label>
          <input type="text" placeholder="Opsional"
            className="input input-bordered input-sm w-full text-xs focus:input-primary"
            value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">IP Address</span>
          </label>
          <input type="text" placeholder="192.168.1.1"
            className="input input-bordered input-sm w-full text-xs font-mono focus:input-primary"
            value={form.ip} onChange={(e) => set('ip', e.target.value)} required />
        </div>
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Metode</span>
          </label>
          <select className="select select-bordered select-sm w-full text-xs" value={form.method}
            onChange={(e) => { set('method', e.target.value as 'ICMP' | 'TCP'); if (e.target.value === 'ICMP') set('port', ''); }}>
            <option value="ICMP">ICMP (Ping)</option>
            <option value="TCP">TCP (Port)</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Port</span>
          </label>
          <input type="number" placeholder={form.method === 'TCP' ? '80' : '—'}
            className="input input-bordered input-sm w-full text-xs font-mono disabled:opacity-30"
            value={form.port} onChange={(e) => set('port', e.target.value)}
            disabled={form.method === 'ICMP'} required={form.method === 'TCP'} min={1} max={65535} />
        </div>
      </div>
    </div>
  );
}

// ── Node edit form (shown inside the header area) ──────────────────────────

function NodeEditForm({
  workspaceId,
  nodeId,
  nodeDetail,
  onSuccess,
  onCancel,
}: {
  workspaceId: number;
  nodeId: string;
  nodeDetail: NodeDetailResponse;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NodeForm>(() => nodeToForm(nodeDetail));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof NodeForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

// Di dalam NodeEditForm
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);
  setError(null);
  try {
    const res = await fetch(
      `/api/workspaces/${workspaceId}/nodes/${nodeId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          description: form.description,
          ip: form.ip,
          method: form.method,
          port: form.method === 'TCP' ? form.port : 0,
        }),
      }
    );
    
    if (!res.ok) throw new Error('Gagal mengupdate node');

    // ✅ PENTING: Panggil onSuccess yang akan memicu refresh di TopologyEditorInner
    onSuccess(); 
    
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
  } finally {
    setIsSaving(false);
  }
}, [workspaceId, form, nodeId, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-warning/5 border-b border-warning/20 space-y-4">
      {/* Edit header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-warning/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-warning">Edit Node</span>
        </div>
        <button type="button" onClick={onCancel}
          className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100">✕</button>
      </div>

      {/* Label + description */}
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Label</span>
          </label>
          <input type="text" className="input input-bordered input-sm w-full text-xs focus:input-warning"
            value={form.label} onChange={(e) => set('label', e.target.value)} required />
        </div>
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Deskripsi</span>
          </label>
          <input type="text" placeholder="Opsional"
            className="input input-bordered input-sm w-full text-xs focus:input-warning"
            value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>

      {/* IP + method + port */}
      <div className="grid grid-cols-3 gap-3">
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">IP Address</span>
          </label>
          <input type="text" className="input input-bordered input-sm w-full text-xs font-mono focus:input-warning"
            value={form.ip} onChange={(e) => set('ip', e.target.value)} required />
        </div>
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Metode</span>
          </label>
          <select className="select select-bordered select-sm w-full text-xs" value={form.method}
            onChange={(e) => { set('method', e.target.value as 'ICMP' | 'TCP'); if (e.target.value === 'ICMP') set('port', ''); }}>
            <option value="ICMP">ICMP (Ping)</option>
            <option value="TCP">TCP (Port)</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label py-0 mb-1">
            <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Port</span>
          </label>
          <input type="number" placeholder={form.method === 'TCP' ? '80' : '—'}
            className="input input-bordered input-sm w-full text-xs font-mono disabled:opacity-30"
            value={form.port} onChange={(e) => set('port', e.target.value)}
            disabled={form.method === 'ICMP'} required={form.method === 'TCP'} min={1} max={65535} />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm text-xs">Batal</button>
        <button type="submit" disabled={isSaving} className="btn btn-warning btn-sm text-xs px-6 font-bold">
          {isSaving ? <span className="loading loading-spinner loading-xs"></span> : 'Simpan Node'}
        </button>
      </div>
    </form>
  );
}

// ── Service row (view + edit-in-place) ─────────────────────────────────────

function ServiceRow({
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

  // ── Edit mode ──────────────────────────────────────────────────────────
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

  // ── View mode ──────────────────────────────────────────────────────────
  return (
    <div className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isOnline ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'
      }`}>
      <div className="flex items-center gap-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-[10px] border transition-colors ${isOnline ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
          }`}>
          {hasPort ? port : 'PING'}
        </div>
        <div className="flex flex-col">
          <h4 className="text-sm font-bold opacity-90 leading-none">{svc.node_service_name}</h4>
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
        <button onClick={() => setIsEditing(true)}
          className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
          title="Edit service">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Add-service form ───────────────────────────────────────────────────────

function AddServiceForm({
  workspaceId, nodeId, nodeIp, onSuccess, onCancel,
}: { workspaceId: number; nodeId: string; nodeIp: string; onSuccess: () => void; onCancel: () => void; }) {

  const [form, setForm] = useState<ServiceForm>(() => ({
    ...EMPTY_SERVICE_FORM,
    ip: nodeIp || '', // Mengisi default IP
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ServiceForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/nodes/${nodeId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, description: form.description, ip: form.ip,
          method: form.method, port: form.method === 'TCP' ? form.port : undefined,
        }),
      });
      if (!res.ok) throw new Error('Gagal menambahkan service');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }, [workspaceId, form, nodeId, onSuccess]);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10 bg-primary/10">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-primary">Tambah Service Baru</span>
        </div>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <ServiceFormFields form={form} set={set} />
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm text-xs">Batal</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm text-xs px-6 font-bold">
            {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : 'Simpan Service'}
          </button>
        </div>
      </form>
    </div>
  );
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

// ── Mini Latency Chart for Node Detail ─────────────────────────────────────

const latencyFetcher = (url: string) => fetch(url).then(r => r.json());

function MiniLatencyChart({
  workspaceId,
  nodeIp,
  nodePort,
  nodeMethod,
}: {
  workspaceId: number;
  nodeIp: string;
  nodePort: number;
  nodeMethod: string;
}) {
  const host = nodeMethod === 'TCP' && nodePort > 0 ? `${nodeIp}:${nodePort}` : nodeIp;

  const { data: rawData, isLoading } = useSWR(
    `/api/monitoring/latency?workspace_id=${workspaceId}&host=${encodeURIComponent(host)}&range=15m`,
    latencyFetcher,
    { refreshInterval: 5000 }
  );

  const chartData = useMemo(() => {
    if (!rawData || rawData.error) return [];
    return rawData.map((item: Record<string, unknown>) => ({
      ...item,
      formattedTime: new Date(item.time as string).toLocaleString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      value: item[host] ?? null,
    }));
  }, [rawData, host]);

  const color = 'oklch(var(--p))';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MiniTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0].value != null) {
      return (
        <div className="bg-base-100/95 border border-base-300 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl text-xs">
          <span className="font-bold">{payload[0].value.toFixed(2)} ms</span>
          <span className="text-base-content/40 ml-2">{payload[0].payload.formattedTime}</span>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-base-200 rounded-2xl p-4 border border-base-300 h-[160px] flex items-center justify-center">
        <span className="loading loading-dots loading-sm opacity-30"></span>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-base-200 rounded-2xl p-4 border border-base-300 h-[160px] flex flex-col items-center justify-center text-base-content/30">
        <span className="text-[10px] font-bold uppercase tracking-widest">No chart data</span>
        <span className="text-[9px] mt-1 opacity-60">Worker belum menulis data untuk node ini</span>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-2xl p-4 border border-base-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
          Latency Trend (15m)
        </span>
        <span className="text-[9px] font-mono opacity-30">{host}</span>
      </div>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.06)" vertical={false} />
            <XAxis
              dataKey="formattedTime"
              stroke="oklch(var(--bc) / 0.2)"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              stroke="oklch(var(--bc) / 0.2)"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}ms`}
              width={40}
            />
            <Tooltip content={<MiniTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              name={host}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#miniGrad)"
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}