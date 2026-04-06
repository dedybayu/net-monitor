import { Node as ReactFlowNode } from 'reactflow';

export interface MonitoringTarget {
  ip: string;
  port: number;
}

export interface ApiNodeStatus {
  target: string;
  status: 'online' | 'offline';
  latency: string;
  method?: string;
}

export interface StatusApiResponse {
  nodes: ApiNodeStatus[];
  timestamp?: string;
}

export interface NodeService {
  node_service_id: number;
  node_service_name: string;
  node_service_description: string;
  node_service_ip_address: string;
  node_service_method: string;
  node_service_port: number;
}

export interface NodeDetailResponse {
  node_id: number;
  node_label: string;
  node_description: string;
  node_ip_address: string;
  node_method: string;
  node_port: number;
  services: NodeService[];
}

export interface TopologyNode extends ReactFlowNode {
  node_id?: number | string;
}