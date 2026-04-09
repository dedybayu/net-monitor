"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

    // ✅ Fix params (bisa string | string[])
    // const workspaceId = Array.isArray(params.workspaceId)
    //     ? params.workspaceId[0]
    //     : params.workspaceId;

    const workspace_id = params?.workspace_id as string;
    const workspaceIdInt = parseInt(workspace_id, 10);

    console.log("Workspace ID:", workspaceIdInt);

    const [connections, setConnections] = useState<ProxmoxConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchConnections() {
            try {
                setIsLoading(true);
                setError(null);

                const res = await fetch(`/api/workspaces/${workspaceIdInt}/proxmox`);

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();
                setConnections(data);
            } catch (err) {
                console.error("Error fetching proxmox:", err);
                setError("Gagal mengambil data Proxmox");
            } finally {
                setIsLoading(false);
            }
        }

        if (workspaceIdInt) fetchConnections();
    }, [workspaceIdInt]);

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black uppercase italic">
                        Proxmox Infrastructure
                    </h1>
                    <p className="text-sm opacity-50 font-bold uppercase">
                        Kelola koneksi server Proxmox VE
                    </p>
                </div>

                <Link
                    href={`/workspaces/${workspace_id}/proxmox/new`}
                    className="btn btn-primary btn-sm px-6 font-black uppercase text-[10px] rounded-xl"
                >
                    + Add Server
                </Link>
            </div>

            {/* ERROR STATE */}
            {error && (
                <div className="alert alert-error text-sm font-bold">
                    {error}
                </div>
            )}

            {/* LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {isLoading ? (
                    // Skeleton
                    [1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-48 bg-base-100 rounded-3xl animate-pulse border"
                        ></div>
                    ))
                ) : connections.length > 0 ? (
                    connections.map((conn) => (
                        <div
                            key={conn.proxmox_id}
                            className="bg-base-100 rounded-3xl border p-6 hover:shadow-xl transition"
                        >
                            {/* STATUS */}
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-lg truncate">
                                    {conn.proxmox_connection_name}
                                </h3>

                                <span
                                    className={`badge ${conn.proxmox_is_active
                                            ? "badge-success"
                                            : "badge-error"
                                        }`}
                                >
                                    {conn.proxmox_is_active ? "Active" : "Offline"}
                                </span>
                            </div>

                            {/* INFO */}
                            <p className="text-xs opacity-60 font-mono">
                                {conn.proxmox_username}@{conn.proxmox_host}
                            </p>

                            <p className="text-xs mt-2 opacity-40">
                                Port: {conn.proxmox_port}
                            </p>

                            {conn.proxmox_description && (
                                <p className="text-xs mt-3 opacity-50 line-clamp-2">
                                    {conn.proxmox_description}
                                </p>
                            )}

                            {/* ACTION */}
                            <div className="mt-6 flex justify-end">
                                <Link
                                    href={`/workspaces/${workspaceIdInt}/proxmox/${conn.proxmox_id}`}
                                    className="btn btn-ghost btn-sm text-primary font-bold"
                                >
                                    Open →
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    // EMPTY STATE
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
                        <h3 className="font-black opacity-40">
                            No Proxmox Server
                        </h3>
                        <p className="text-xs opacity-30 mt-2">
                            Tambahkan koneksi pertama Anda
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}