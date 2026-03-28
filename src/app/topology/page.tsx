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
// import { get } from 'http';

const STORAGE_KEY = 'net-monitor-topology-v5';
const fetcher = async (url: string, targets: any[]) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets }),
  });
  return res.json();
};

// Mapping tipe node
const nodeTypes = { monitor: MonitorNode };



//Initial Nodes & Edges TODO: Dari Database/API
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
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: '#3b82f6' }
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    animated: true,
    style: { stroke: '#3b82f6' }
  },
];


// Struktur satu buah node dari respon API
interface ApiNodeStatus {
  target: string;
  status: 'online' | 'offline';
  latency: string;
  method?: string;
}

// Struktur lengkap respon dari API /api/status
interface StatusApiResponse {
  nodes: ApiNodeStatus[];
  timestamp?: string;
}

function TopologyEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch data dari API (Identik dengan Dashboard)
  // 1. Tambahkan generic type pada useSWR
  // 1. Siapkan payload target dari nodes yang ada di canvas
  const targetPayload = useMemo(() => {
    return nodes.map((node) => {
      const targetStr = node.data.target;
      if (targetStr.includes(':')) {
        const [ip, port] = targetStr.split(':');
        return { ip, port: parseInt(port) };
      }
      return { ip: targetStr, port: 0 }; // 0 untuk ICMP/Ping
    });
  }, [nodes]);

  // 2. Gunakan useSWR dengan targetPayload sebagai bagian dari key
  // SWR akan auto-revalidate jika targetPayload berubah
  const { data: apiData } = useSWR<StatusApiResponse>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    ([url, payload]: [string, any[]]) => fetcher(url, payload),
    { refreshInterval: 5000 }
  );

  // 2. Sinkronisasi Data API ke dalam Nodes
  useEffect(() => {
    if (apiData?.nodes) {
      setNodes((nds) =>
        nds.map((node) => {
          // 'n' sekarang otomatis bertipe ApiNodeStatus, bukan any lagi
          const latestStatus = apiData.nodes.find((n) => n.target === node.data.target);

          if (latestStatus) {
            return {
              ...node,
              data: {
                ...node.data,
                status: latestStatus.status,
                latency: latestStatus.latency,
              },
            };
          }
          return node;
        })
      );
    }
  }, [apiData, setNodes]);
  // 2. Load Initial State & Storage
  useEffect(() => {

    // Coba load dari localStorage terlebih dahulu
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        // const { nodes: sn, edges: se } = JSON.parse(saved);
        // setNodes(sn);
        // setEdges(se);

        setNodes(getInitialNodes());
        setEdges(getInitialEdges());
      } catch (e) { console.error(e); }
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
    <div className="flex flex-col h-screen bg-base-200">
      {/* NAVBAR */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 z-10 shadow-sm">
        <div className="flex-1 gap-3">
          {/* <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-content font-black shadow-lg shadow-primary/20">T</div> */}
          <div className="flex flex-col">
            <h1 className="text-md font-black tracking-tight leading-none">NETWORK TOPOLOGY</h1>
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
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#999" gap={30} size={1} />
          <Controls className="bg-base-100 border-base-300 shadow-2xl rounded-2xl overflow-hidden" />
        </ReactFlow>

        {/* SYNC INDICATOR (DaisyUI) */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-xl">
          <div className="radial-progress text-primary text-[10px]" style={{ "--value": "70", "--size": "2rem" } as any}>SWR</div>
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