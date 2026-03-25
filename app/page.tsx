// app/page.tsx
'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';

// --- DEFINE TYPES (Mencegah error 'any') ---
interface NodeStatus {
  id: number;
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

// --- FETCHER FUNCTION ---
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MonitorPage() {
  // Di dalam function MonitorPage()
const targetIP = "172.16.10.1";
const targetPort = "5678";

  const [countdown, setCountdown] = useState(5);

// Masukkan IP dan Port ke dalam URL API
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

  // ... sisa kode UI di bawahnya

  // Tampilan Loading Awal
  if (isLoading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white font-sans">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-t-emerald-500 border-gray-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-medium animate-pulse text-gray-400">Menghubungkan ke Server...</p>
        </div>
      </div>
    );
  }

  // Tampilan Error
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white p-6">
        <div className="bg-red-950 border border-red-500 p-6 rounded-2xl text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-200 mb-2">Gagal Memuat Data</h1>
          <p className="text-red-300 text-sm mb-4">Pastikan backend worker dan API Route `/api/status` sudah berjalan.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // --- TAMPILAN UTAMA (UI AWAL + HYBRID LOGIC) ---
  return (
    <main className="min-h-screen bg-gray-950 p-6 md:p-12 text-gray-100 font-sans">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800 pb-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">NETWORK MONITOR</h1>
          <p className="text-gray-400 mt-1">Metode: Hybrid (Backend Worker + Cache + SWR)</p>
        </div>
        
        {/* STATUS BAR */}
        <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-full border border-gray-700 shadow-inner">
          <div className={`h-3 w-3 rounded-full animate-pulse ${data?.nodes.some(n => n.status === 'offline') ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
          <span className="text-sm font-medium text-gray-300">
            Terakhir Update Server: {data?.nodes[0]?.lastCheck || 'N/A'}
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            (UI Refresh: {countdown}s)
          </span>
        </div>
      </header>

      {/* GRID KARTU PERANGKAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.nodes.map((node: NodeStatus) => (
          <div key={node.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl transition-all hover:border-gray-600 hover:-translate-y-1">
            
            {/* BAGIAN ATAS KARTU: METODE & STATUS CIRCLE */}
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                node.method === 'ICMP' ? 'bg-sky-950 text-sky-200 border border-sky-700' : 'bg-purple-950 text-purple-200 border border-purple-700'
              }`}>
                {node.method} {node.method === 'ICMP' ? '⚡' : '🔌'}
              </span>
              
              <div className="flex items-center gap-2.5">
                <span className={`h-3 w-3 rounded-full ${
                  node.status === 'online' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                }`}></span>
                <span className={`text-sm font-black uppercase tracking-wider ${
                   node.status === 'online' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {node.status}
                </span>
              </div>
            </div>

            {/* BAGIAN TENGAH: NAMA & TARGET */}
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{node.name}</h2>
            <p className="text-sm text-gray-400 font-mono bg-gray-950 px-2 py-1 rounded inline-block mb-5 border border-gray-800">
              Target: {node.target}
            </p>

            {/* BAGIAN BAWAH: INFO LATENCY & TYPE */}
            <div className="border-t border-gray-800 pt-5 mt-2 grid grid-cols-2 gap-4">
              <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 shadow-inner">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Latency</p>
                <p className="text-3xl font-extrabold text-white font-mono tracking-tight">{node.latency}</p>
              </div>
              <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 shadow-inner">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</p>
                <p className="text-xl font-bold text-white mt-1">{node.method === 'ICMP' ? 'Network' : 'Service'}</p>
              </div>
            </div>
            
            <p className="text-[10px] text-zinc-600 font-mono mt-4 text-center">
              Last Worker Check: {node.lastCheck}
            </p>
          </div>
        ))}
      </div>
      
      {/* FOOTER EXPLANATION */}
      <footer className="mt-16 text-center text-xs text-gray-700 border-t border-gray-800 pt-8 max-w-2xl mx-auto leading-relaxed">
        <strong>INFO EFISIENSI:</strong> Halaman ini menggunakan library SWR. Server melakukan pengecekan ke IP tujuan setiap 10 detik di background. Browser kamu hanya mengambil hasil terakhir dari memori server tanpa memicu proses ping baru. Jika kamu memindahkan tab, pengecekan ke API akan berhenti otomatis.
      </footer>
    </main>
  );
}