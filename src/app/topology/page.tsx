// app/topology/page.tsx
'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';
import { MonitorNode } from './MonitorNode';

// --- 1. DEFINE TYPES & INTERFACES ---
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

// --- 3. MAIN COMPONENT ---
function TopologyEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newNodeData, setNewNodeData] = React.useState({
    label: '',
    target: '',
    method: 'ICMP' as 'ICMP' | 'TCP'
  });

  const { screenToFlowPosition } = useReactFlow();

  // --- WRAPPERS UNTUK INDIKATOR PERUBAHAN ---
  const onNodesChangeWithIndicator = useCallback((changes: NodeChange[]) => {
    // Tandai perubahan jika node digeser (position), dihapus (remove), atau ditambah (add)
    const isActuallyChanging = changes.some((c) =>
      c.type === 'position' || c.type === 'remove'
    );

    if (isActuallyChanging) setHasChanges(true);
    onNodesChange(changes);
  }, [onNodesChange]);

  const onEdgesChangeWithIndicator = useCallback((changes: EdgeChange[]) => {
    // Jika ada perubahan pada edge (tambah/hapus), tandai ada perubahan
    if (changes.length > 0) setHasChanges(true);
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const onConnectWithIndicator = useCallback((params: Connection) => {
    setHasChanges(true);
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);

  // Payload target untuk API Monitoring
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

  // SWR Hook (Real-time Status)
  const { data: apiData } = useSWR<StatusApiResponse, Error, [string, MonitoringTarget[]] | null>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Di dalam function TopologyEditor()
  const [notification, setNotification] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper untuk menutup otomatis setelah 3 detik
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Update Status dari API ke Canvas
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

  // --- LOAD DARI DATABASE ---
  useEffect(() => {
    async function loadTopology() {
      try {
        const res = await fetch(`/api/workspace/${WORKSPACE_ID}/topology`);
        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges);
          setHasChanges(false); // Reset indikator setelah load sukses
        }
      } catch (e) {
        console.error("Gagal load dari DB:", e);
      }
    }
    loadTopology();
  }, [setNodes, setEdges]);

  // --- TAMBAH NODE BARU ---
  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Hitung titik tengah layar (viewport)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // 2. Konversi koordinat layar ke koordinat koordinat kanvas React Flow
    // Ini memastikan node tetap di tengah meski kamu sudah melakukan Zoom atau Pan (geser kanvas)
    const position = screenToFlowPosition({
      x: centerX,
      y: centerY,
    });

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
    setHasChanges(true); // Tandai ada perubahan
    setIsModalOpen(false);
    setNewNodeData({ label: '', target: '', method: 'ICMP' });
  };

  // --- SIMPAN KE DATABASE ---
  const onSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspace/${WORKSPACE_ID}/topology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, workspaceId: WORKSPACE_ID }),
      });

      if (response.ok) {
        setHasChanges(false); // Reset indikator setelah simpan sukses
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-outline btn-sm rounded-lg font-bold"
          >
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
          fitView
        >
          <Background color="#999" gap={30} size={1} />
          <Controls className="bg-base-100 border-base-300 shadow-2xl rounded-2xl overflow-hidden" />
        </ReactFlow>

        {/* POPUP NOTIFIKASI KUSTOM - AUTO ADAPTIVE THEME */}
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300 px-4">
            <div className={`
      alert shadow-lg py-2 px-4 rounded-xl min-w-[180px] w-auto 
      backdrop-blur-md border border-base-content/10
      ${notification.type === 'success'
                ? 'bg-success/70 text-success-content'
                : 'bg-error/70 text-error-content'
              }
    `}>
              <div className="flex items-center gap-2">
                {/* ICON */}
                {notification.type === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}

                {/* TEXT - Menggunakan ukuran kecil & tracking lebar agar elegan */}
                <span className="text-[12px] font-bold uppercase tracking-widest whitespace-nowrap">
                  {notification.message}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SYNC INDICATOR */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-xl">
          <div
            className="radial-progress text-primary text-[10px]"
            style={{ "--value": "70", "--size": "2rem" } as React.CSSProperties}
          >
            SWR
          </div>
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
              <p className="py-2 text-xs opacity-60">Node akan muncul di koordinat 100, 100.</p>

              <form onSubmit={handleAddNode} className="space-y-4 mt-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Label Nama</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Core Switch"
                    className="input input-bordered w-full focus:input-primary"
                    value={newNodeData.label}
                    onChange={(e) => setNewNodeData({ ...newNodeData, label: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Target IP / Host</span></label>
                  <input
                    type="text"
                    placeholder="192.168.1.1 atau 10.10.1.1:8080"
                    className="input input-bordered w-full focus:input-primary"
                    value={newNodeData.target}
                    onChange={(e) => setNewNodeData({ ...newNodeData, target: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Metode</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={newNodeData.method}
                    onChange={(e) => setNewNodeData({ ...newNodeData, method: e.target.value as 'ICMP' | 'TCP' })}
                  >
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
      </div>

      <footer className="bg-base-100 p-2 border-t border-base-300 flex justify-center gap-8 text-[10px] font-bold opacity-50 uppercase tracking-widest">
        <span>🖱️ Drag to Move</span>
        <span>🔗 Connect Dots to Link</span>
        <span>💾 Save to Database</span>
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