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
  // Di dalam useTopologyLoader.ts
  const loadTopology = useCallback(async () => {
    // Gunakan guard agar tidak fetch jika workspaceId belum siap
    if (!workspaceId) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/topology`);
      const data = await res.json();

      // Gunakan functional update agar setNodes tidak perlu masuk ke dependency array
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setHasChanges(false);
    } catch (e) {
      console.error('Gagal load:', e);
    }
  }, [workspaceId, setNodes, setEdges]); // Hanya berubah jika ID workspace berubah

  // Gunakan flag untuk mencegah double fetch pada mount yang sangat cepat
  useEffect(() => {
    // Jalankan fetch
    loadTopology();
  }, [workspaceId, loadTopology]); // Hanya jalankan ulang jika workspaceId berubah

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