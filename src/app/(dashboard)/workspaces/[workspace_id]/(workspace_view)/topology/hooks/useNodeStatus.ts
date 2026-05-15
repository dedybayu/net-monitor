import { useMemo, useEffect } from 'react';
import { Node } from 'reactflow';
import useSWR from 'swr';
import { MonitoringTarget, StatusApiResponse } from '../types';
import { statusFetcher } from '../fetchers';

interface UseNodeStatusProps {
  nodes: Node[];
  setNodes: (updater: (nds: Node[]) => Node[]) => void;
}

export function useNodeStatus({ nodes, setNodes }: UseNodeStatusProps) {
  const targetPayload = useMemo<MonitoringTarget[]>(() =>
    nodes.map((node) => {
      const targetStr = node.data.target as string;
      if (targetStr.includes(':')) {
        const [ip, port] = targetStr.split(':');
        return { ip, port: parseInt(port, 10) };
      }
      return { ip: targetStr, port: 0 };
    }),
    [nodes]
  );

  const { data: apiData } = useSWR<StatusApiResponse, Error, [string, MonitoringTarget[]] | null>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    statusFetcher,
    { refreshInterval: 3000 }
  );

  // Sync live status back into node data
  useEffect(() => {
    if (!apiData?.nodes) return;
    setNodes((nds) =>
      nds.map((node) => {
        const latestStatus = apiData.nodes.find((n) => n.target === node.data.target);
        if (
          latestStatus &&
          (node.data.status !== latestStatus.status ||
            node.data.latency !== latestStatus.latency)
        ) {
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
  }, [apiData, setNodes]);
}