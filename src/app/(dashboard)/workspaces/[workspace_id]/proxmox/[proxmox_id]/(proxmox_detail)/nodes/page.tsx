'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { formatBytes, formatUptime } from '@/src/lib/utils/format';

interface ProxmoxNode {
    node: string;
    id: string;
    status: string;
    cpu: number;
    maxcpu: number;
    mem: number;
    maxmem: number;
    disk: number;
    maxdisk: number;
    uptime: number;
}

export default function NodesPage({ params }: { params: Promise<{ proxmox_id: string }> }) {
    // Unwrap params untuk Next.js 15
    const { proxmox_id: proxmoxId } = use(params);

    const [nodes, setNodes] = useState<ProxmoxNode[]>([]);
    const [loading, setLoading] = useState(true);

    // Fungsi fetch data yang bisa dipanggil ulang
    const fetchNodes = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await fetch(`/api/proxmox/${proxmoxId}/nodes`);
            if (!res.ok) throw new Error('Network response was not ok');
            const json = await res.json();

            if (json.data) {
                // Urutkan data berdasarkan properti 'node' (nama node) secara alfabetis
                const sortedNodes = [...json.data].sort((a, b) =>
                    a.node.localeCompare(b.node, undefined, { sensitivity: 'base' })
                );
                setNodes(sortedNodes);
            }
        } catch (err) {
            console.error("Fetch nodes error:", err);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [proxmoxId]);

    // Lifecycle untuk initial fetch dan interval
    useEffect(() => {
        if (!proxmoxId) return;

        fetchNodes(true); // Initial load

        const interval = setInterval(() => {
            fetchNodes(false); // Silent refresh
        }, 5000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, [proxmoxId, fetchNodes]);

    if (loading) {
        return (
            <div className="p-8 text-center lg:pl-72 pt-20 flex flex-col items-center justify-center min-h-[50vh]">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-xs font-black uppercase tracking-widest opacity-40">Syncing Nodes...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans pt-20 lg:pl-64">
            {/* Header Halaman */}
            <div className="flex justify-between items-center px-6 mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black uppercase tracking-tight">Nodes List</h1>
                    <div className="flex items-center gap-1.5 bg-success/10 px-2 py-1 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping"></span>
                        <span className="text-[9px] font-black text-success uppercase tracking-tighter">Live</span>
                    </div>
                </div>
                <div className="badge badge-outline border-base-300 gap-2 opacity-50 font-bold py-3">
                    {nodes.length} Nodes detected
                </div>
            </div>

            {/* Grid Nodes */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {nodes.map((node) => {
                    const isOnline = node.status === 'online';

                    // Fallback ke 0 jika node offline karena field ini tidak ada di response API
                    const maxmem = node.maxmem || 0;
                    const mem = node.mem || 0;
                    const maxdisk = node.maxdisk || 0;
                    const disk = node.disk || 0;
                    const cpu = node.cpu || 0;
                    const maxcpu = node.maxcpu || 0;
                    const uptime = node.uptime || 0;

                    // Kalkulasi persentase dengan proteksi division by zero
                    const memUsage = maxmem > 0 ? (mem / maxmem) * 100 : 0;
                    const diskUsage = maxdisk > 0 ? (disk / maxdisk) * 100 : 0;
                    const cpuUsage = cpu * 100;

                    // Styling dinamis
                    const statusClasses = isOnline
                        ? "bg-success/5 border-success/20 shadow-success/5"
                        : "bg-error/5 border-dashed border-error/20 opacity-90 shadow-error/5";

                    return (
                        <div
                            key={node.id}
                            className={`border rounded-[2rem] p-6 transition-all duration-300 ${statusClasses}`}
                        >
                            {/* Info Node & Status */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex gap-4 items-center">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isOnline ? 'bg-success/10 text-success' : 'bg-base-300 text-base-content/30'}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter leading-none">{node.node}</h3>
                                        <p className="text-[10px] font-bold opacity-40 tracking-widest uppercase mt-1">
                                            {isOnline ? `Uptime: ${formatUptime(uptime)}` : 'Node Unreachable'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`badge font-black text-[9px] tracking-widest uppercase py-3 px-4 rounded-xl ${isOnline ? 'badge-success text-white' : 'badge-ghost opacity-50'}`}>
                                    {node.status}
                                </div>
                            </div>

                            {/* Resources Metrics */}
                            <div className={`space-y-5 ${!isOnline ? 'opacity-30 pointer-events-none' : ''}`}>
                                {/* CPU */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                        <span>CPU Usage</span>
                                        <span>{isOnline ? `${cpuUsage.toFixed(1)}% / ${maxcpu} Cores` : '-'}</span>
                                    </div>
                                    <progress
                                        className={`progress w-full h-2.5 ${cpuUsage > 80 ? 'progress-error' : 'progress-primary'}`}
                                        value={isOnline ? cpuUsage : 0}
                                        max="100"
                                    ></progress>
                                </div>

                                {/* RAM */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                        <span>Memory</span>
                                        <span>{isOnline ? `${formatBytes(mem)} of ${formatBytes(maxmem)}` : '-'}</span>
                                    </div>
                                    <progress
                                        className={`progress w-full h-2.5 ${memUsage > 85 ? 'progress-error' : 'progress-info'}`}
                                        value={isOnline ? memUsage : 0}
                                        max="100"
                                    ></progress>
                                </div>

                                {/* Disk */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                        <span>Disk Storage</span>
                                        <span>{isOnline ? `${formatBytes(disk)} / ${formatBytes(maxdisk)}` : '-'}</span>
                                    </div>
                                    <progress
                                        className={`progress w-full h-2.5 ${diskUsage > 90 ? 'progress-error' : 'progress-secondary'}`}
                                        value={isOnline ? diskUsage : 0}
                                        max="100"
                                    ></progress>
                                </div>
                            </div>

                            {/* Bottom Actions */}
                            <div className="mt-8 pt-5 border-t border-base-200 flex justify-between items-center">
                                <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                                    ID: {node.id}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        disabled={!isOnline}
                                        className="btn btn-ghost btn-xs rounded-lg font-black uppercase tracking-widest text-[9px] disabled:opacity-20"
                                    >
                                        Shell
                                    </button>
                                    <button className="btn btn-primary btn-xs rounded-lg font-black uppercase tracking-widest text-[9px] px-4">
                                        Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}