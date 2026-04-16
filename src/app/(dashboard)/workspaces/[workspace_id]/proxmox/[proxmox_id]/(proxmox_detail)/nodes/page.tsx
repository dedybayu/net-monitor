'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { formatBytes, formatUptime } from '@/src/lib/utils/format';
import Link from 'next/link';
import { ArrowLeft, Server, Activity, Cpu, HardDrive, LayoutTemplate } from 'lucide-react';

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

export default function NodesPage({ params }: { params: Promise<{ proxmox_id: string, workspace_id: string }> }) {
    const { proxmox_id: proxmoxId, workspace_id: workspaceId } = use(params);

    const [nodes, setNodes] = useState<ProxmoxNode[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNodes = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await fetch(`/api/proxmox/${proxmoxId}/nodes`);
            if (!res.ok) throw new Error('Network response was not ok');
            const json = await res.json();

            if (json.data) {
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

    useEffect(() => {
        if (!proxmoxId) return;

        fetchNodes(true);

        const interval = setInterval(() => {
            fetchNodes(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [proxmoxId, fetchNodes]);

    if (loading) {
        return (
            <div className="min-h-screen z-1 flex flex-col items-center justify-center bg-base-200 lg:pl-64 pt-16">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.35em] opacity-40 animate-pulse">Syncing Nodes...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans lg:pl-64 pt-10 transition-all">
            <div className="p-6 md:p-10 max-w-xxl mx-auto">
                {/* ── HEADER HALAMAN ── */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <Link href={`/workspaces/${workspaceId}/proxmox/${proxmoxId}`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                            <ArrowLeft size={16} />
                        </Link>
                        <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                            <span className="inline-block h-px w-6 bg-primary"></span>
                            Hardware Resources
                        </p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content mb-2">
                            Physical <span className="text-primary">Nodes</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-success/10 px-3 py-1.5 rounded-xl border border-success/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping"></span>
                                <span className="text-[10px] font-black text-success tracking-widest uppercase">Live Sync</span>
                            </div>
                            <div className="bg-base-100 border border-base-300 shadow-sm font-black text-[10px] uppercase tracking-widest py-2 px-4 rounded-xl">
                                Total: {nodes.length} Nodes
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── GRID NODES ── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {nodes.map((node) => {
                        const isOnline = node.status === 'online';

                        const maxmem = node.maxmem || 0;
                        const mem = node.mem || 0;
                        const maxdisk = node.maxdisk || 0;
                        const disk = node.disk || 0;
                        const cpu = node.cpu || 0;
                        const maxcpu = node.maxcpu || 0;
                        const uptime = node.uptime || 0;

                        const memUsage = maxmem > 0 ? (mem / maxmem) * 100 : 0;
                        const diskUsage = maxdisk > 0 ? (disk / maxdisk) * 100 : 0;
                        const cpuUsage = cpu * 100;

                        const statusClasses = isOnline
                            ? "bg-base-100 border-base-300 hover:border-success/40 hover:shadow-xl hover:shadow-success/5 hover:-translate-y-1"
                            : "bg-base-100 border-base-300 opacity-80 hover:border-error/40";

                        return (
                            <Link
                                key={node.id}
                                href={`/workspaces/${workspaceId}/proxmox/${proxmoxId}/nodes/${node.node}`}
                                className={`group block ${!isOnline && 'pointer-events-none'}`}
                            >
                                <div className={`relative overflow-hidden border rounded-[2rem] p-8 transition-all duration-300 ${statusClasses}`}>
                                    {/* Decorative Icon */}
                                    {isOnline && (
                                        <div className="absolute -top-6 -right-6 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none">
                                            <Server size={180} />
                                        </div>
                                    )}

                                    {isOnline && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success/0 via-success/50 to-success/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    )}

                                    <div className="relative z-10">
                                        {/* ── TOP INFO ── */}
                                        <div className="flex justify-between items-start mb-10">
                                            <div className="flex gap-5 items-center">
                                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner ${isOnline ? 'bg-success/10 text-success border-success/20' : 'bg-base-300 text-base-content/30 border-base-300'}`}>
                                                    <Server size={28} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 group-hover:text-primary transition-colors">{node.node}</h3>
                                                    <p className="text-[10px] font-bold tracking-widest uppercase opacity-50 flex items-center gap-1.5 mt-1.5">
                                                        <Activity size={12} className={isOnline ? 'text-success' : 'text-error'} />
                                                        {isOnline ? `Uptime: ${formatUptime(uptime)}` : 'Node Unreachable'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase border ${isOnline ? 'bg-success/10 text-success border-success/20 group-hover:bg-success group-hover:text-white transition-colors' : 'bg-error/10 text-error border-error/20'}`}>
                                                {node.status}
                                            </div>
                                        </div>

                                        {/* ── RESOURCES METRICS ── */}
                                        <div className={`space-y-6 ${!isOnline ? 'opacity-30 mix-blend-luminosity' : ''}`}>
                                            {/* CPU Component */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                                        <Cpu size={14} className="text-primary" /> CPU Usage
                                                    </span>
                                                    <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                                                        {isOnline ? `${cpuUsage.toFixed(1)}% / ${maxcpu} Cores` : '-'}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-base-200 rounded-full h-2.5 overflow-hidden border border-base-300/50">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${cpuUsage > 80 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${isOnline ? cpuUsage : 0}%` }}></div>
                                                </div>
                                            </div>

                                            {/* RAM Component */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                                        <LayoutTemplate size={14} className="text-info" /> Memory
                                                    </span>
                                                    <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                                                        {isOnline ? `${formatBytes(mem)} of ${formatBytes(maxmem)}` : '-'}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-base-200 rounded-full h-2.5 overflow-hidden border border-base-300/50">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${memUsage > 85 ? 'bg-error' : 'bg-info'}`} style={{ width: `${isOnline ? memUsage : 0}%` }}></div>
                                                </div>
                                            </div>

                                            {/* Disk Component */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                                        <HardDrive size={14} className="text-secondary" /> Disk Storage
                                                    </span>
                                                    <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                                                        {isOnline ? `${formatBytes(disk)} / ${formatBytes(maxdisk)}` : '-'}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-base-200 rounded-full h-2.5 overflow-hidden border border-base-300/50">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${diskUsage > 90 ? 'bg-error' : 'bg-secondary'}`} style={{ width: `${isOnline ? diskUsage : 0}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── BOTTOM ACTIONS ── */}
                                        <div className="mt-8 pt-6 border-t border-base-200 flex justify-between items-center">
                                            <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest bg-base-200 px-3 py-1.5 rounded-lg border border-base-300">
                                                ID: {node.id}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    disabled={!isOnline}
                                                    className="btn btn-ghost bg-base-200/50 rounded-xl font-black uppercase tracking-widest text-[10px] px-5 border-none shadow-sm disabled:opacity-20"
                                                >
                                                    Shell
                                                </button>
                                                <button className="btn btn-primary rounded-xl font-black uppercase tracking-widest text-[10px] px-5 shadow-lg shadow-primary/20">
                                                    Details →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}