'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { formatBytes, formatUptime } from '@/src/lib/utils/format';
import { ProxmoxResource } from '@/src/types/proxmox/resources';
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { ArrowLeft, Server, Activity, Cpu, HardDrive, LayoutTemplate, Network, Search, XCircle, Box, Database, Monitor } from 'lucide-react';

interface ResourceCardProps {
    res: ProxmoxResource;
    workspaceId: string;
    proxmoxId: string;
}
type TabKey = 'virtual' | 'nodes' | 'storage' | 'network';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'virtual', label: 'Virtual Guests', icon: <Box size={14} /> },
    { key: 'nodes', label: 'Physical Nodes', icon: <Server size={14} /> },
    { key: 'storage', label: 'Storages', icon: <Database size={14} /> },
    { key: 'network', label: 'Networks (SDN)', icon: <Network size={14} /> },
];

export default function ResourcesPage({ params }: { params: Promise<{ proxmox_id: string; workspace_id: string }> }) {
    const { proxmox_id: proxmoxId, workspace_id: workspaceId } = use(params);

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
        <div className="min-h-screen z-1 flex flex-col items-center justify-center bg-base-200 lg:pl-72 pt-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.35em] opacity-40 animate-pulse">Syncing Resources...</p>
        </div>
    );

    return (
        <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans lg:pl-72 pt-10 transition-all">
            <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
                {/* ── Header ── */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <Link href={`/workspaces/${workspaceId}/proxmox/${proxmoxId}`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                            <ArrowLeft size={16} />
                        </Link>
                        <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                            <span className="inline-block h-px w-6 bg-primary"></span>
                            Resource Explorer
                        </p>
                    </div>
                
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content mb-2">
                                Cluster <span className="text-primary">Resources</span>
                            </h1>
                            <p className="text-sm opacity-50 font-medium">
                                Real-time infrastructure monitoring across all datacenters
                            </p>
                        </div>
                        <div className="relative w-full xl:w-96">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by Name or ID..."
                                className="input input-lg w-full rounded-2xl bg-base-100 shadow-sm border-base-300 focus:border-primary pl-12 font-bold transition-all placeholder:font-medium placeholder:uppercase placeholder:tracking-widest placeholder:text-xs"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Tab Bar Segmented Control ── */}
                <div className="flex gap-2 bg-base-100 p-2 rounded-2xl border border-base-300 w-full overflow-x-auto mb-8 shadow-sm">
                    {TABS.map(tab => {
                        const count = groupedResources[tab.key].length;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`
                                    flex-1 flex items-center justify-center gap-3 px-6 py-4 text-[10px] sm:text-xs font-black uppercase
                                    tracking-widest rounded-xl whitespace-nowrap transition-all duration-300
                                    ${isActive
                                        ? 'bg-primary text-primary-content shadow-lg shadow-primary/20'
                                        : 'text-base-content/50 hover:text-base-content hover:bg-base-200/50'}
                                `}
                            >
                                <span className={isActive ? 'opacity-100' : 'opacity-50'}>{tab.icon}</span>
                                {tab.label}
                                <span className={`
                                    text-[9px] font-black px-2 py-1 rounded-full ml-1 transition-colors
                                    ${isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-base-300 text-base-content/50'}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {groupedResources.virtual.map(res => (
                                    <ResourceCard key={res.id} res={res} workspaceId={workspaceId} proxmoxId={proxmoxId} />
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No virtual guests found matching the criteria" />
                        )
                )}

                {/* Physical Nodes */}
                {activeTab === 'nodes' && (
                    groupedResources.nodes.length > 0
                        ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {groupedResources.nodes.map(res => (
                                    <NodeCard key={res.id} res={res} />
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No physical nodes found matching the criteria" />
                        )
                )}

                {/* Storages */}
                {activeTab === 'storage' && (
                    groupedResources.storage.length > 0
                        ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {groupedResources.storage.map(res => (
                                    <SimpleResourceCard key={res.id} res={res} icon="storage" />
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No storage units found matching the criteria" />
                        )
                )}

                {/* Networks (SDN) */}
                {activeTab === 'network' && (
                    groupedResources.network.length > 0
                        ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {groupedResources.network.map(res => (
                                    <SimpleResourceCard key={res.id} res={res} icon="network" />
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No networks found matching the criteria" />
                        )
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-24 bg-base-100/50 rounded-[3rem] border-2 border-dashed border-base-300 opacity-60">
        <div className="bg-base-200 p-6 rounded-full mb-6">
            <Search size={48} className="opacity-20 text-primary" />
        </div>
        <h3 className="font-black text-2xl tracking-tight uppercase opacity-40 mb-2">Not Found</h3>
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">{message}</p>
    </div>
);


const ResourceCard = ({ res, workspaceId, proxmoxId }: ResourceCardProps) => {
    const router = useRouter();
    const isRunning = res.status === 'running';
    const memUsage = ((res.mem ?? 0) / (res.maxmem ?? 1)) * 100;
    const cpuUsage = (res.cpu ?? 0) * 100;
    
    let handleCardClick = () => { };

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
            className={`relative overflow-hidden bg-base-100 border rounded-[2rem] p-6 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-xl ${
                isRunning ? 'border-base-300 hover:border-primary/40 hover:shadow-primary/5' : 'border-base-300 opacity-80 hover:border-error/40'
            }`}
        >
            {/* Top Indicator Line */}
            {isRunning && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success/0 via-success/50 to-success/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            )}
            
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4">
                    <div className={`p-3.5 rounded-2xl border transition-colors shadow-inner flex items-center justify-center ${
                         isRunning ? 'bg-success/10 text-success border-success/20' : 'bg-base-200 text-base-content/30 border-base-300'
                    }`}>
                        {res.type === 'qemu' ? <Monitor size={22} /> : <Box size={22} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black bg-base-200 border border-base-300 px-2 py-0.5 rounded-md opacity-60 uppercase tracking-widest">
                                ID: {res.vmid}
                            </span>
                            {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>}
                        </div>
                        <h3 className="font-black text-lg truncate w-32 md:w-36 uppercase tracking-tight leading-none group-hover:text-primary transition-colors">
                            {res.name || 'Unnamed'}
                        </h3>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest mb-1 ${
                        isRunning ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}>
                        {res.status}
                    </span>
                    <span className="text-[8px] font-bold block opacity-40 uppercase tracking-tighter flex items-center gap-1">
                        <Server size={10} /> {res.node}
                    </span>
                </div>
            </div>

            <div className={`space-y-4 mb-6 transition-opacity ${!isRunning && 'opacity-40 mix-blend-luminosity'}`}>
                {/* CPU */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                        <span className="flex items-center gap-1"><Cpu size={12}/> CPU Load</span>
                        <span>{isRunning ? `${cpuUsage.toFixed(1)}%` : '0%'}</span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden border border-base-300/50">
                        <div className={`h-full rounded-full transition-all duration-1000 ${cpuUsage > 80 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${isRunning ? cpuUsage : 0}%` }}></div>
                    </div>
                </div>
                {/* Memory */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                        <span className="flex items-center gap-1"><LayoutTemplate size={12}/> Memory</span>
                        <span>{isRunning ? `${formatBytes(res.mem ?? 0)} / ${formatBytes(res.maxmem ?? 0)}` : '-'}</span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden border border-base-300/50">
                        <div className={`h-full rounded-full transition-all duration-1000 ${memUsage > 85 ? 'bg-error' : 'bg-info'}`} style={{ width: `${isRunning ? memUsage : 0}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-5 border-t border-base-200">
                <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                    {isRunning ? `UP: ${formatUptime(res.uptime ?? 0)}` : 'Offline'}
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost bg-base-200/50 rounded-xl font-black uppercase tracking-widest text-[9px] px-3 border-none shadow-sm h-8 min-h-8">
                        Console
                    </button>
                    <button className={`btn rounded-xl font-black uppercase tracking-widest text-[9px] px-4 shadow-sm h-8 min-h-8 border-none ${
                        isRunning ? 'bg-error/10 text-error hover:bg-error hover:text-white' : 'bg-success text-white hover:bg-success/90'
                    }`}>
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
        <div className={`relative overflow-hidden bg-base-100 border rounded-[2rem] p-6 shadow-sm transition-all group ${
            isOnline ? 'border-base-300 hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl' : 'opacity-80 hover:border-error/30'
        }`}>
            {isOnline && (
                <div className="absolute -top-6 -right-6 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none">
                    <Server size={140} />
                </div>
            )}
            
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex gap-3 items-center">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                         isOnline ? 'bg-success/10 text-success border-success/20' : 'bg-base-300 text-base-content/30 border-base-300'
                    }`}>
                        <Server size={22} />
                    </div>
                    <div>
                        <h3 className="font-black uppercase tracking-tighter text-xl leading-none group-hover:text-primary transition-colors">{res.node}</h3>
                        <div className="badge badge-ghost badge-xs bg-base-200 text-[8px] font-bold uppercase mt-1 opacity-50 tracking-widest border-none">
                            Physical Host
                        </div>
                    </div>
                </div>
                <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-error'}`}></div>
            </div>

            <div className={`grid grid-cols-2 gap-3 mb-6 relative z-10 ${!isOnline && 'opacity-40 mix-blend-luminosity'}`}>
                <div className="bg-base-200/50 border border-base-300/50 p-4 rounded-2xl text-center">
                    <div className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1 flex justify-center items-center gap-1">
                        <Cpu size={12} className="text-primary"/> CPU
                    </div>
                    <div className="text-xl font-black tracking-tighter">{cpuUsage.toFixed(1)}%</div>
                </div>
                <div className="bg-base-200/50 border border-base-300/50 p-4 rounded-2xl text-center">
                    <div className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1 flex justify-center items-center gap-1">
                        <LayoutTemplate size={12} className="text-info"/> RAM
                    </div>
                    <div className="text-xl font-black tracking-tighter">{memUsage.toFixed(0)}%</div>
                </div>
            </div>

            <div className="flex justify-between items-center opacity-40 pt-2 border-t border-base-200 mt-2">
                <span className="text-[9px] font-black uppercase tracking-widest">Uptime</span>
                <span className="text-[10px] font-mono font-bold">
                    {isOnline ? formatUptime(res.uptime ?? 0) : '-'}
                </span>
            </div>
        </div>
    );
};

const SimpleResourceCard = ({ res, icon }: { res: ProxmoxResource; icon: 'storage' | 'network' }) => (
    <div className="bg-base-100 p-6 rounded-[2rem] border border-base-300 flex items-center gap-5 hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           {icon === 'storage' ? <Database size={100} /> : <Network size={100} />}
        </div>
        <div className="bg-base-200 shadow-inner border border-base-300 p-4 rounded-2xl text-primary transition-colors group-hover:bg-primary/10 group-hover:border-primary/20 relative z-10">
            {icon === 'storage' ? <Database size={24} /> : <Network size={24} />}
        </div>
        <div className="overflow-hidden relative z-10">
            <h4 className="font-black text-sm truncate uppercase tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">
                {res.storage || res.sdn || 'Unknown'}
            </h4>
            <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] font-black opacity-40 bg-base-200 px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                    <Server size={10}/> {res.node}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">{res.status || 'Active'}</span>
            </div>
        </div>
    </div>
);