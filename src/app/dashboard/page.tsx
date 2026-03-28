'use client';

import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

// --- TYPES ---
interface ApiNodeStatus {
  target: string;
  status: 'online' | 'offline';
  latency: string;
  method?: string;
  lastCheck?: string;
  name?: string; // Opsional jika backend mengirimkan nama
}

interface StatusApiResponse {
  nodes: ApiNodeStatus[];
  serverTimestamp?: string;
}

// Fetcher khusus POST untuk SWR
const fetcher = async ([url, payload]: [string, any[]]) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets: payload }),
  });
  return res.json();
};

// Data Inisial (Samakan dengan Topologi)
const getInitialDevices = () => [
  { id: '1', name: 'Gateway', target: '172.16.10.30', method: 'ICMP' },
  { id: '2', name: 'Web Server 1', target: '172.16.10.1', method: 'ICMP' },
  { id: '3', name: 'Web Server 2', target: '172.16.10.1:5678', method: 'TCP' },
];

export default function MonitorPage() {
  const [devices] = useState(getInitialDevices());
  const [countdown, setCountdown] = useState(5);

  // 1. Siapkan payload target dari list devices (Mirip logika Topologi)
  const targetPayload = useMemo(() => {
    return devices.map((d) => {
      const targetStr = d.target;
      if (targetStr.includes(':')) {
        const [ip, port] = targetStr.split(':');
        return { ip, port: parseInt(port) };
      }
      return { ip: targetStr, port: 0 }; // 0 untuk ICMP
    });
  }, [devices]);

  // 2. Pemanggilan API menggunakan POST via SWR
  const { data: apiData, error, isLoading } = useSWR<StatusApiResponse>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    fetcher,
    { 
      refreshInterval: 5000,
      onSuccess: () => setCountdown(5) 
    }
  );

  // Timer Countdown UI
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- RENDER LOGIC ---
  if (isLoading && !apiData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-300 gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm font-bold tracking-widest animate-pulse">SYNCING MONITOR...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans">
      {/* NAVBAR */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl font-black tracking-tighter gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-content">N</div>
            NETMONITOR
          </Link>
        </div>
        <div className="flex-none gap-4">
          <div className="hidden md:flex flex-col items-end text-right">
             <span className="text-[10px] opacity-50 font-bold uppercase tracking-widest leading-none mb-1">Live Sync</span>
             <progress className="progress progress-primary w-24 h-1" value={(5 - countdown) * 20} max="100"></progress>
          </div>
          <Link href="/topology" className="btn btn-outline btn-sm rounded-full">Topologi</Link>
        </div>
      </div>

      <main className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* STATS SUMMARY */}
        <div className="stats shadow bg-base-100 w-full mb-10 border border-base-300">
          <div className="stat">
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Total Nodes</div>
            <div className="stat-value text-primary">{devices.length}</div>
          </div>
          <div className="stat">
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Status</div>
            <div className={`stat-value ${apiData?.nodes.some(n => n.status === 'offline') ? 'text-error' : 'text-success'}`}>
              {apiData?.nodes.some(n => n.status === 'offline') ? 'Alert' : 'All Online'}
            </div>
            <div className="stat-desc font-mono text-[10px]">Refreshing in {countdown}s</div>
          </div>
        </div>

        {/* GRID KARTU (CARD) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            // Cari data status dari API yang cocok dengan target device ini
            const statusData = apiData?.nodes.find(n => n.target === device.target);
            
            return (
              <div key={device.id} className="card bg-base-100 shadow-xl border border-base-300 hover:border-primary transition-all overflow-hidden">
                <div className="card-body p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="card-title text-2xl font-black tracking-tight mb-1">{device.name}</h2>
                      <div className="badge badge-ghost font-mono text-[9px] opacity-60 uppercase">{device.method} • {device.target}</div>
                    </div>
                    {/* Status Badge */}
                    <div className={`badge ${statusData?.status === 'online' ? 'badge-success' : 'badge-error'} gap-2 font-black py-3 px-4 shadow-sm`}>
                      <span className="h-2 w-2 rounded-full bg-current animate-pulse"></span>
                      {(statusData?.status || 'offline').toUpperCase()}
                    </div>
                  </div>

                  {/* Latency Display */}
                  <div className="bg-base-200 rounded-2xl p-5 flex items-center justify-between border border-base-300 shadow-inner">
                    <div>
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block mb-1">Response Time</span>
                      <span className="text-3xl font-black font-mono text-primary leading-none">
                        {statusData?.latency || '...'}
                      </span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block mb-1">Class</span>
                       <span className="badge badge-outline badge-xs font-bold uppercase">{device.method === 'ICMP' ? 'Net' : 'App'}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center opacity-40">
                     <span className="text-[9px] font-mono italic">Sync: {apiData?.serverTimestamp ? new Date(apiData.serverTimestamp).toLocaleTimeString() : '-'}</span>
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