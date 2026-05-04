'use client';

import { Activity, Wifi, WifiOff, Sun, Moon, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import SettingsModal from './SettingsModal';

interface DashboardHeaderProps {
  isConnected: boolean;
  reconnectAttempts: number;
  currentPorts: number[];
  isDemo: boolean;
  onSavePorts: (ports: number[]) => void;
}

export default function DashboardHeader({
  isConnected,
  reconnectAttempts,
  currentPorts,
  isDemo,
  onSavePorts,
}: DashboardHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
      {/* ── PAGE HEADER ── */}
      <div>
        <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 mb-2 flex items-center gap-2">
          <span className="inline-block h-px w-6 bg-primary"></span>
          NetFlow Analytics
        </p>
        <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content">
          Traffic <span className="text-primary">Monitor</span>
        </h1>
        <p className="text-sm opacity-50 mt-2 font-medium">
          Real-time MikroTik NetFlow v9 Traffic Analysis
        </p>
      </div>

      {/* Status & Controls */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-base-300/50">
          <div className="flex items-center gap-2 pr-3 border-r border-base-content/10">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                <Wifi className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold text-success">
                  Connected
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-error animate-ping" />
                <WifiOff className="w-4 h-4 text-error" />
                <span className="text-xs font-semibold text-error">
                  Disconnected
                  {reconnectAttempts > 0 && ` (retry ${reconnectAttempts})`}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Ports:</span>
            <div className="flex gap-1">
              {isDemo ? (
                <span className="badge badge-sm badge-secondary font-mono text-[10px]">DEMO</span>
              ) : currentPorts.length > 0 ? (
                currentPorts.map(p => (
                  <span key={p} className="badge badge-sm badge-ghost font-mono text-[10px] bg-base-100">{p}</span>
                ))
              ) : (
                <span className="text-[10px] opacity-30 italic">None</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn btn-primary btn-sm rounded-xl px-4 shadow-sm shadow-primary/20"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 mr-1" />
          Settings
        </button>


      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentPorts={currentPorts}
        onSave={onSavePorts}
      />
    </div>
  );
}
