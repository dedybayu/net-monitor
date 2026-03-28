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

const STORAGE_KEY = 'net-monitor-topology-v4';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mapping tipe node
const nodeTypes = { monitor: MonitorNode };

function TopologyEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch data dari API (Identik dengan Dashboard)
  const { data: apiData } = useSWR('/api/status?ip=10.10.168.6&port=3000', fetcher, {
    refreshInterval: 5000,
  });

  // 1. Sinkronisasi Data API ke dalam Nodes
  useEffect(() => {
    if (apiData?.nodes) {
      setNodes((nds) =>
        nds.map((node) => {
          // Cari data terbaru dari API berdasarkan target IP/Port
          const latestStatus = apiData.nodes.find((n: any) => n.target === node.data.target);
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { nodes: sn, edges: se } = JSON.parse(saved);
        setNodes(sn);
        setEdges(se);
      } catch (e) { console.error(e); }
    } else {
  // Default nodes jika storage kosong
  const initialNodes = [
    { 
      id: '1', type: 'monitor', position: { x: 100, y: 100 }, 
      data: { label: 'Gateway', target: '10.10.168.6', method: 'ICMP', status: 'offline', latency: '...' } 
    },
    { 
      id: '2', type: 'monitor', position: { x: 100, y: 300 }, 
      data: { label: 'Web Server', target: '10.10.168.6:3000', method: 'TCP', status: 'offline', latency: '...' } 
    },
  ];

  // Menambahkan koneksi (garis) dari Node 1 ke Node 2
  const initialEdges = [
    { 
      id: 'e1-2', 
      source: '1', 
      target: '2', 
      animated: true, 
      style: { stroke: '#3b82f6' } // Opsional: Warna biru (Tailwind primary)
    }
  ];

  setNodes(initialNodes);
  setEdges(initialEdges);
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