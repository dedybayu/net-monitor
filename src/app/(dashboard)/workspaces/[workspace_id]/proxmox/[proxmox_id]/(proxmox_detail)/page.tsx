'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { ArrowLeft, Server, Activity, ShieldCheck, ShieldAlert, Cpu, Network, CheckCircle, XCircle, HardDrive } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 lg:pl-72 z-1 relative">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="mt-4 text-[10px] font-black tracking-[0.35em] uppercase opacity-40 animate-pulse">Syncing Cluster...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 lg:pl-72 z-1 text-center p-6 text-error">
      <ShieldAlert size={64} className="opacity-20 mb-4" />
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Connection Error</h2>
      <p className="opacity-60">{error}</p>
    </div>
  );

  const clusterInfo = clusterData.find((item) => item.type === 'cluster');
  const nodes = clusterData.filter((item) => item.type === 'node');
  const onlineNodesCount = nodes.filter(n => n.online === 1).length;

  return (
    <div className="min-h-screen bg-base-200 z-1 font-sans lg:pl-72 pt-6 transition-all">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        {/* ── HEADER ── */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <Link href={`/workspaces/${workspaceId}/proxmox`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                        <ArrowLeft size={16} />
                    </Link>
                    <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                        <span className="inline-block h-px w-6 bg-primary"></span>
                        Overview
                    </p>
                </div>
                <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content mb-3">
                    Cluster <span className="text-primary">{clusterInfo?.name || 'DBSNETWORK'}</span>
                </h1>
                <div className="flex items-center gap-4 text-xs font-bold opacity-60 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 bg-base-300 px-3 py-1.5 rounded-lg border border-base-content/10">
                        <Network size={14} />
                        ID: {proxmoxId}
                    </span>
                    <span className="flex items-center gap-1.5 bg-base-300 px-3 py-1.5 rounded-lg border border-base-content/10">
                        API v{clusterInfo?.version || '?'}
                    </span>
                </div>
            </div>
            
            <div className={`badge badge-lg gap-2 py-4 px-5 rounded-2xl font-black tracking-widest text-[10px] uppercase shadow-sm border-none ${clusterInfo?.quorate ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
               {clusterInfo?.quorate ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
               {clusterInfo?.quorate ? 'Quorate: OK' : 'No Quorum'}
            </div>
        </div>

        {/* ── STATS DASHBOARD ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-8 flex items-center gap-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Server size={120} />
            </div>
            <div className="bg-primary/10 text-primary p-4 rounded-2xl z-10">
              <Server size={32} />
            </div>
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Nodes</p>
              <p className="text-4xl font-black text-primary">{clusterInfo?.nodes || 0}</p>
            </div>
          </div>

          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-8 flex items-center gap-6 relative overflow-hidden group hover:border-success/30 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={120} />
            </div>
            <div className="bg-success/10 text-success p-4 rounded-2xl z-10">
              <CheckCircle size={32} />
            </div>
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Online</p>
              <p className="text-4xl font-black text-success">{onlineNodesCount}</p>
            </div>
          </div>
          
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-8 flex items-center gap-6 relative overflow-hidden group hover:border-error/30 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <HardDrive size={120} />
            </div>
            <div className="bg-error/10 text-error p-4 rounded-2xl z-10">
              <XCircle size={32} />
            </div>
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Offline</p>
              <p className="text-4xl font-black text-error">{(clusterInfo?.nodes || 0) - onlineNodesCount}</p>
            </div>
          </div>
        </div>

        {/* ── NODES LIST ── */}
        <div className="space-y-6">
          <div className="flex items-end justify-between border-b border-base-300 pb-4">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Cpu size={24} className="text-primary" />
                  Nodes Structure
              </h2>
              <span className="text-xs font-black opacity-30 tabular-nums uppercase tracking-widest">
                  {nodes.length} Environments
              </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {nodes.sort((a, b) => a.name.localeCompare(b.name)).map((node) => {
              const isOnline = node.online === 1;
              
              return (
                <Link
                  href={`/workspaces/${workspaceId}/proxmox/${proxmoxId}/nodes/${node.name}`}
                  key={node.id}
                  className="block group"
                >
                  <div
                    className={`p-6 rounded-[2rem] border border-transparent shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden bg-base-100 ${
                        isOnline ? 'hover:border-success/40 hover:shadow-success/10 hover:-translate-y-1' : 'opacity-80 hover:border-error/40'
                    }`}
                  >
                    {/* Progress Bar simulasi (visual doang klo node local/dsbg) */}
                    {isOnline && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success/0 via-success/50 to-success/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                    
                    <div className="flex items-center gap-5">
                      {/* Status Indicator */}
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                           isOnline ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'
                      }`}>
                          {isOnline ? <Activity size={20} /> : <XCircle size={20} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black uppercase tracking-tight text-xl group-hover:text-primary transition-colors leading-none">
                            {node.name}
                          </h3>
                          {node.local === 1 && (
                            <div className="badge badge-sm border-none bg-primary/10 text-primary font-black uppercase tracking-widest text-[8px] px-1.5 py-2">
                              LOCAL
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1.5">
                          <span className="flex items-center gap-1"><Network size={12}/> {node.ip || 'No IP'}</span>
                          <span className="flex items-center gap-1"><Cpu size={12}/> ID: {node.nodeid}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                           isOnline
                             ? 'bg-success/10 text-success border border-success/0 group-hover:bg-success group-hover:text-white'
                             : 'bg-error/10 text-error border border-error/20'
                        }`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </div>

                      {/* Arrow Icon untuk indikasi klik */}
                      <div className="h-8 w-8 rounded-full bg-base-200 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary group-hover:bg-primary group-hover:text-white">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}