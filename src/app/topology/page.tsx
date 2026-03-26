// app/topology/page.tsx
'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
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

// --- KONFIGURASI AWAL (Di luar komponen agar stabil) ---
const initialNodes: Node[] = [
  {
    id: 'icmp-172.16.10.1',
    type: 'default',
    data: { label: '🌐 Ping Check (172.16.10.1)' },
    position: { x: 250, y: 50 },
    style: { background: '#10b981', color: '#fff', border: '1px solid #059669', borderRadius: '8px', padding: '10px' },
  },
  {
    id: 'tcp-172.16.10.1-5678',
    type: 'default',
    data: { label: '🔌 Port 5678 (172.16.10.1)' },
    position: { x: 250, y: 200 },
    style: { background: '#8b5cf6', color: '#fff', border: '1px solid #7c3aed', borderRadius: '8px', padding: '10px' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-icmp-tcp',
    source: 'icmp-172.16.10.1',
    target: 'tcp-172.16.10.1-5678',
    animated: true,
    style: { stroke: '#64748b' },
  },
];

const STORAGE_KEY = 'net-monitor-topology-v1';

function TopologyEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // --- PERBAIKAN METODE 2: useMemo ---
  // Kita definisikan nodeTypes & edgeTypes dengan useMemo agar warning hilang
  const nodeTypes = useMemo(() => ({
    // Jika nanti ada custom node, tambahkan di sini:
    // monitor: CustomMonitorNode 
  }), []);

  const edgeTypes = useMemo(() => ({}), []);

  // 1. LOAD DATA
  useEffect(() => {
    const savedTopology = localStorage.getItem(STORAGE_KEY);
    if (savedTopology) {
      try {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedTopology);
        if (savedNodes?.length > 0) setNodes(savedNodes);
        if (savedEdges?.length > 0) setEdges(savedEdges);
      } catch (e) {
        console.error('Failed to parse saved topology', e);
      }
    }
  }, [setNodes, setEdges]);

  // 2. SAVE DATA
  const onSave = useCallback(() => {
    const topologyToSave = { nodes, edges };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topologyToSave));
    alert('Posisi topologi berhasil disimpan!');
  }, [nodes, edges]);

  // 3. CONNECT DATA
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#64748b' } }, eds)),
    [setEdges]
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10">
      <header className="flex items-center justify-between pb-6 border-b border-gray-800 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">TOPOLOGY MAP</h1>
          <p className="text-gray-400 mt-1 text-sm">Geser perangkat untuk mengatur tata letak jaringan Anda.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition">
            Kembali ke Dashboard
          </Link>
          <button 
            onClick={onSave}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L5.586 11H3a1 1 0 110-2h2.586l-2.293-2.293a1 1 0 011.414-1.414l3 3zm9.586 0a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L14.414 9H17a1 1 0 110 2h-2.586l2.293 2.293a1 1 0 01-1.414 1.414l-3-3z" />
            </svg>
            Simpan Posisi
          </button>
        </div>
      </header>

      <div className="flex-grow bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden" style={{ height: '70vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes} // Menggunakan useMemo
          edgeTypes={edgeTypes} // Menggunakan useMemo
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-right"
          className="bg-gray-950"
        >
          <Background color="#333" gap={25} size={1} />
          <Controls className="bg-gray-800 border-gray-700 text-white rounded-lg" />
        </ReactFlow>
        
        <div className="absolute bottom-4 left-4 bg-gray-800/80 backdrop-blur-sm text-[10px] text-gray-500 px-3 py-1 rounded-full font-mono border border-gray-700">
          Storage: LocalBrowser ({STORAGE_KEY})
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-gray-700 border-t border-gray-800 pt-6 max-w-xl mx-auto">
        <strong>PETUNJUK:</strong> Klik dan seret perangkat. Klik Simpan Posisi agar tata letak tidak hilang.
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