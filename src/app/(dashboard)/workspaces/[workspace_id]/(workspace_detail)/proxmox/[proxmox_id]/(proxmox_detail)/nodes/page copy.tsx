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
        <div className=" space-y-6 lg:pl-72">
            {/* Header Halaman */}
            <div className="flex justify-between items-center">
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
                    const memUsage = (node.mem / node.maxmem) * 100;
                    const diskUsage = (node.disk / node.maxdisk) * 100;
                    const cpuUsage = (node.cpu || 0) * 100;

                    // Tentukan kelas warna berdasarkan status
                    const isOnline = node.status === 'online';
                    const statusClasses = isOnline
                        ? "bg-success/5 border-success/20 shadow-success/5"
                        : "bg-error/5 border-error/20 shadow-error/5";

                    return (
                        <div
                            key={node.id}
                            className={`bg-base-100 border border-base-300 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 ${statusClasses}`}
                        >
                            {/* Info Node & Status */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex gap-4 items-center">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${node.status === 'online' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter leading-none">{node.node}</h3>
                                        <p className="text-[10px] font-bold opacity-40 tracking-widest uppercase mt-1">
                                            Uptime: {formatUptime(node.uptime)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`badge font-black text-[9px] tracking-widest uppercase py-3 px-4 rounded-xl ${node.status === 'online' ? 'badge-success text-white' : 'badge-error text-white'}`}>
                                    {node.status}
                                </div>
                            </div>

                            {/* Resources Metrics */}
                            <div className="space-y-5">
                                {/* CPU */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                        <span>CPU Usage</span>
                                        <span>{cpuUsage.toFixed(1)}% / {node.maxcpu} Cores</span>
                                    </div>
                                    <progress
                                        className={`progress w-full h-2.5 ${cpuUsage > 80 ? 'progress-error' : 'progress-primary'}`}
                                        value={cpuUsage}
                                        max="100"
                                    ></progress>
                                </div>

                                {/* RAM */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                        <span>Memory</span>
                                        <span>{formatBytes(node.mem)} of {formatBytes(node.maxmem)}</span>
                                    </div>
                                    <progress
                                        className={`progress w-full h-2.5 ${memUsage > 85 ? 'progress-error' : 'progress-info'}`}
                                        value={memUsage}
                                        max="100"
                                    ></progress>
                                </div>

                                {/* Disk */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                        <span>Disk Storage</span>
                                        <span>{formatBytes(node.disk)} / {formatBytes(node.maxdisk)}</span>
                                    </div>
                                    <progress
                                        className={`progress w-full h-2.5 ${diskUsage > 90 ? 'progress-error' : 'progress-secondary'}`}
                                        value={diskUsage}
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
                                    <button className="btn btn-ghost btn-xs rounded-lg font-black uppercase tracking-widest text-[9px]">Shell</button>
                                    <button className="btn btn-primary btn-xs rounded-lg font-black uppercase tracking-widest text-[9px] px-4">Details</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}