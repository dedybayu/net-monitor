import { useMemo } from 'react';
import useSWR from 'swr';
import { MonitoringTarget, NodeDetailResponse, StatusApiResponse } from '../types';
import { statusFetcher, detailFetcher } from '../fetchers';

const WORKSPACE_ID = 1;

interface UseServiceStatusProps {
  selectedNodeId: string | null;
  isDetailOpen: boolean;
}

export function useServiceStatus({ selectedNodeId, isDetailOpen }: UseServiceStatusProps) {
  const { data: nodeDetail, isLoading: isDetailLoading } = useSWR<NodeDetailResponse>(
    isDetailOpen && selectedNodeId
      ? `/api/workspace/${WORKSPACE_ID}/nodes/${selectedNodeId}`
      : null,
    detailFetcher,
    { refreshInterval: 5000 }
  );

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
    { refreshInterval: 5000 }
  );

  return { nodeDetail, isDetailLoading, serviceStatusData };
}