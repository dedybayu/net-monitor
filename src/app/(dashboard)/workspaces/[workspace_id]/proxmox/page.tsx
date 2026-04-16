"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Server, Plus, ShieldCheck, ShieldAlert, Cpu } from "lucide-react";

interface ProxmoxConnection {
    proxmox_id: number;
    proxmox_connection_name: string;
    proxmox_description: string | null;
    proxmox_host: string;
    proxmox_port: number;
    proxmox_username: string;
    proxmox_is_active: boolean;
}

const CARD_ACCENTS = [
    "from-primary/8", "from-secondary/8", "from-accent/8",
    "from-info/8", "from-success/8", "from-warning/8",
];

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
        <div className="min-h-screen z-1 bg-base-200 font-sans lg:pl-64 pt-16">
            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                {/* ── PAGE HEADER ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div>
                        <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 mb-2 flex items-center gap-2">
                            <span className="inline-block h-px w-6 bg-primary"></span>
                            Proxmox Infrastructure
                        </p>
                        <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content">
                            Proxmox <span className="text-primary">Servers</span>
                        </h1>
                        <p className="text-sm opacity-50 mt-2 font-medium">
                            Node Management & Virtualization Control
                        </p>
                    </div>

                    <Link
                        href={`/workspaces/${workspace_id}/proxmox/new`}
                        className="btn btn-primary rounded-2xl gap-2 px-6 shadow-lg shadow-primary/20 font-bold"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        New Server
                    </Link>
                </div>

                {/* ERROR STATE */}
                {error && (
                    <div className="alert alert-error mb-8 shadow-inner border-none rounded-2xl">
                        <ShieldAlert />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                {/* GRID LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {isLoading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="h-[280px] bg-base-100/50 rounded-3xl animate-pulse border border-base-300"></div>
                        ))
                    ) : connections.length > 0 ? (
                        connections.map((conn, index) => {
                            const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
                            
                            return (
                                <div
                                    key={conn.proxmox_id}
                                    className={`
                                        group relative bg-gradient-to-br ${accent} to-base-100
                                        rounded-3xl border border-base-300 shadow-md
                                        hover:shadow-xl hover:-translate-y-1 hover:border-primary/40
                                        transition-all duration-300 overflow-hidden
                                    `}
                                >
                                    {/* Decorative circle */}
                                    <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300" />
                                    
                                    {/* Subtle Icon Decor */}
                                    <div className="absolute -bottom-4 -right-4 text-base-content/5 group-hover:text-primary/10 transition-colors">
                                        <Cpu size={120} />
                                    </div>

                                    <div className="relative p-6 flex flex-col h-full z-10">
                                        {/* TOP ROW */}
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="h-12 w-12 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center text-xl font-black text-primary shadow-inner group-hover:scale-110 transition-transform duration-300">
                                                {conn.proxmox_connection_name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-base-200 border border-base-300 ${conn.proxmox_is_active ? 'text-success' : 'text-error'}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${conn.proxmox_is_active ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
                                                {conn.proxmox_is_active ? "ONLINE" : "OFFLINE"}
                                            </span>
                                        </div>

                                        {/* NAME & DESC */}
                                        <div className="flex-1 mb-4">
                                            <h2 className="text-xl font-black tracking-tight leading-tight mb-2 truncate group-hover:text-primary transition-colors">
                                                {conn.proxmox_connection_name}
                                            </h2>
                                            <p className="text-xs opacity-50 leading-relaxed line-clamp-2">
                                                {conn.proxmox_description || "No description provided for this server."}
                                            </p>
                                        </div>

                                        {/* CONNECTION INFO */}
                                        <div className="flex items-center gap-2 mb-6 text-[10px] font-mono opacity-60 bg-base-200/50 p-2.5 border border-base-300 rounded-xl">
                                            <ShieldCheck size={14} className="text-primary" />
                                            <span className="truncate uppercase font-bold">{conn.proxmox_username}@{conn.proxmox_host}:{conn.proxmox_port}</span>
                                        </div>

                                        {/* ACTIONS */}
                                        <div className="flex gap-2 pt-4 border-t border-base-300/60 mt-auto">
                                            <button className="btn btn-ghost btn-sm rounded-xl flex-1 font-bold text-xs hover:bg-base-300">
                                                Details
                                            </button>
                                            <Link
                                                href={`/workspaces/${workspaceIdInt}/proxmox/${conn.proxmox_id}`}
                                                className="btn btn-primary btn-sm rounded-xl flex-1 font-bold text-xs shadow-sm shadow-primary/20"
                                            >
                                                Open →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        /* EMPTY STATE */
                        <div className="col-span-full flex flex-col items-center justify-center bg-base-100 rounded-3xl border-2 border-dashed border-base-300 py-20 px-10 text-center">
                            <div className="text-5xl mb-4 opacity-20">
                                <Server size={64} />
                            </div>
                            <h3 className="font-black text-2xl opacity-40 uppercase tracking-tighter mb-2">
                                Zero Nodes Connected
                            </h3>
                            <p className="text-sm opacity-50 font-medium max-w-sm">
                                Mulai monitoring infrastruktur Anda dengan menambahkan server Proxmox pertama.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}