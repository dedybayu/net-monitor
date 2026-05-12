import { ServiceForm } from './types';

export function ServiceFormFields({
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
