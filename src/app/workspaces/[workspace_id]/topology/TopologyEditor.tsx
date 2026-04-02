'use client';

import React, { useMemo, useCallback, useState } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { MonitorNode } from './MonitorNode';
import { TopologyNode } from './types';
import { useTopologyLoader } from './hooks/useTopologyLoader';
import { useNodeStatus } from './hooks/useNodeStatus';
import { useServiceStatus } from './hooks/useServiceStatus';
import { Notification } from './components/Notification';
import { AddNodeModal } from './components/AddNodeModal';
import { NodeDetailModal } from './components/NodeDetailModal';

const nodeTypes = { monitor: MonitorNode };

export function TopologyEditor(props: { workspaceId: number, workspaceName: string, workspaceDescription: string }) {
  const workspaceIdInt = props.workspaceId;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { isSaving, hasChanges, setHasChanges, notification, setNotification, save } =
    useTopologyLoader({ workspaceId: workspaceIdInt, setNodes, setEdges, nodes, edges });

  useNodeStatus({ nodes, setNodes });

  const { nodeDetail, isDetailLoading, serviceStatusData, revalidateDetail } = useServiceStatus({
    selectedNodeId,
    isDetailOpen,
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const activeNodeData = useMemo(() => {
    const selected = nodes.find(
      (n: TopologyNode) => n.node_id?.toString() === selectedNodeId
    );
    return selected?.data;
  }, [nodes, selectedNodeId]);

  // ── Callbacks ──────────────────────────────────────────────────────────────
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
    // Remove deleted node from canvas immediately, then close modal
    setNodes((nds) => nds.filter((n: TopologyNode) => n.node_id?.toString() !== selectedNodeId));
    setHasChanges(true);
    setIsDetailOpen(false);
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setHasChanges]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-base-200 text-base-content">

      {/* Navbar */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 z-10 shadow-sm">
        <div className="flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-md font-black tracking-tight leading-none uppercase">
                Network Topology - {props.workspaceName}
              </h1>
              <span className="text-[10px] opacity-50">{props.workspaceDescription}</span>
              {hasChanges && (
                <span className="badge badge-warning badge-xs font-bold text-[8px] animate-bounce px-2">
                  BELUM DISIMPAN
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-success badge-xs animate-pulse"></span>
              <span className="text-[9px] opacity-50 font-bold uppercase tracking-widest">
                Live Monitoring Active
              </span>
            </div>
          </div>
        </div>
        <div className="flex-none gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-outline btn-sm rounded-lg font-bold"
          >
            + Tambah Device
          </button>
          <Link href={`/workspaces/${workspaceIdInt}/dashboard`} className="btn btn-ghost btn-sm">
            Dashboard
          </Link>
          <button
            onClick={save}
            disabled={!hasChanges || isSaving}
            className={`btn btn-sm rounded-lg px-6 font-bold ${hasChanges
                ? 'btn-primary shadow-lg shadow-primary/30'
                : 'btn-ghost border-base-300'
              }`}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-grow relative overflow-hidden bg-base-300/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChangeWithIndicator}
          onEdgesChange={onEdgesChangeWithIndicator}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#999" gap={30} size={1} />
          <Controls className="bg-base-100 border-base-300 shadow-2xl rounded-2xl overflow-hidden" />
        </ReactFlow>

        {notification && (
          <Notification message={notification.message} type={notification.type} />
        )}

        {/* Sync indicator */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-xl">
          <div
            className="radial-progress text-primary text-[10px]"
            style={{ '--value': '70', '--size': '2rem' } as React.CSSProperties}
          >
            SWR
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
              Server Sync
            </span>
            <span className="text-xs font-black font-mono">Real-time status</span>
          </div>
        </div>

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
            onServiceAdded={revalidateDetail}
            onNodeDeleted={handleNodeDeleted}
            onClose={() => setIsDetailOpen(false)}
          />
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