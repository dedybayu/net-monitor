'use client';

import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  MonitoringTarget,
  Device,
  // ApiNodeStatus,
  StatusApiResponse
} from '@/src/types/monitor';

// Fetcher dengan Type Safety penuh
// Fungsi fetcher yang menerima key dari SWR
const fetcher = async (key: [string, MonitoringTarget[]] | null): Promise<StatusApiResponse> => {
  // Jika key null, jangan lakukan apa-apa
  if (!key) return { nodes: [] };

  const [url, payload] = key;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets: payload }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Gagal mengambil data monitoring');
  }

  return res.json();
};

// Data Inisial Perangkat
const getInitialDevices = (): Device[] => [
  { id: '1', name: 'Gateway Utama', target: '172.16.10.30', method: 'ICMP' },
  { id: '2', name: 'Web Server 1', target: '172.16.10.1', method: 'ICMP' },
  { id: '3', name: 'Web Server 2', target: '10.10.168.6:3001', method: 'TCP' },
];

export default function MonitorPage() {
  const [devices] = useState<Device[]>(getInitialDevices());
  const [countdown, setCountdown] = useState<number>(5);

  const targetPayload = useMemo<MonitoringTarget[]>(() => {
    return devices.map((d) => {
      if (d.target.includes(':')) {
        const [ip, port] = d.target.split(':');
        return { ip, port: parseInt(port, 10) };
      }
      return { ip: d.target, port: 0 };
    });
  }, [devices]);

  // Tentukan tipe Key secara eksplisit di Generic SWR
  const { data: apiData, error, isLoading } = useSWR<StatusApiResponse, Error, [string, MonitoringTarget[]] | null>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    fetcher, // Sekarang ini sudah sinkron dan tidak butuh 'as any'
    {
      refreshInterval: 5000,
      onSuccess: () => setCountdown(5)
    }
  );
  // Timer Countdown untuk indikator visual UI
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- UI STATES (Loading & Error) ---
  if (isLoading && !apiData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-300 gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm font-bold tracking-widest animate-pulse uppercase">Syncing Network Status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-base-200">
        <div className="alert alert-error shadow-lg max-w-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold">API Error</h3>
            <div className="text-xs">{error.message}</div>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-sm btn-ghost">Re-sync</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans">
      {/* NAVBAR */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl font-black tracking-tighter gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-content shadow-lg shadow-primary/20">N</div>
            NETMONITOR
          </Link>
        </div>
        <div className="flex-none gap-4">
          <div className="hidden md:flex flex-col items-end text-right mr-2">
            <span className="text-[10px] opacity-50 font-bold uppercase tracking-widest leading-none mb-1">Refresh Cycle</span>
            <progress className="progress progress-primary w-24 h-1.5" value={(5 - countdown) * 20} max="100"></progress>
          </div>
          <Link href="/topology" className="btn btn-primary btn-sm rounded-lg px-6 font-bold">Topologi</Link>
        </div>
      </div>

      <main className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* STATS SUMMARY */}
        <div className="stats shadow bg-base-100 w-full mb-10 border border-base-300 overflow-hidden">
          <div className="stat">
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Nodes Tracked</div>
            <div className="stat-value text-primary">{devices.length}</div>
            <div className="stat-desc font-medium">Active Monitoring</div>
          </div>
          <div className="stat border-l border-base-300">
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Network Health</div>
            <div className={`stat-value ${apiData?.nodes.every(n => n.status === 'offline')
                ? 'text-error' // Semua Mati
                : apiData?.nodes.some(n => n.status === 'offline')
                  ? 'text-warning' // Ada beberapa yang mati
                  : 'text-success' // Semua Online
              }`}>
              {apiData?.nodes.every(n => n.status === 'offline')
                ? 'Down'
                : apiData?.nodes.some(n => n.status === 'offline')
                  ? 'Partial Issue'
                  : 'Healthy'}
            </div>
            <div className="stat-desc font-mono text-[10px]">Next update in {countdown}s</div>
          </div>
        </div>

        {/* GRID CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const statusData = apiData?.nodes.find(n => n.target === device.target);
            const isOnline = statusData?.status === 'online';

            return (
              <div key={device.id} className={`card bg-base-100 shadow-xl border ${isOnline ? 'border-base-300' : 'border-error/50'} hover:border-primary transition-all group`}>
                <div className="card-body p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="card-title text-2xl font-black tracking-tight mb-1">{device.name}</h2>
                      <div className="badge badge-ghost font-mono text-[9px] opacity-60">{device.method} • {device.target}</div>
                    </div>
                    <div className={`badge ${isOnline ? 'badge-success' : 'badge-error'} gap-2 font-black py-3 px-4`}>
                      <span className={`h-2 w-2 rounded-full bg-current ${isOnline ? 'animate-pulse' : ''}`}></span>
                      {(statusData?.status || 'checking').toUpperCase()}
                    </div>
                  </div>

                  {/* Latency Info Box */}
                  <div className={`rounded-2xl p-5 flex items-center justify-between border border-base-300 shadow-inner transition-colors ${isOnline ? 'bg-base-200 group-hover:bg-primary/5' : 'bg-error/5'}`}>
                    <div>
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block mb-1">Response</span>
                      <span className={`text-3xl font-black font-mono leading-none ${isOnline ? 'text-primary' : 'text-error'}`}>
                        {statusData?.latency || 'N/A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block mb-1">Check</span>
                      <span className="badge badge-outline badge-xs font-bold uppercase">{device.method === 'ICMP' ? 'Ping' : 'Port'}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center opacity-40">
                    <span className="text-[9px] font-mono italic">
                      Sync: {apiData?.serverTimestamp ? new Date(apiData.serverTimestamp).toLocaleTimeString() : '--:--'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}