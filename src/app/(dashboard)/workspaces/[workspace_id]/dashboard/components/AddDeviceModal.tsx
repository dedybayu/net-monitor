'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface NewNodeData {
  label: string;
  target: string;
  port: string; 
  method: 'ICMP' | 'TCP';
}

interface AddDeviceModalProps {
  workspaceId: number;
  onSuccess: () => void;
  onClose: () => void;
}

const DEFAULT_FORM: NewNodeData = { label: '', target: '', port: '', method: 'ICMP' };

export function AddDeviceModal({ workspaceId, onSuccess, onClose }: AddDeviceModalProps) {
  const [form, setForm] = useState<NewNodeData>(DEFAULT_FORM);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const finalTarget = form.target.trim();
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          target: finalTarget,
          port: form.method === 'TCP' ? form.port : '',
          method: form.method,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Gagal menambahkan perangkat');
      }

      onSuccess();
      setForm(DEFAULT_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="modal modal-open z-[9999]">
      <div className="modal-box border border-base-300 shadow-2xl bg-base-100">
        <h3 className="font-black text-lg uppercase tracking-tight">Tambah Perangkat Baru</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-bold text-xs uppercase opacity-60">Label Nama</span></label>
            <input
              type="text"
              placeholder="Contoh: Core Server"
              className="input input-bordered w-full focus:input-primary text-sm"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="form-control flex-grow">
              <label className="label"><span className="label-text font-bold text-xs uppercase opacity-60">Target IP / Host</span></label>
              <input
                type="text"
                placeholder="192.168.1.1"
                className="input input-bordered w-full focus:input-primary text-sm font-mono"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                required
              />
            </div>

            {form.method === 'TCP' && (
              <div className="form-control w-24 animate-in fade-in zoom-in duration-200">
                <label className="label"><span className="label-text font-bold text-xs uppercase opacity-60">Port</span></label>
                <input
                  type="number"
                  placeholder="80"
                  className="input input-bordered w-full focus:input-primary text-sm font-mono"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  required={form.method === 'TCP'}
                />
              </div>
            )}
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-bold text-xs uppercase opacity-60">Metode Monitoring</span></label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn btn-sm flex-grow rounded-lg ${form.method === 'ICMP' ? 'btn-primary' : 'btn-outline opacity-50'}`}
                onClick={() => setForm({ ...form, method: 'ICMP' })}
              >
                ICMP (Ping)
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-grow rounded-lg ${form.method === 'TCP' ? 'btn-primary' : 'btn-outline opacity-50'}`}
                onClick={() => setForm({ ...form, method: 'TCP' })}
              >
                TCP (Port)
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-error/10 border border-error/20 mt-4">
              <span className="text-[11px] font-bold text-error">{error}</span>
            </div>
          )}

          <div className="modal-action pt-4">
            <button type="button" onClick={onClose} className="btn btn-ghost text-xs uppercase font-bold">Batal</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary px-8 rounded-xl font-bold uppercase text-xs">
              {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
