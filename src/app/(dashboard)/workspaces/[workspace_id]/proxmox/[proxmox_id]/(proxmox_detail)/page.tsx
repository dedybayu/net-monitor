'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';

// Definisi Interface sesuai JSON Proxmox
interface ProxmoxClusterItem {
  type: 'cluster' | 'node';
  id: string;
  name: string;
  // Properti cluster
  quorate?: number;
  nodes?: number;
  version?: number;
  // Properti node
  online?: number;
  ip?: string;
  level?: string;
  local?: number;
  nodeid?: number;
}

export default function ProxmoxDetailPage({ params }: { params: Promise<{ proxmox_id: string, workspace_id: string }> }) {
  const { proxmox_id: proxmoxId, workspace_id: workspaceId } = use(params);

  const [clusterData, setClusterData] = useState<ProxmoxClusterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proxmoxId) return;

    fetch(`/api/proxmox/${proxmoxId}/cluster-status`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch cluster status');
        return res.json();
      })
      .then((json) => {
        if (json.data) setClusterData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [proxmoxId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center lg:pl-72">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="ml-4">Loading cluster data...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen p-6 pt-20 lg:pl-72 text-error">
      Error: {error}
    </div>
  );

  const clusterInfo = clusterData.find((item) => item.type === 'cluster');
  const nodes = clusterData.filter((item) => item.type === 'node');

  return (
    <div className="min-h-screen bg-base-200/50 text-base-content font-sans p-6 pt-20 lg:pl-72 transition-all">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Cluster: <span className="text-primary">{clusterInfo?.name || 'DBSNETWORK'}</span>
          </h1>
          <p className="text-sm opacity-60">Proxmox ID: {proxmoxId} • API Version: {clusterInfo?.version}</p>
        </div>
        <div className={`badge badge-lg gap-2 ${clusterInfo?.quorate ? 'badge-success' : 'badge-error'}`}>
          {clusterInfo?.quorate ? 'Quorate: OK' : 'No Quorum'}
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="stats shadow bg-base-100 border border-base-300">
          <div className="stat">
            <div className="stat-title text-gray-500">Total Nodes</div>
            <div className="stat-value text-primary">{clusterInfo?.nodes || 0}</div>
            <div className="stat-desc font-medium">Nodes in cluster</div>
          </div>
        </div>

        <div className="stats shadow bg-base-100 border border-base-300">
          <div className="stat">
            <div className="stat-title text-gray-500">Online Nodes</div>
            <div className="stat-value text-success">
              {nodes.filter(n => n.online === 1).length}
            </div>
            <div className="stat-desc font-medium">Currently active</div>
          </div>
        </div>
      </div>

      {/* Nodes List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Nodes Detail
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {nodes.sort((a, b) => a.name.localeCompare(b.name)).map((node) => {
            const isOnline = node.online === 1;
            const statusStyle = isOnline
              ? "bg-base-100 border-base-300 hover:border-success/50 hover:shadow-success/5"
              : "bg-base-100 border-base-300 opacity-70 hover:border-error/50";

            return (
              <Link
                href={`/workspaces/${workspaceId}/proxmox/${proxmoxId}/nodes/${node.name}`}
                key={node.id}
                className="block group"
              >
                <div
                  className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${statusStyle}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Indicator */}
                    <div className="relative flex h-3 w-3">
                      {isOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-success' : 'bg-error'}`}></span>
                    </div>

                    <div>
                      <h3 className="font-black uppercase tracking-tight text-lg group-hover:text-primary transition-colors">
                        {node.name}
                      </h3>
                      <div className="flex gap-3 text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">
                        <span>IP: <span className="font-mono">{node.ip || '-'}</span></span>
                        <span>ID: {node.nodeid}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {node.local === 1 && (
                      <div className="badge badge-outline border-base-300 text-[9px] px-2 font-black uppercase tracking-widest opacity-50">
                        Local
                      </div>
                    )}
                    <div className={`px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-colors ${isOnline
                        ? 'bg-success/10 text-success border border-success/20 group-hover:bg-success group-hover:text-white'
                        : 'bg-error/10 text-error border border-error/20'
                      }`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </div>

                    {/* Arrow Icon untuk indikasi klik */}
                    <svg
                      className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
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