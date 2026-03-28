'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- TYPES ---
interface NodeStatus {
  id: string;
  name: string;
  target: string;
  method: 'ICMP' | 'TCP';
  status: 'online' | 'offline';
  latency: string;
  lastCheck: string;
}

interface ApiResponse {
  nodes: NodeStatus[];
  serverTimestamp: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MonitorPage() {
  const targetIP = "10.10.168.6";
  const targetPort = "3000";
  const [countdown, setCountdown] = useState(5);

  const { data, error, isLoading } = useSWR<ApiResponse>(
    `/api/status?ip=${targetIP}&port=${targetPort}`, 
    fetcher, 
    { 
      refreshInterval: 5000,
      onSuccess: () => setCountdown(5)
    }
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- LOADING STATE (DaisyUI Loading) ---
  if (isLoading && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-300 gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm font-bold tracking-widest animate-pulse">SYNCING NETWORK...</p>
      </div>
    );
  }

  // --- ERROR STATE (DaisyUI Alert) ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-base-300">
        <div className="alert alert-error shadow-lg max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold">Koneksi Gagal!</h3>
            <div className="text-xs">Tidak dapat terhubung ke API Monitoring.</div>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans">
      
      {/* NAVBAR / HEADER */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl font-black tracking-tighter gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-content">N</div>
            NETMONITOR
          </Link>
        </div>
        <div className="flex-none gap-4">
          <div className="hidden md:flex flex-col items-end">
             <span className="text-[10px] opacity-50 font-bold uppercase tracking-widest">Next UI Refresh</span>
             <progress className="progress progress-primary w-24" value={(5 - countdown) * 20} max="100"></progress>
          </div>
          <Link href="/topology" className="btn btn-outline btn-sm rounded-full">Topologi</Link>
        </div>
      </div>

      <main className="p-6 md:p-10 max-w-7xl mx-auto">
        
        {/* STATS SUMMARY */}
        <div className="stats shadow bg-base-100 w-full mb-10 border border-base-300">
          <div className="stat">
            <div className="stat-title">Device Monitored</div>
            <div className="stat-value text-primary">{data?.nodes.length || 0}</div>
            <div className="stat-desc">Semua target aktif</div>
          </div>
          <div className="stat">
            <div className="stat-title">System Status</div>
            <div className={`stat-value ${data?.nodes.some(n => n.status === 'offline') ? 'text-error' : 'text-success'}`}>
              {data?.nodes.some(n => n.status === 'offline') ? 'Issues Found' : 'All Clear'}
            </div>
            <div className="stat-desc font-mono">Last Sync: {data?.nodes[0]?.lastCheck || 'N/A'}</div>
          </div>
          <div className="stat hidden md:grid">
            <div className="stat-title">Refresh Interval</div>
            <div className="stat-value text-secondary">5.0s</div>
            <div className="stat-desc font-mono text-xs">UI Countdown: {countdown}s</div>
          </div>
        </div>

        {/* GRID KARTU PERANGKAT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.nodes.map((node: NodeStatus) => (
            <div key={node.id} className="card bg-base-100 shadow-xl border border-base-300 hover:border-primary/50 transition-all group">
              <div className="card-body p-6">
                
                {/* STATUS & BADGE */}
                <div className="flex justify-between items-center mb-2">
                  <div className={`badge ${node.method === 'ICMP' ? 'badge-info' : 'badge-secondary'} badge-sm font-bold gap-2`}>
                    {node.method === 'ICMP' ? '⚡ PING' : '🔌 TCP'}
                  </div>
                  <div className={`badge ${node.status === 'online' ? 'badge-success' : 'badge-error'} gap-2 font-black py-3 px-4 shadow-sm`}>
                    <span className="h-2 w-2 rounded-full bg-current animate-pulse"></span>
                    {node.status.toUpperCase()}
                  </div>
                </div>

                {/* DEVICE INFO */}
                <h2 className="card-title text-2xl font-black tracking-tight">{node.name}</h2>
                <div className="badge badge-ghost font-mono text-[10px] opacity-70 mb-4 truncate w-full justify-start">
                  ADDR: {node.target}
                </div>

                {/* LATENCY STATS (DaisyUI Data Display) */}
                <div className="bg-base-200 rounded-2xl p-4 flex items-center justify-between border border-base-300 shadow-inner">
                  <div>
                    <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block">Response Time</span>
                    <span className="text-3xl font-black font-mono text-primary">{node.latency}</span>
                  </div>
                  <div className="text-right">
                     <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block">Class</span>
                     <span className="badge badge-outline badge-xs uppercase font-bold">{node.method === 'ICMP' ? 'Net' : 'Svc'}</span>
                  </div>
                </div>

                <div className="card-actions justify-center mt-4">
                   <p className="text-[9px] opacity-40 font-mono italic">Verified at {node.lastCheck}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER INFO */}
        <div className="divider mt-20 opacity-20"></div>
        <div className="text-center px-4 mb-10">
          <p className="text-xs opacity-40 leading-relaxed max-w-xl mx-auto">
            Sistem ini menggunakan sinkronisasi hybrid. Background worker pada server melakukan probe setiap 10 detik, 
            sedangkan Dashboard melakukan polling setiap 5 detik menggunakan SWR.
          </p>
        </div>
      </main>
    </div>
  );
}