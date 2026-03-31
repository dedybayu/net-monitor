'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Node,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  useReactFlow,
  Node as ReactFlowNode
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';
import { MonitorNode } from './MonitorNode';

// --- 1. TYPES & INTERFACES ---
interface MonitoringTarget {
  ip: string;
  port: number;
}

interface ApiNodeStatus {
  target: string;
  status: 'online' | 'offline';
  latency: string;
  method?: string;
}

interface StatusApiResponse {
  nodes: ApiNodeStatus[];
  timestamp?: string;
}

interface NodeService {
  node_service_id: number;
  node_service_name: string;
  node_service_description: string;
  node_service_ip_address: string;
  node_service_method: string;
  node_service_port: number;
}

interface NodeDetailResponse {
  node_id: number;
  node_label: string;
  node_description: string;
  node_ip_address: string;
  node_method: string;
  node_port: number;
  services: NodeService[];
}

interface TopologyNode extends Node {
  node_id?: number | string; // Tambahkan properti dari DB kamu
}

interface TopologyNode extends ReactFlowNode {
  node_id?: number | string;
}

// --- 2. GLOBAL CONFIG ---
const nodeTypes = { monitor: MonitorNode };
const WORKSPACE_ID = 1;

const fetcher = async ([url, targets]: [string, MonitoringTarget[]]): Promise<StatusApiResponse> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets }),
  });
  if (!res.ok) throw new Error('Gagal fetch status');
  return res.json();
};

const detailFetcher = (url: string) => fetch(url).then(res => res.json());

// --- 3. MAIN COMPONENT ---
function TopologyEditor() {
  // --- States ---
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal Detail States
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [newNodeData, setNewNodeData] = useState({
    label: '',
    target: '',
    method: 'ICMP' as 'ICMP' | 'TCP'
  });

  const { screenToFlowPosition } = useReactFlow();

  // --- Memos ---
  const activeNodeData = useMemo(() => {
    // Cari berdasarkan node_id database
    const selectedNode = nodes.find((n: TopologyNode) =>
      n.node_id?.toString() === selectedNodeId
    );

    return selectedNode?.data;
  }, [nodes, selectedNodeId]);

  const targetPayload = useMemo<MonitoringTarget[]>(() => {
    return nodes.map((node) => {
      const targetStr = node.data.target as string;
      if (targetStr.includes(':')) {
        const [ip, port] = targetStr.split(':');
        return { ip, port: parseInt(port, 10) };
      }
      return { ip: targetStr, port: 0 };
    });
  }, [nodes]);

  // --- SWR Hooks ---
  const { data: apiData } = useSWR<StatusApiResponse, Error, [string, MonitoringTarget[]] | null>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    fetcher,
    { refreshInterval: 5000 }
  );



  const { data: nodeDetail, isLoading: isDetailLoading } = useSWR<NodeDetailResponse>(
    isDetailOpen && selectedNodeId
      ? `/api/workspace/${WORKSPACE_ID}/nodes/${selectedNodeId}`
      : null,
    detailFetcher,
    { refreshInterval: 5000 }
  );


  // Payload untuk monitoring service di dalam modal
  const servicePayload = useMemo<MonitoringTarget[]>(() => {
    if (!nodeDetail?.services) return [];
    return nodeDetail.services.map(svc => ({
      ip: svc.node_service_ip_address,
      port: svc.node_service_port
    }));
  }, [nodeDetail]);
 
  // SWR Hook untuk mendapatkan status real-time service dari api/status
  const { data: serviceStatusData } = useSWR<StatusApiResponse>(
    isDetailOpen && servicePayload.length > 0 ? ['/api/status', servicePayload] : null,
    fetcher,
    { refreshInterval: 5000 }
  );

