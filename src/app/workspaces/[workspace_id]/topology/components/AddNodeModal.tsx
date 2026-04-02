import { useState } from 'react';
import { Node } from 'reactflow';

interface NewNodeData {
  label: string;
  target: string;
  method: 'ICMP' | 'TCP';
}

interface AddNodeModalProps {
  onAdd: (node: Node) => void;
  onClose: () => void;
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number };
}

const DEFAULT_FORM: NewNodeData = { label: '', target: '', method: 'ICMP' };

export function AddNodeModal({ onAdd, onClose, screenToFlowPosition }: AddNodeModalProps) {
  const [form, setForm] = useState<NewNodeData>(DEFAULT_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'monitor',
      position,
      data: {
        label: form.label,
        target: form.target,
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
      <div className="modal-box border border-base-300 shadow-2xl">
        <h3 className="font-black text-lg uppercase tracking-tight">Tambah Perangkat Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-bold">Label Nama</span></label>
            <input
              type="text"
              className="input input-bordered w-full focus:input-primary"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-bold">Target IP / Host</span></label>
            <input
              type="text"
              className="input input-bordered w-full focus:input-primary"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-bold">Metode</span></label>
            <select
              className="select select-bordered w-full"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as 'ICMP' | 'TCP' })}
            >
              <option value="ICMP">ICMP (Ping)</option>
              <option value="TCP">TCP (Service Port)</option>
            </select>
          </div>
          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn btn-ghost">Batal</button>
            <button type="submit" className="btn btn-primary px-8">Tambahkan ke Kanvas</button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}