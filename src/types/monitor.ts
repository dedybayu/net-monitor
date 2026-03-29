export interface MonitoringTarget {
  ip: string;
  port: number;
}

export interface Device {
  id: string;
  name: string;
  target: string;
  method: 'ICMP' | 'TCP';
}

export interface ApiNodeStatus {
  target: string;
  status: 'online' | 'offline';
  latency: string;
  method?: string;
  lastCheck?: string;
}

export interface StatusApiResponse {
  nodes: ApiNodeStatus[];
  serverTimestamp?: string;
}