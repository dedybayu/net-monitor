"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
// Tambahkan library icon (npm install lucide-react)
import { Server, Plus, ExternalLink, Activity, ShieldCheck, ShieldAlert, Cpu } from "lucide-react";

interface ProxmoxConnection {
    proxmox_id: number;
    proxmox_connection_name: string;
    proxmox_description: string | null;
    proxmox_host: string;
    proxmox_port: number;
    proxmox_username: string;
    proxmox_is_active: boolean;
}

export default function ProxmoxListPage() {
    const params = useParams();
    const workspace_id = params?.workspace_id as string;
    const workspaceIdInt = parseInt(workspace_id, 10);

    const [connections, setConnections] = useState<ProxmoxConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchConnections() {
            try {
                setIsLoading(true);
                const res = await fetch(`/api/workspaces/${workspaceIdInt}/proxmox`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setConnections(data);
            } catch (err) {
                setError("Gagal mengambil data Proxmox");
            } finally {
                setIsLoading(false);
            }
        }
        if (workspaceIdInt) fetchConnections();
    }, [workspaceIdInt]);

    return (
        <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans pt-20 lg:pl-64">
            {/* HEADER SECTION */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Server size={28} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight uppercase italic">
                            Proxmox <span className="text-primary text-stroke">Infrastructure</span>
                        </h1>
                    </div>
                    <p className="text-sm font-bold opacity-60 uppercase tracking-widest pl-12">
                        Node Management & Virtualization Control
                    </p>
                </div>

                <Link
                    href={`/workspaces/${workspace_id}/proxmox/new`}
                    className="btn btn-primary rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Add New Server
                </Link>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* ERROR STATE */}
                {error && (
                    <div className="alert alert-error mb-8 shadow-inner border-none rounded-2xl">
                        <ShieldAlert />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                {/* GRID LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {isLoading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="h-64 bg-base-100/50 rounded-[2rem] animate-pulse border-2 border-base-300"></div>
                        ))
                    ) : connections.length > 0 ? (
                        connections.map((conn) => (
                            <div
                                key={conn.proxmox_id}
                                className="group bg-base-100 rounded-[2rem] border border-base-300 p-8 relative overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                            >
                                {/* Subtle Background Decor */}
                                <div className="absolute -right-4 -top-4 text-base-content/5 group-hover:text-primary/10 transition-colors">
                                    <Cpu size={120} />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`badge gap-2 p-3 font-bold border-none shadow-sm ${
                                            conn.proxmox_is_active ? "bg-success/10 text-success" : "bg-error/10 text-error"
                                        }`}>
                                            <Activity size={12} className={conn.proxmox_is_active ? "animate-pulse" : ""} />
                                            {conn.proxmox_is_active ? "ONLINE" : "OFFLINE"}
                                        </div>
                                        <div className="text-xs font-mono opacity-40">#{conn.proxmox_id}</div>
                                    </div>

                                    <h3 className="font-black text-xl mb-1 group-hover:text-primary transition-colors">
                                        {conn.proxmox_connection_name}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 mb-4 text-xs font-mono opacity-60">
                                        <ShieldCheck size={14} className="text-primary" />
                                        <span>{conn.proxmox_username}@{conn.proxmox_host}</span>
                                    </div>

                                    <div className="divider opacity-50 my-4"></div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter">
                                            <span className="opacity-40">Target Port</span>
                                            <span className="text-primary">{conn.proxmox_port}</span>
                                        </div>
                                        
                                        {conn.proxmox_description && (
                                            <p className="text-xs opacity-50 leading-relaxed line-clamp-2 italic italic-none">
                                                {conn.proxmox_description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-8">
                                        <Link
                                            href={`/workspaces/${workspaceIdInt}/proxmox/${conn.proxmox_id}`}
                                            className="btn btn-block btn-outline btn-primary border-2 rounded-xl group-hover:bg-primary group-hover:text-primary-content transition-all"
                                        >
                                            Manage Node
                                            <ExternalLink size={16} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* EMPTY STATE */
                        <div className="col-span-full py-32 flex flex-col items-center justify-center bg-base-100/30 border-4 border-dashed border-base-300 rounded-[3rem]">
                            <div className="bg-base-200 p-6 rounded-full mb-4">
                                <Server size={48} className="opacity-20" />
                            </div>
                            <h3 className="font-black text-2xl opacity-40 uppercase italic">
                                Zero Nodes Connected
                            </h3>
                            <p className="text-sm opacity-40 max-w-xs text-center mt-2 font-medium uppercase tracking-tight">
                                Mulai monitoring infrastruktur Anda dengan menambahkan server Proxmox pertama.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}