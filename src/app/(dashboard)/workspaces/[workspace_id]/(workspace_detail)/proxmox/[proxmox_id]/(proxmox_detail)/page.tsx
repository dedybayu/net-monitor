'use client';

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

        <div className="grid grid-cols-2 gap-4">
          {nodes.map((node) => {
            const statusStyle = node.online 
              ? "bg-success/10 border-success/20 hover:bg-success/20" 
              : "bg-error/10 border-error/20 hover:bg-error/20";
            return (
              <div
                key={node.id}
                className={`group p-5 bg-base-100 rounded-xl border border-base-300 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4  ${statusStyle}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${node.online ? 'bg-success animate-pulse' : 'bg-error'}`}></div>
                  <div>
                    <h3 className="font-bold text-lg">{node.name}</h3>
                    <div className="flex gap-3 text-xs opacity-70">
                      <span>IP: <span className="font-mono">{node.ip}</span></span>
                      <span>ID: {node.nodeid}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {node.local === 1 && (
                    <div className="badge badge-outline badge-info text-[10px] px-1 uppercase tracking-wider">
                      Local Node
                    </div>
                  )}
                  <div className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest ${node.online
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-error/10 text-error border border-error/20'
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