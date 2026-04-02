import { useEffect, useCallback, useState } from 'react';
import { Node, Edge } from 'reactflow';

// const WORKSPACE_ID = 1;

interface UseTopologyLoaderProps {
  workspaceId: number;
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  nodes: Node[];
  edges: Edge[];
}

export function useTopologyLoader({
  workspaceId,
  setNodes,
  setEdges,
  nodes,
  edges,
}: UseTopologyLoaderProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Load topology from DB on mount
  useEffect(() => {
    async function loadTopology() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/topology`);
        const data = await res.json();
        if (data.nodes?.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges);
          setHasChanges(false);
        }
      } catch (e) {
        console.error('Gagal load dari DB:', e);
      }
    }
    loadTopology();
  }, [ workspaceId, setNodes, setEdges]);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/topology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, workspaceId: workspaceId }),
      });

      if (response.ok) {
        setHasChanges(false);
        setNotification({
          message: 'Konfigurasi berhasil disimpan ke database',
          type: 'success',
        });
      } else {
        throw new Error();
      }
    } catch {
      setNotification({ message: 'Gagal menyimpan konfigurasi!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [ workspaceId, setHasChanges, setNotification, nodes, edges]);

  return { isSaving, hasChanges, setHasChanges, notification, setNotification, save };
}