// --- Callbacks ---
const onNodeClick = useCallback((_: React.MouseEvent, node: TopologyNode) => {
  // TypeScript sekarang tahu node memiliki properti node_id
  const dbId = node.node_id;

  if (!dbId) {
    // Jika node_id tidak ada, berarti ini node baru yang belum di-save ke DB
    setNotification({
      message: 'Simpan perubahan terlebih dahulu untuk melihat detail node baru!',
      type: 'error'
    });
    return;
  }

  // Konversi ke string karena setSelectedNodeId biasanya menggunakan string untuk URL API
  setSelectedNodeId(dbId.toString()); 
  setIsDetailOpen(true);
}, [setNotification]); // Tambahkan setNotification ke dependency array jika perlu

  const onNodesChangeWithIndicator = useCallback((changes: NodeChange[]) => {
    const isActuallyChanging = changes.some((c) =>
      c.type === 'position' || c.type === 'remove'
    );
    if (isActuallyChanging) setHasChanges(true);
    onNodesChange(changes);
  }, [onNodesChange]);

  const onEdgesChangeWithIndicator = useCallback((changes: EdgeChange[]) => {
    if (changes.length > 0) setHasChanges(true);
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const onConnectWithIndicator = useCallback((params: Connection) => {
    setHasChanges(true);
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);

  // --- Effects ---
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (apiData?.nodes) {
      setNodes((nds) =>
        nds.map((node) => {
          const latestStatus = apiData.nodes.find((n) => n.target === node.data.target);
          if (latestStatus) {
            if (node.data.status !== latestStatus.status || node.data.latency !== latestStatus.latency) {
              return {
                ...node,
                data: {
                  ...node.data,
                  status: latestStatus.status,
                  latency: latestStatus.latency,
                },
              };
            }
          }
          return node;
        })
      );
    }
  }, [apiData, setNodes]);

  useEffect(() => {
    async function loadTopology() {
      try {
        const res = await fetch(`/api/workspace/${WORKSPACE_ID}/topology`);
        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges);
          setHasChanges(false);
        }
      } catch (e) {
        console.error("Gagal load dari DB:", e);
      }
    }
    loadTopology();
  }, [setNodes, setEdges]);

  // --- Handlers ---
  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = screenToFlowPosition({ x: centerX, y: centerY });

    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'monitor',
      position,
      data: {
        label: newNodeData.label,
        target: newNodeData.target,
        method: newNodeData.method,
        status: 'offline',
        latency: '...'
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setHasChanges(true);
    setIsModalOpen(false);
    setNewNodeData({ label: '', target: '', method: 'ICMP' });
  };

  const onSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspace/${WORKSPACE_ID}/topology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, workspaceId: WORKSPACE_ID }),
      });

      if (response.ok) {
        setHasChanges(false);
        setNotification({ message: 'Konfigurasi berhasil disimpan ke database', type: 'success' });
      } else {
        throw new Error();
      }
    } catch {
      setNotification({ message: 'Gagal menyimpan konfigurasi!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges]);

  return (
    <div className="flex flex-col h-screen bg-base-200 text-base-content">
      {/* NAVBAR */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 z-10 shadow-sm">
        <div className="flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-md font-black tracking-tight leading-none uppercase">Network Topology</h1>
              {hasChanges && (
                <span className="badge badge-warning badge-xs font-bold text-[8px] animate-bounce px-2">
                  BELUM DISIMPAN
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-success badge-xs animate-pulse"></span>
              <span className="text-[9px] opacity-50 font-bold uppercase tracking-widest">Live Monitoring Active</span>
            </div>
          </div>
        </div>
        <div className="flex-none gap-2">
          <button onClick={() => setIsModalOpen(true)} className="btn btn-outline btn-sm rounded-lg font-bold">
            + Tambah Device
          </button>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">Dashboard</Link>
          <button
            onClick={onSave}
            disabled={hasChanges === false || isSaving}
            className={`btn btn-sm rounded-lg px-6 font-bold ${hasChanges ? 'btn-primary shadow-lg shadow-primary/30' : 'btn-ghost border-base-300'}`}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-grow relative overflow-hidden bg-base-300/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChangeWithIndicator}
          onEdgesChange={onEdgesChangeWithIndicator}
          onConnect={onConnectWithIndicator}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#999" gap={30} size={1} />
          <Controls className="bg-base-100 border-base-300 shadow-2xl rounded-2xl overflow-hidden" />
        </ReactFlow>

        {/* NOTIFICATION POPUP */}
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300 px-4">
            <div className={`alert shadow-lg py-2 px-4 rounded-xl min-w-[180px] w-auto backdrop-blur-md border border-base-content/10 ${notification.type === 'success' ? 'bg-success/70 text-success-content' : 'bg-error/70 text-error-content'}`}>
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                <span className="text-[12px] font-bold uppercase tracking-widest whitespace-nowrap">{notification.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* SYNC INDICATOR */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-xl">
          <div className="radial-progress text-primary text-[10px]" style={{ "--value": "70", "--size": "2rem" } as React.CSSProperties}>SWR</div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Server Sync</span>
            <span className="text-xs font-black font-mono">Real-time status</span>
          </div>
        </div>

        {/* MODAL TAMBAH NODE */}
        {isModalOpen && (
          <div className="modal modal-open">
            <div className="modal-box border border-base-300 shadow-2xl">
              <h3 className="font-black text-lg uppercase tracking-tight">Tambah Perangkat Baru</h3>
              <form onSubmit={handleAddNode} className="space-y-4 mt-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Label Nama</span></label>
                  <input type="text" className="input input-bordered w-full focus:input-primary" value={newNodeData.label} onChange={(e) => setNewNodeData({ ...newNodeData, label: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Target IP / Host</span></label>
                  <input type="text" className="input input-bordered w-full focus:input-primary" value={newNodeData.target} onChange={(e) => setNewNodeData({ ...newNodeData, target: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Metode</span></label>
                  <select className="select select-bordered w-full" value={newNodeData.method} onChange={(e) => setNewNodeData({ ...newNodeData, method: e.target.value as 'ICMP' | 'TCP' })}>
                    <option value="ICMP">ICMP (Ping)</option>
                    <option value="TCP">TCP (Service Port)</option>
                  </select>
                </div>
                <div className="modal-action">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Batal</button>
                  <button type="submit" className="btn btn-primary px-8">Tambahkan ke Kanvas</button>
                </div>
              </form>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={() => setIsModalOpen(false)}></div>
          </div>
        )}

        {/* MODAL DETAIL DEVICE */}
        {isDetailOpen && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl border border-base-300 shadow-2xl bg-base-100 p-0 overflow-hidden">

              {/* Header Modal - Tetap sama namun tambahkan fallback label */}
              <div className={`p-6 ${nodeDetail ? 'bg-base-200' : 'animate-pulse bg-base-300'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-black text-2xl uppercase tracking-tighter">
                        {nodeDetail?.node_label || activeNodeData?.label || 'Loading...'}
                      </h3>
                      <div className={`badge ${activeNodeData?.status === 'online' ? 'badge-success' : 'badge-error'} badge-sm font-black`}>
                        {activeNodeData?.status?.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-xs opacity-60 font-mono mt-1">
                      Target: {nodeDetail?.node_ip_address} {nodeDetail?.node_port !== 0 && `:${nodeDetail?.node_port}`}
                    </p>
                  </div>
                  <button onClick={() => setIsDetailOpen(false)} className="btn btn-sm btn-circle btn-ghost">✕</button>
                </div>
              </div>

              {/* Deskripsi */}
              <div className="px-6 py-4 border-b border-base-300 bg-base-50 ">
                <p className="text-sm opacity-80 italic mb-6">
                  {nodeDetail?.node_description || 'Tidak ada deskripsi tersedia untuk node ini.'}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Latency & Method Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-base-200 rounded-2xl p-4 border border-base-300 shadow-inner flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Node Latency</span>
                    <span className={`text-3xl font-black font-mono ${activeNodeData?.status === 'online' ? 'text-primary' : 'text-error'}`}>
                      {activeNodeData?.latency || '...'}
                    </span>
                  </div>
                  <div className="bg-base-200 rounded-2xl p-4 border border-base-300 shadow-inner flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Check Method</span>
                    <span className="text-xl font-black uppercase">{nodeDetail?.node_method || '---'}</span>
                  </div>
                </div>

                {/* SECTION MONITORING SERVICES */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Active Services Monitoring</span>
                    {nodeDetail?.services && nodeDetail.services.length > 0 && (
                      <span className="badge badge-outline badge-xs animate-pulse text-primary font-bold">LIVE STATUS</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {isDetailLoading || (isDetailOpen && servicePayload.length > 0 && !serviceStatusData) ? (
                      <div className="flex justify-center p-10">
                        <span className="loading loading-dots loading-md opacity-20"></span>
                      </div>
                    ) : nodeDetail?.services && nodeDetail.services.length > 0 ? (
                      // --- TAMPILKAN LIST JIKA ADA SERVICE ---
                      nodeDetail.services.map((svc) => {
                        const targetKey = `${svc.node_service_ip_address}:${svc.node_service_port}`;
                        const liveStatus = serviceStatusData?.nodes.find(n => n.target === targetKey);
                        const isSvcOnline = liveStatus?.status === 'online';

                        return (
                          <div key={svc.node_service_id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 ${isSvcOnline ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'
                            }`}>
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs border ${isSvcOnline ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
                                }`}>
                                {svc.node_service_port || 'ICMP'}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold leading-none">{svc.node_service_name}</h4>
                                <p className="text-[10px] opacity-50 mt-1 uppercase font-bold tracking-widest">{svc.node_service_method}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className={`badge ${isSvcOnline ? 'badge-success' : 'badge-error'} badge-xs font-black px-2 py-2`}>
                                {isSvcOnline ? 'UP' : 'DOWN'}
                              </div>
                              <span className={`text-[10px] font-mono font-bold ${isSvcOnline ? 'text-success' : 'text-error'}`}>
                                {liveStatus?.latency || '---'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // --- KONDISI KETIKA TIDAK ADA SERVICE (EMPTY STATE) ---
                      <div className="flex flex-col items-center justify-center py-12 px-6 bg-base-200/50 rounded-3xl border-2 border-dashed border-base-300 transition-all">
                        <div className="p-4 bg-base-100 rounded-full shadow-sm mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v4M7 7h10" />
                          </svg>
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 text-center">No Services Registered</h4>
                        <p className="text-[10px] opacity-30 text-center mt-2 max-w-[200px] leading-relaxed">
                          This device is currently only monitored via its main target ({nodeDetail?.node_method}).
                        </p>
                        <button className="btn btn-ghost btn-xs mt-4 text-primary font-bold hover:bg-primary/10">
                          + Configure Services
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-base-200/50 border-t border-base-300 flex justify-end">
                <button onClick={() => setIsDetailOpen(false)} className="btn btn-primary rounded-xl px-10 font-bold uppercase text-xs">Close Detail</button>
              </div>
            </div>
            <div className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}></div>
          </div>
        )}


      </div>

      <footer className="bg-base-100 p-2 border-t border-base-300 flex justify-center gap-8 text-[10px] font-bold opacity-50 uppercase tracking-widest">
        <span>🖱️ Drag to Move</span><span>🔗 Connect Dots to Link</span><span>💾 Save to Database</span>
      </footer>
    </div>
  );
}

export default function TopologyPage() {
  return (
    <ReactFlowProvider>
      <TopologyEditor />
    </ReactFlowProvider>
  );
}