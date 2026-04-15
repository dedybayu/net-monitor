'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { formatBytes, formatUptime } from '@/src/lib/utils/format';
import { ProxmoxResource } from '@/src/types/proxmox/resources';
import { useRouter } from "next/navigation";

interface ResourceCardProps {
    res: ProxmoxResource;
    workspaceId: string; // Tambahkan ini
    proxmoxId: string;
}
type TabKey = 'virtual' | 'nodes' | 'storage' | 'network';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'virtual', label: 'Virtual Guests' },
    { key: 'nodes', label: 'Physical Nodes' },
    { key: 'storage', label: 'Storages' },
    { key: 'network', label: 'Networks (SDN)' },
];

export default function ResourcesPage({ params }: { params: Promise<{ proxmox_id: string; workspace_id: string }> }) {
    const { proxmox_id: proxmoxId, workspace_id: workspaceId, proxmox_id: proxmoxId2 } = use(params);

    const [resources, setResources] = useState<ProxmoxResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('virtual');

    useEffect(() => {
        if (!proxmoxId) return;

        const fetchResources = async (isInitial = false) => {
            if (isInitial) setLoading(true);
            try {
                const res = await fetch(`/api/proxmox/${proxmoxId}/resources`);
                const json: { data: ProxmoxResource[] } = await res.json();
                if (json.data) setResources(json.data);
            } catch (err) {
                console.error('Failed to fetch resources:', err);
            } finally {
                if (isInitial) setLoading(false);
            }
        };

        fetchResources(true);
        const interval = setInterval(() => fetchResources(false), 5000);
        return () => clearInterval(interval);
    }, [proxmoxId]);

    const groupedResources = useMemo(() => {
        const getResourceName = (r: ProxmoxResource) =>
            (r.name || r.storage || r.node || r.sdn || '').toLowerCase();

        const filtered = resources.filter(r => {
            const displayName = getResourceName(r);
            const vmid = r.vmid?.toString() ?? '';
            const searchLower = search.toLowerCase();
            return displayName.includes(searchLower) || vmid.includes(searchLower);
        });

        const sortAz = (a: ProxmoxResource, b: ProxmoxResource) =>
            getResourceName(a).localeCompare(getResourceName(b), undefined, { sensitivity: 'base' });

        return {
            virtual: filtered.filter(r => r.type === 'qemu' || r.type === 'lxc').sort(sortAz),
            nodes: filtered.filter(r => r.type === 'node').sort(sortAz),
            storage: filtered.filter(r => r.type === 'storage').sort(sortAz),
            network: filtered.filter(r => r.type === 'sdn').sort(sortAz),
        };
    }, [resources, search]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center lg:pl-72 bg-base-200">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );

    return (
        <div className="min-h-screen bg-base-200 text-base-content font-sans p-6 pt-20 lg:pl-72">

            {/* ── Header & Search ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">
                        Cluster Resources
                    </h1>
                    <p className="text-[10px] opacity-50 font-bold uppercase tracking-[0.3em] mt-2">
                        Real-time infrastructure monitoring
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="Search Name or ID..."
                        className="input input-bordered w-full rounded-2xl bg-base-100 shadow-sm focus:input-primary transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Tab Bar ── */}
            <div className="flex gap-1 border-b border-base-300 mb-8 overflow-x-auto">
                {TABS.map(tab => {
                    const count = groupedResources[tab.key].length;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase
                                tracking-widest rounded-t-xl border-b-2 whitespace-nowrap transition-all
                                ${isActive
                                    ? 'border-primary text-base-content'
                                    : 'border-transparent text-base-content/40 hover:text-base-content/60 hover:bg-base-300/40'}
                            `}
                        >
                            {tab.label}
                            <span className={`
                                text-[9px] font-black px-1.5 py-0.5 rounded-full
                                ${isActive
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-base-300 text-base-content/40'}
                            `}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ── */}

            {/* Virtual Guests */}
            {activeTab === 'virtual' && (
                groupedResources.virtual.length > 0
                    ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {groupedResources.virtual.map(res => (
                                <ResourceCard key={res.id} res={res} workspaceId={workspaceId} proxmoxId={proxmoxId} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No virtual guests found" />
                    )
            )}

            {/* Physical Nodes */}
            {activeTab === 'nodes' && (
                groupedResources.nodes.length > 0
                    ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {groupedResources.nodes.map(res => (
                                <NodeCard key={res.id} res={res} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No nodes found" />
                    )
            )}

            {/* Storages */}
            {activeTab === 'storage' && (
                groupedResources.storage.length > 0
                    ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {groupedResources.storage.map(res => (
                                <SimpleResourceCard key={res.id} res={res} icon="storage" />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No storage found" />
                    )
            )}

            {/* Networks (SDN) */}
            {activeTab === 'network' && (
                groupedResources.network.length > 0
                    ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {groupedResources.network.map(res => (
                                <SimpleResourceCard key={res.id} res={res} icon="network" />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No networks found" />
                    )
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-24 opacity-30">
        <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] font-black uppercase tracking-widest">{message}</p>
    </div>
);


const ResourceCard = ({ res, workspaceId, proxmoxId }: ResourceCardProps) => {
    const router = useRouter();
    const isRunning = res.status === 'running';
    const memUsage = ((res.mem ?? 0) / (res.maxmem ?? 1)) * 100;
    let handleCardClick = () => { }; // Inisialisasi dengan fungsi kosong

    if (res.type === 'qemu') {
        handleCardClick = () => {
            router.push(`/workspaces/${workspaceId}/proxmox/${proxmoxId}/nodes/${res.node}/vm/${res.vmid}`);
        };
    } else if (res.type === 'lxc') {
        handleCardClick = () => {
            router.push(`/workspaces/${workspaceId}/proxmox/${proxmoxId}/nodes/${res.node}/ct/${res.vmid}`);
        };
    }
    return (
        <div
            onClick={handleCardClick}
            className="bg-base-100 border border-base-300 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                    <div className={`p-3 rounded-2xl transition-colors ${isRunning ? 'bg-success/10 text-success' : 'bg-base-200 text-base-content/30'}`}>
                        {res.type === 'qemu' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black opacity-20 uppercase tracking-tighter">
                                ID: {res.vmid}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
                        </div>
                        <h3 className="font-bold text-sm truncate w-40 uppercase tracking-tight leading-tight">
                            {res.name || 'Unnamed'}
                        </h3>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-black block opacity-30 uppercase tracking-tighter">{res.node}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isRunning ? 'text-success' : 'text-error'}`}>
                        {res.status}
                    </span>
                </div>
            </div>

            <div className={`space-y-4 mb-6 transition-opacity ${!isRunning && 'opacity-40'}`}>
                {/* CPU */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                        <span>CPU Load</span>
                        <span>{isRunning ? `${((res.cpu ?? 0) * 100).toFixed(1)}%` : '0%'}</span>
                    </div>
                    <progress
                        className={`progress h-1.5 w-full ${isRunning ? 'progress-primary' : ''}`}
                        value={isRunning ? (res.cpu ?? 0) * 100 : 0}
                        max="100"
                    />
                </div>
                {/* Memory */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                        <span>Memory</span>
                        <span>{isRunning ? `${formatBytes(res.mem ?? 0)} / ${formatBytes(res.maxmem ?? 0)}` : 'Stopped'}</span>
                    </div>
                    <progress
                        className={`progress h-1.5 w-full ${isRunning ? 'progress-info' : ''}`}
                        value={isRunning ? memUsage : 0}
                        max="100"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-base-200">
                <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                    {isRunning ? `UP: ${formatUptime(res.uptime ?? 0)}` : 'Offline'}
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-xs rounded-lg text-[9px] font-black uppercase tracking-widest">
                        Console
                    </button>
                    <button className={`btn btn-xs rounded-lg text-[9px] font-black uppercase tracking-widest px-3 ${isRunning ? 'btn-error btn-outline border-2' : 'btn-success text-white'}`}>
                        {isRunning ? 'Stop' : 'Start'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const NodeCard = ({ res }: { res: ProxmoxResource }) => {
    const isOnline = res.status === 'online';
    const cpuUsage = (res.cpu || 0) * 100;
    const memUsage = ((res.mem ?? 0) / (res.maxmem ?? 1)) * 100;

    return (
        <div className="bg-base-100 border border-base-300 rounded-[2rem] p-6 shadow-sm hover:border-primary/30 transition-all">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-black uppercase tracking-tighter text-xl leading-none">{res.node}</h3>
                    <div className="badge badge-ghost badge-xs text-[8px] font-bold uppercase mt-2 opacity-50 tracking-widest">
                        Physical Host
                    </div>
                </div>
                <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-error'}`}></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-base-200/50 p-3 rounded-2xl text-center">
                    <div className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-1">CPU Load</div>
                    <div className="text-lg font-black tracking-tighter">{cpuUsage.toFixed(1)}%</div>
                </div>
                <div className="bg-base-200/50 p-3 rounded-2xl text-center">
                    <div className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-1">RAM Use</div>
                    <div className="text-lg font-black tracking-tighter">{memUsage.toFixed(0)}%</div>
                </div>
            </div>

            <div className="flex justify-between items-center opacity-40">
                <span className="text-[9px] font-black uppercase tracking-widest">Uptime</span>
                <span className="text-[9px] font-mono font-bold">
                    {isOnline ? formatUptime(res.uptime ?? 0) : '-'}
                </span>
            </div>
        </div>
    );
};

const SimpleResourceCard = ({ res, icon }: { res: ProxmoxResource; icon: 'storage' | 'network' }) => (
    <div className="bg-base-100 p-4 rounded-2xl border border-base-300 flex items-center gap-4 hover:shadow-sm transition-all group">
        <div className="bg-base-200 p-3 rounded-xl text-primary transition-colors group-hover:bg-primary/10">
            {icon === 'storage' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                        d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zM4 7h16M4 12h16" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            )}
        </div>
        <div className="overflow-hidden">
            <h4 className="font-black text-xs truncate uppercase tracking-tight leading-none mb-1">
                {res.storage || res.sdn || 'Unknown'}
            </h4>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold opacity-30 uppercase">{res.node}</span>
                <span className="text-[14px] opacity-10">•</span>
                <span className="text-[9px] font-black uppercase text-primary/60">{res.status || 'Active'}</span>
            </div>
        </div>
    </div>
);