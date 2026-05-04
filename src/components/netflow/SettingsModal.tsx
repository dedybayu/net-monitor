'use client';

import { useState, useEffect } from 'react';
import { Settings, X, Plus, Trash2, Save, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  currentPorts: number[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (ports: number[]) => void;
}

export default function SettingsModal({
  currentPorts,
  isOpen,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [ports, setPorts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize ports when modal opens
  useEffect(() => {
    if (isOpen) {
      setPorts(currentPorts.map(String));
      setError(null);
    }
  }, [isOpen, currentPorts]);

  if (!isOpen) return null;

  const handleAddPort = () => {
    setPorts([...ports, '']);
  };

  const handleRemovePort = (index: number) => {
    const newPorts = [...ports];
    newPorts.splice(index, 1);
    setPorts(newPorts);
  };

  const handlePortChange = (index: number, value: string) => {
    const newPorts = [...ports];
    newPorts[index] = value.replace(/\D/g, ''); // Only digits
    setPorts(newPorts);
  };

  const handleSave = () => {
    const numericPorts = ports
      .map(p => parseInt(p, 10))
      .filter(p => !isNaN(p) && p > 0 && p < 65536);

    if (numericPorts.length === 0) {
      setError('Please add at least one valid port (1-65535)');
      return;
    }

    // Check for duplicates
    if (new Set(numericPorts).size !== numericPorts.length) {
      setError('Duplicate ports are not allowed');
      return;
    }

    onSave(numericPorts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card bg-base-100 w-full max-w-md shadow-2xl border border-base-200 animate-in fade-in zoom-in duration-200">
        <div className="card-body p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Collector Settings</h2>
            </div>
            <button 
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm opacity-60 mb-6">
            Configure the UDP ports that the NetFlow collector listens on. 
            MikroTik routers should be configured to send NetFlow v9 packets to these ports.
          </p>

          {/* Port List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <label className="text-xs font-bold uppercase tracking-wider opacity-40">
              UDP Listening Ports
            </label>
            
            {ports.map((port, index) => (
              <div key={index} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => handlePortChange(index, e.target.value)}
                    placeholder="e.g. 2055"
                    className="input input-bordered w-full pr-10 focus:input-primary"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono opacity-30">
                    UDP
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePort(index)}
                  className="btn btn-ghost btn-square text-error hover:bg-error/10"
                  disabled={ports.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              onClick={handleAddPort}
              className="btn btn-ghost btn-sm w-full gap-2 border-dashed border-2 border-base-300 hover:border-primary/50"
            >
              <Plus className="w-4 h-4" />
              Add Port
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-error text-xs font-medium bg-error/10 p-3 rounded-lg border border-error/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="card-actions justify-end mt-8 pt-4 border-t border-base-200">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary gap-2">
              <Save className="w-4 h-4" />
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
