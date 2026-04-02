import { useEffect, useCallback, useState } from 'react';
import { Node, Edge } from 'reactflow';

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

  // --- Fungsi Load / Refresh ---
  const loadTopology = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/topology`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      // Update state dengan data terbaru dari DB
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setHasChanges(false); // Reset indicator perubahan
    } catch (e) {
      console.error('Gagal load dari DB:', e);
    }
  }, [workspaceId, setNodes, setEdges]);

  // Load awal saat mount
  useEffect(() => {
    loadTopology();
  }, [loadTopology]);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  // --- Fungsi Save ---
  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/topology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, workspaceId }),
      });

      if (response.ok) {
        setNotification({
          message: 'Konfigurasi berhasil disimpan ke database',
          type: 'success',
        });

        // ✅ REFRESH DATA SETELAH SAVE
        // Ini akan mengambil data baru yang sudah punya node_id dari DB
        await loadTopology();
        return true; 
      } else {
        throw new Error();
      }
    } catch {
      setNotification({ message: 'Gagal menyimpan konfigurasi!', type: 'error' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, nodes, edges, loadTopology]); // Tambahkan loadTopology ke dependency

  return { isSaving, hasChanges, setHasChanges, notification, setNotification, save, refresh: loadTopology };
}