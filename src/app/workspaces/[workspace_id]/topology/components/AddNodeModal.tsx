import { useState } from 'react';
import { Node } from 'reactflow';

interface NewNodeData {
  label: string;
  target: string;
  port: string; // Tambahkan field port
  method: 'ICMP' | 'TCP';
}

interface AddNodeModalProps {
  onAdd: (node: Node) => void;
  onClose: () => void;
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number };
}

const DEFAULT_FORM: NewNodeData = { label: '', target: '', port: '', method: 'ICMP' };

export function AddNodeModal({ onAdd, onClose, screenToFlowPosition }: AddNodeModalProps) {
  const [form, setForm] = useState<NewNodeData>(DEFAULT_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    // Logika penggabungan target: Jika TCP dan port ada, gabungkan IP:PORT
    const finalTarget = (form.method === 'TCP' && form.port) 
      ? `${form.target}:${form.port}` 
      : form.target;

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'monitor',
      position,
      data: {
        label: form.label,
        target: finalTarget,
        method: form.method,
        status: 'offline',
        latency: '...',
      },
    };

    onAdd(newNode);
    setForm(DEFAULT_FORM);
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box border border-base-300 shadow-2xl bg-base-100">
        <h3 className="font-black text-lg uppercase tracking-tight">Tambah Perangkat Baru</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* LABEL NAMA */}
          <div className="form-control">
            <label className="label"><span className="label-text font-bold text-xs uppercase opacity-60">Label Nama</span></label>
            <input
              type="text"
              placeholder="Contoh: Core Server"
              className="input input-bordered w-full focus:input-primary"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
          </div>

          {/* TARGET IP & PORT (Dinamis) */}
          <div className="flex gap-3">
            <div className="form-control flex-grow">
              <label className="label"><span className="label-text font-bold text-xs uppercase opacity-60">Target IP / Host</span></label>
              <input
                type="text"
                placeholder="192.168.1.1"
                className="input input-bordered w-full focus:input-primary"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                required
              />
            </div>

            {/* INPUT PORT HANYA MUNCUL JIKA TCP DIPILIH */}
            {form.method === 'TCP' && (
              <div className="form-control w-24 animate-in fade-in zoom-in duration-200">
                <label className="label"><span className="label-text font-bold text-xs uppercase opacity-60">Port</span></label>
                <input
                  type="number"
                  placeholder="80"
                  className="input input-bordered w-full focus:input-primary"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  required={form.method === 'TCP'}
                />
              </div>
            )}
          </div>

          {/* METODE */}
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

          <div className="modal-action pt-4">
            <button type="button" onClick={onClose} className="btn btn-ghost text-xs uppercase font-bold">Batal</button>
            <button type="submit" className="btn btn-primary px-8 rounded-xl font-bold uppercase text-xs">Tambahkan</button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    </div>
  );
}