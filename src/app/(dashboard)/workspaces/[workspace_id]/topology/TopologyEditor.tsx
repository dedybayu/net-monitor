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

const nodeTypes = { monitor: MonitorNode };

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

  const { isSaving, hasChanges, setHasChanges, notification, setNotification, save, refresh } =
    useTopologyLoader({ workspaceId: workspaceIdInt, setNodes, setEdges, nodes, edges });

  useNodeStatus({ nodes, setNodes });

  const { nodeDetail, isDetailLoading, serviceStatusData, revalidateDetail } = useServiceStatus({
    selectedNodeId,
    isDetailOpen,
  });

  const activeNodeData = useMemo(() => {
    const selected = nodes.find(
      (n: TopologyNode) => n.node_id?.toString() === selectedNodeId
    );
    return selected?.data;
  }, [nodes, selectedNodeId]);

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

  const handleSave = useCallback(async () => {
    await save();
  }, [save]);

  const handleRefreshAll = useCallback(async () => {
    await refresh();
    await revalidateDetail();
  }, [refresh, revalidateDetail]);

  const REFRESH_INTERVAL = 3;
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressValue = (secondsLeft / REFRESH_INTERVAL) * 100;

  return (
    /*
      Menggunakan fixed positioning yang memperhitungkan:
      - top-16   : tinggi top navbar
      - left-0   : mobile (sidebar tersembunyi)
      - lg:left-64: desktop (sidebar lebar 64)
      - right-0 + bottom-0: penuh ke kanan dan bawah
      Ini menghindari masalah h-screen yang overflow saat ada offset.
    */
    <div className="fixed top-16 left-0 lg:left-64 right-0 bottom-0 flex flex-col bg-base-200 text-base-content overflow-hidden">

      {/* Canvas Area */}
      <div className="flex-grow relative bg-base-300/50">

        {/* ── FLOATING NAVBAR ─────────────────────────────────────────── */}
        <div className="absolute top-4 left-4 right-4 z-[10] flex justify-between items-center pointer-events-none">
          {/* Left Side */}
          <div className="flex items-center gap-1 bg-base-100/90 backdrop-blur-md p-3 px-5 rounded-2xl border border-base-300 shadow-2xl pointer-events-auto">
            <Link
              href="/workspaces"
              className="btn btn-ghost btn-xs btn-circle hover:bg-base-300 transition-colors"
              title="Back to Workspaces"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <div className="w-[1px] h-4 bg-base-300 mx-1"></div>

            <Link href="" className="btn btn-ghost btn-xs p-0 min-h-0 h-auto hover:bg-transparent">
              <div className="h-6 w-6 bg-primary rounded-lg flex items-center justify-center text-primary-content text-[10px] font-black">
                {props.workspaceName.charAt(0)}
              </div>
            </Link>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-black tracking-tight uppercase leading-none">
                  {props.workspaceName}
                </h1>
                {hasChanges && (
                  <span className="badge badge-warning badge-xs font-bold text-[8px] px-2 animate-pulse">
                    UNSAVED
                  </span>
                )}
              </div>
              <span className="text-[9px] opacity-50 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                <span className="badge badge-success h-1.5 w-1.5 p-0 animate-pulse"></span>
                Live
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
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`btn btn-sm rounded-xl px-6 font-bold text-xs transition-all ${
                hasChanges ? 'btn-primary shadow-lg shadow-primary/30' : 'btn-disabled opacity-40'
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
          <Controls
            showInteractive={false}
            className="bg-base-100 border-base-300 shadow-xl rounded-xl overflow-hidden !bottom-20 !left-4 !top-auto"
          />
        </ReactFlow>

        {/* ── SYNC INDICATOR ──────────────────────────────────────────── */}
        <div className="absolute bottom-10 left-6 z-10 flex items-center gap-3 bg-base-100/80 backdrop-blur-md p-2 px-4 rounded-2xl border border-base-300 shadow-lg">
          <div
            className="radial-progress text-primary transition-all duration-1000 ease-linear"
            style={{
              '--value': progressValue,
              '--size': '1.6rem',
              '--thickness': '2px',
              fontSize: '8px',
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