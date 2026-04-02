import { useMemo } from 'react';
import useSWR from 'swr';
import { MonitoringTarget, NodeDetailResponse, StatusApiResponse } from '../types';
import { statusFetcher, detailFetcher } from '../fetchers';
import { useParams } from 'next/navigation'; // Tambahkan ini


// const WORKSPACE_ID = 1;

interface UseServiceStatusProps {
  selectedNodeId: string | null;
  isDetailOpen: boolean;
}

export function useServiceStatus({ selectedNodeId, isDetailOpen }: UseServiceStatusProps) {
    const params = useParams(); 
    const workspace_id = params?.workspace_id as string;
    const workspaceIdInt = parseInt(workspace_id, 10);

  const detailKey =
    isDetailOpen && selectedNodeId
      ? `/api/workspaces/${workspaceIdInt}/nodes/${selectedNodeId}`
      : null;

  const {
    data: nodeDetail,
    isLoading: isDetailLoading,
    mutate: revalidateDetail,
  } = useSWR<NodeDetailResponse>(detailKey, detailFetcher, { refreshInterval: 5000 });

  const servicePayload = useMemo<MonitoringTarget[]>(() => {
    if (!nodeDetail?.services) return [];
    return nodeDetail.services.map((svc) => ({
      ip: svc.node_service_ip_address,
      port: svc.node_service_port || 0,
    }));
  }, [nodeDetail]);

  const { data: serviceStatusData } = useSWR<StatusApiResponse>(
    isDetailOpen && servicePayload.length > 0 ? ['/api/status', servicePayload] : null,
    statusFetcher,
    { refreshInterval: 3000 }
  );

  return { nodeDetail, isDetailLoading, serviceStatusData, revalidateDetail };
}