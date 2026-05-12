import { useState, useCallback } from 'react';
import { NodeDetailResponse } from '@/src/app/(dashboard)/workspaces/[workspace_id]/topology/types';
import { NodeForm } from './types';
import { nodeToForm } from './utils';
import { ErrorBanner } from './ErrorBanner';
import { getCsrfHeaders } from '@/src/lib/csrf';

export function NodeEditForm({
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/nodes/${nodeId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
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
      onSuccess(); 
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, form, nodeId, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-warning/5 border-b border-warning/20 space-y-4">
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
