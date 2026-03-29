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

// --- 2. GLOBAL CONFIG (OUTSIDE COMPONENT TO PREVENT RE-RENDERS) ---
const STORAGE_KEY = 'net-monitor-topology-v5';

// Definisi nodeTypes di sini agar referensi memori statis (MENGHILANGKAN WARNING)
const nodeTypes = { monitor: MonitorNode };


const fetcher = async ([url, targets]: [string, MonitoringTarget[]]): Promise<StatusApiResponse> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets }),
  });
  if (!res.ok) throw new Error('Gagal fetch status');
  return res.json();
};

// Initial Data
const getInitialNodes = (): Node[] => [
  {
    id: '1', type: 'monitor', position: { x: 300, y: 100 },
    data: { label: 'Gateway', target: '172.16.10.30', method: 'ICMP', status: 'offline', latency: '...' }
  },
  {
    id: '2', type: 'monitor', position: { x: 100, y: 300 },
    data: { label: 'Web Server 1', target: '172.16.10.1', method: 'ICMP', status: 'offline', latency: '...' }
  },
  {
    id: '3', type: 'monitor', position: { x: 500, y: 300 },
    data: { label: 'Web Server 2', target: '10.10.168.6:3001', method: 'TCP', status: 'offline', latency: '...' }
  },
];

const getInitialEdges = (): Edge[] => [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#3b82f6' } },
];

// --- 3. MAIN COMPONENT ---
function TopologyEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Payload target untuk API
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

  // SWR Hook
  const { data: apiData } = useSWR<StatusApiResponse, Error, [string, MonitoringTarget[]] | null>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Sinkronisasi data API ke Nodes
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

  // Load Storage on Mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { nodes: sn, edges: se } = JSON.parse(saved);
        setNodes(sn);
        setEdges(se);
      } catch (e) { 
        console.error(e); 
        setNodes(getInitialNodes());
        setEdges(getInitialEdges());
      }
    } else {
      setNodes(getInitialNodes());
      setEdges(getInitialEdges());
    }
  }, [setNodes, setEdges]);

  const onSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    alert('✅ Tata letak & konfigurasi topologi disimpan!');
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  return (
    <div className="flex flex-col h-screen bg-base-200 text-base-content">
      {/* NAVBAR */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 z-10 shadow-sm">
        <div className="flex-1">
          <div className="flex flex-col">
            <h1 className="text-md font-black tracking-tight leading-none uppercase">Network Topology</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-success badge-xs animate-pulse"></span>
              <span className="text-[9px] opacity-50 font-bold uppercase tracking-widest">Live Monitoring Active</span>
            </div>
          </div>
        </div>
        <div className="flex-none gap-2">
          <Link href="/dashboard" className="btn btn-ghost btn-sm">Dashboard</Link>
          <button onClick={onSave} className="btn btn-primary btn-sm rounded-lg px-6 font-bold">Simpan</button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-grow relative overflow-hidden bg-base-300/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes} // Menggunakan referensi stabil dari luar
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#999" gap={30} size={1} />
          <Controls className="bg-base-100 border-base-300 shadow-2xl rounded-2xl overflow-hidden" />
        </ReactFlow>

        {/* SYNC INDICATOR */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-xl">
          <div
            className="radial-progress text-primary text-[10px]"
            style={{
              "--value": "70",
              "--size": "2rem"
            } as React.CSSProperties}
          >
            SWR
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Server Sync</span>
            <span className="text-xs font-black font-mono">Real-time status</span>
          </div>
        </div>
      </div>

      {/* FOOTER TIPS */}
      <footer className="bg-base-100 p-2 border-t border-base-300 flex justify-center gap-8 text-[10px] font-bold opacity-50 uppercase tracking-widest">
        <span>🖱️ Drag to Move</span>
        <span>🔗 Connect Dots to Link</span>
        <span>💾 Save to Permanent Storage</span>
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