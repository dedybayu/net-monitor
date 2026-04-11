'use client';

import { useEffect, useState, use } from 'react';

interface ProxmoxClusterItem {
  type: 'cluster' | 'node';
  id: string;
  name: string;
  quorate?: number;
  nodes?: number;
  version?: number;
  online?: number;
  ip?: string;
  level?: string;
  local?: number;
  nodeid?: number;
}

export default function ProxmoxDetailPage({ params }: { params: Promise<{ proxmox_id: string }> }) {
  const { proxmox_id: proxmoxId } = use(params);

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
  
  // LOGIKA: Filter node dan Urutkan berdasarkan Abjad (A-Z)
  const nodes = clusterData
    .filter((item) => item.type === 'node')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-base-200/50 text-base-content font-sans p-6 pt-20 lg:pl-72 transition-all">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Cluster: <span className="text-primary">{clusterInfo?.name || 'Unknown'}</span>
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
            <div className="stat-desc font-medium">Registered in cluster</div>
          </div>
        </div>
        
        <div className="stats shadow bg-base-100 border border-base-300">
          <div className="stat">
            <div className="stat-title text-gray-500">Online Nodes</div>
            <div className="stat-value text-success">
              {nodes.filter(n => n.online === 1).length}
            </div>
            <div className="stat-desc font-medium">Currently reachable</div>
          </div>
        </div>
      </div>

      {/* Nodes List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          Nodes Detail
        </h2>
        
        {/* GRID: Menggunakan grid-cols-1 dan md:grid-cols-2 untuk tampilan kartu sampingan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nodes.map((node) => {
            // LOGIKA: Warna background transparan berdasarkan status
            const statusStyle = node.online 
              ? "bg-success/10 border-success/20 hover:bg-success/20" 
              : "bg-error/10 border-error/20 hover:bg-error/20";

            return (
              <div 
                key={node.id} 
                className={`group p-5 rounded-2xl border shadow-sm transition-all flex items-center justify-between gap-4 ${statusStyle}`}
              >
                <div className="flex items-center gap-4">
                  {/* Status Indicator Dot */}
                  <div className="relative flex h-3 w-3">
                    {node.online && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${node.online ? 'bg-success' : 'bg-error'}`}></span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1">{node.name}</h3>
                    <div className="flex flex-col gap-0.5 text-xs opacity-70">
                      <span className="font-mono">{node.ip}</span>
                      <span>ID: {node.nodeid}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {node.local === 1 && (
                    <div className="badge badge-info badge-sm text-[9px] uppercase font-bold px-2">
                      Local
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border ${
                    node.online 
                      ? 'bg-success text-white border-success' 
                      : 'bg-error text-white border-error'
                  }`}>
                    {node.online ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}