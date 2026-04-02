'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Node,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';

import { MonitorNode } from './MonitorNode';
import { TopologyNode } from './types';
import { useTopologyLoader } from './hooks/useTopologyLoader';
import { useNodeStatus } from './hooks/useNodeStatus';
import { useServiceStatus } from './hooks/useServiceStatus';
import { Notification } from './components/Notification';
import { AddNodeModal } from './components/AddNodeModal';
import { NodeDetailModal } from './components/NodeDetailModal';

// ✅ Di luar semua komponen — tidak pernah re-create
const nodeTypes = { monitor: MonitorNode };

// ── Inner component (butuh useReactFlow, harus di dalam Provider) ──────────
function TopologyEditorInner(props: {
  workspaceId: number;
  workspaceName: string;
  workspaceDescription: string;
}) {
  const workspaceIdInt = props.workspaceId;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { isSaving, hasChanges, setHasChanges, notification, setNotification, save } =
    useTopologyLoader({ workspaceId: workspaceIdInt, setNodes, setEdges, nodes, edges });

  useNodeStatus({ nodes, setNodes });

  const { nodeDetail, isDetailLoading, serviceStatusData, revalidateDetail } = useServiceStatus({
    selectedNodeId,
    isDetailOpen,
  });

  // ── Derived data ─────────────────────────────────────────────────────────
  const activeNodeData = useMemo(() => {
    const selected = nodes.find(
      (n: TopologyNode) => n.node_id?.toString() === selectedNodeId
    );
    return selected?.data;
  }, [nodes, selectedNodeId]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: TopologyNode) => {
      const dbId = node.node_id;
      if (!dbId) {
        setNotification({
          message: 'Simpan perubahan terlebih dahulu untuk melihat detail node baru!',
          type: 'error',
        });
        return;
      }
      setSelectedNodeId(dbId.toString());
      setIsDetailOpen(true);
    },
    [setNotification]
  );

  const onNodesChangeWithIndicator = useCallback(
    (changes: NodeChange[]) => {
      const isActualChange = changes.some(
        (c) => c.type === 'position' || c.type === 'remove'
      );
      if (isActualChange) setHasChanges(true);
      onNodesChange(changes);
    },
    [onNodesChange, setHasChanges]
  );

  const onEdgesChangeWithIndicator = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.length > 0) setHasChanges(true);
      onEdgesChange(changes);
    },
    [onEdgesChange, setHasChanges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setHasChanges(true);
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges, setHasChanges]
  );

  const handleAddNode = useCallback(
    (newNode: Node) => {
      setNodes((nds) => nds.concat(newNode));
      setHasChanges(true);
      setIsAddModalOpen(false);
    },
    [setNodes, setHasChanges]
  );

  const handleNodeDeleted = useCallback(() => {
    setNodes((nds) => nds.filter((n: TopologyNode) => n.node_id?.toString() !== selectedNodeId));
    setHasChanges(true);
    setIsDetailOpen(false);
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setHasChanges]);

  // Tambahkan fungsi refresh di tingkat komponen utama
  const loadTopology = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceIdInt}/topology`);
      const data = await res.json();
      if (data.nodes) {
        setNodes(data.nodes);
        setEdges(data.edges || []);
        setHasChanges(false);
      }
    } catch (e) {
      console.error('Gagal refresh topology:', e);
    }
  }, [workspaceIdInt, setNodes, setEdges, setHasChanges]);

  // Trigger load pertama kali
  useEffect(() => {
    loadTopology();
  }, [loadTopology]);

  // Handler untuk Save dan Reload
  const handleSave = async () => {
    const result = await save(); // Fungsi save dari hook useTopologyLoader

    // Karena save() mengembalikan promise (berdasarkan update hook sebelumnya)
    // Kita panggil loadTopology untuk sinkronisasi node_id database
    await loadTopology();
  };

  const handleRefreshAll = useCallback(async () => {
    await loadTopology();    // Fungsi refresh database yang kita buat sebelumnya
    await revalidateDetail(); // Fungsi SWR untuk modal detail
  }, [loadTopology, revalidateDetail]);

  // Di dalam TopologyEditorInner
  const REFRESH_INTERVAL = 3;
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressValue = (secondsLeft / REFRESH_INTERVAL) * 100;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-base-200 text-base-content overflow-hidden ">

      {/* Canvas Area (Sekarang membungkus seluruh layar) */}
      <div className="flex-grow relative bg-base-300/50">

        {/* ── FLOATING NAVBAR (Pindah ke dalam Canvas) ────────────────── */}
        <div className="absolute top-4 left-4 right-4 z-[10] flex justify-between items-center pointer-events-none">
          {/* Left Side: Info & Status */}
          <div className="flex items-center gap-3 bg-base-100/90 backdrop-blur-md p-3 px-5 rounded-2xl border border-base-300 shadow-2xl pointer-events-auto">
            <Link href="" className="btn btn-ghost btn-xs p-0 min-h-0 h-auto hover:bg-transparent">
              <div className="h-6 w-6 bg-primary rounded-lg flex items-center justify-center text-primary-content text-[10px] font-black">N</div>
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-black tracking-tight uppercase leading-none">
                  {props.workspaceName}
                </h1>
                {hasChanges && (
                  <span className="badge badge-warning badge-xs font-bold text-[8px] px-2">
                    UNSAVED
                  </span>
                )}
              </div>
              <span className="text-[9px] opacity-50 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                <span className="badge badge-success badge-[4px] p-0 h-1.5 w-1.5 animate-pulse"></span>
                Live Monitoring
              </span>
            </div>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-2 pointer-events-auto bg-base-100/90 backdrop-blur-md p-1.5 rounded-2xl border border-base-300 shadow-2xl">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-ghost btn-sm rounded-xl font-bold text-xs"
            >
              + Device
            </button>
            <div className="divider divider-horizontal m-0 h-6"></div>
            {/* <Link href={`/workspaces/${workspaceIdInt}/dashboard`} className="btn btn-ghost btn-sm rounded-xl text-xs">
              Dashboard
            </Link> */}
            <button
              onClick={handleSave} // Gunakan handler baru
              disabled={!hasChanges || isSaving}
              className={`btn btn-sm rounded-xl px-6 font-bold text-xs transition-all ${hasChanges
                  ? 'btn-primary shadow-lg shadow-primary/30'
                  : 'btn-disabled opacity-40'
                }`}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* ── REACT FLOW CANVAS ───────────────────────────────────────── */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChangeWithIndicator}
          onEdgesChange={onEdgesChangeWithIndicator}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          onlyRenderVisibleElements={true}
        >
          <Background color="#999" gap={30} size={1} />
          {/* Custom position untuk Controls agar tidak tabrakan dengan navbar */}
          <Controls
            showInteractive={false}
            className="bg-base-100 border-base-300 shadow-xl rounded-xl overflow-hidden !bottom-20 !left-4 !top-auto"
          />
        </ReactFlow>

        {/* ── SYNC INDICATOR (Sinkron dengan Detik) ───────────────────── */}
        <div className="absolute bottom-10 left-6 z-10 flex items-center gap-3 bg-base-100/80 backdrop-blur-md p-2 px-4 rounded-2xl border border-base-300 shadow-lg">
          <div
            className="radial-progress text-primary transition-all duration-1000 ease-linear"
            style={{
              '--value': progressValue,
              '--size': '1.6rem',
              '--thickness': '2px',
              fontSize: '8px'
            } as React.CSSProperties}
          >
            <span className="font-bold">{secondsLeft}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black opacity-40 uppercase tracking-[0.2em]">Live Sync</span>
            <span className="text-[10px] font-bold font-mono">
              {secondsLeft === REFRESH_INTERVAL ? 'FETCHING...' : `IN ${secondsLeft}s`}
            </span>
          </div>
        </div>

        {notification && (
          <Notification message={notification.message} type={notification.type} />
        )}

        {/* Modals tetap sama */}
        {isAddModalOpen && (
          <AddNodeModal
            onAdd={handleAddNode}
            onClose={() => setIsAddModalOpen(false)}
            screenToFlowPosition={screenToFlowPosition}
          />
        )}

        {isDetailOpen && (
          <NodeDetailModal
            workspaceId={workspaceIdInt}
            selectedNodeId={selectedNodeId}
            activeNodeData={activeNodeData}
            nodeDetail={nodeDetail}
            isDetailLoading={isDetailLoading}
            serviceStatusData={serviceStatusData}
            onServiceAdded={handleRefreshAll}
            onNodeDeleted={handleNodeDeleted}
            onClose={() => setIsDetailOpen(false)}
          />
        )}
      </div>

      {/* Mini Footer */}
      <footer className="bg-base-100 p-1.5 border-t border-base-300 flex justify-center gap-6 text-[8px] font-bold opacity-40 uppercase tracking-widest z-20">
        <span>🖱️ Drag to Move</span>
        <span>🔗 Connect Dots</span>
        <span>💾 Save Configuration</span>
      </footer>
    </div>
  );
}

// ── Outer component (exported) — Provider stabil di sini ──────────────────
export function TopologyEditor(props: {
  workspaceId: number;
  workspaceName: string;
  workspaceDescription: string;
}) {
  return (
    <ReactFlowProvider>
      <TopologyEditorInner {...props} />
    </ReactFlowProvider>
  );
}