import { useState, useCallback } from 'react';
import { ServiceForm, EMPTY_SERVICE_FORM } from './types';
import { ServiceFormFields } from './ServiceFormFields';
import { ErrorBanner } from './ErrorBanner';

export function AddServiceForm({
  workspaceId, nodeId, nodeIp, onSuccess, onCancel,
}: { workspaceId: number; nodeId: string; nodeIp: string; onSuccess: () => void; onCancel: () => void; }) {

  const [form, setForm] = useState<ServiceForm>(() => ({
    ...EMPTY_SERVICE_FORM,
    ip: nodeIp || '',
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
