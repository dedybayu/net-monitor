// ============================================================
// Shared TypeScript types for Traffic Monitor
// Used by both server (custom server.ts) and client (React)
// ============================================================

/** Raw parsed NetFlow record from node-netflowv9 */
export interface FlowRecord {
  routerIp: string;        // IP address of the source router
  ipv4_src_addr: string;
  ipv4_dst_addr: string;
  l4_src_port: number;
  l4_dst_port: number;
  protocol: number;      // 6=TCP, 17=UDP, 1=ICMP
  in_bytes: number;
  in_pkts: number;
  first_switched?: number;
  last_switched?: number;
  tcp_flags?: number;
  input_snmp?: number;
  output_snmp?: number;
  ip_tos?: number;
  ipv4_next_hop?: string;
  collectorPort: number;
}

/** Flow record after classification */
export interface ClassifiedFlow {
  id: string;
  routerIp: string;        // Identity of the MikroTik router
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  protocol: string;       // "TCP" | "UDP" | "ICMP" | "OTHER"
  bytes: number;
  packets: number;
  hostname: string;        // Resolved hostname or IP
  application: string;     // "YouTube", "Instagram", etc.
  timestamp: number;       // Unix ms
  duration: number;        // Flow duration in ms
  tcpFlags: number;
  inputInt: number;
  outputInt: number;
  tos: number;
  nextHop: string;
  collectorPort: number;
}

/** Per-application bandwidth aggregation */
export interface AppTrafficSummary {
  application: string;
  totalBytes: number;
  totalPackets: number;
  flowCount: number;
  color: string;
}

/** Per-user (source IP) traffic summary */
export interface UserTrafficSummary {
  srcIp: string;
  totalBytes: number;
  totalPackets: number;
  flowCount: number;
  topApplication: string;
  applications: Record<string, number>; // app -> bytes
}

/** Time-series data point for bandwidth chart */
export interface BandwidthDataPoint {
  timestamp: number;
  label: string;           // Formatted time label
  totalBytes: number;
  [app: string]: number | string; // Per-app bytes
}

/** Complete dashboard payload sent via WebSocket */
export interface DashboardData {
  type: 'traffic_update';
  timestamp: number;
  flows: ClassifiedFlow[];
  stats: {
    totalBytesPerSecond: number;
    activeUsers: number;
    topApplication: string;
    totalFlows: number;
  };
}

/** WebSocket message types */
export type WSMessage =
  | DashboardData
  | { type: 'connection_status'; connected: boolean; clientCount: number }
  | { type: 'collector_status'; udpListening: boolean; ports: number[]; demo: boolean }
  | { type: 'change_ports'; ports: number[] };

/** Application color mapping */
export const APP_COLORS: Record<string, string> = {
  'YouTube': '#FF0000',
  'Instagram': '#E4405F',
  'Facebook': '#1877F2',
  'TikTok': '#010101',
  'Twitter/X': '#1DA1F2',
  'WhatsApp': '#25D366',
  'Netflix': '#E50914',
  'Spotify': '#1DB954',
  'Google': '#4285F4',
  'GitHub': '#6e5494',
  'Telegram': '#0088cc',
  'Discord': '#5865F2',
  'Twitch': '#9146FF',
  'LinkedIn': '#0A66C2',
  'Shopee': '#EE4D2D',
  'Tokopedia': '#42B549',
  'Gojek': '#00880F',
  'Grab': '#00B14F',
  'Other': '#6B7280',
};

/** Protocol number to name mapping */
export const PROTOCOL_MAP: Record<number, string> = {
  1: 'ICMP',
  6: 'TCP',
  17: 'UDP',
  47: 'GRE',
  50: 'ESP',
  58: 'ICMPv6',
};

/** Format bytes to human readable, optionally as bits */
export function formatBytes(bytes: number, useBits: boolean = false): string {
  if (bytes === 0) return useBits ? '0 b' : '0 B';
  const val = useBits ? bytes * 8 : bytes;
  const k = useBits ? 1000 : 1024;
  const sizes = useBits ? ['b', 'Kb', 'Mb', 'Gb', 'Tb'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(val) / Math.log(k));
  return parseFloat((val / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** Format bytes per second, optionally as bits per second */
export function formatBps(bytesPerSecond: number, useBits: boolean = true): string {
  if (bytesPerSecond === 0) return useBits ? '0 bps' : '0 Bps';
  const val = useBits ? bytesPerSecond * 8 : bytesPerSecond;
  const k = useBits ? 1000 : 1024;
  const sizes = useBits ? ['bps', 'Kbps', 'Mbps', 'Gbps'] : ['Bps', 'KBps', 'MBps', 'GBps'];
  const i = Math.floor(Math.log(val) / Math.log(k));
  return parseFloat((val / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** Format duration in ms to human readable */
export function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '< 1ms';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

/** Format TCP flags decimal to string */
export function formatTcpFlags(flags: number): string {
  if (!flags) return '...';
  const res: string[] = [];
  if (flags & 0x01) res.push('FIN');
  if (flags & 0x02) res.push('SYN');
  if (flags & 0x04) res.push('RST');
  if (flags & 0x08) res.push('PSH');
  if (flags & 0x10) res.push('ACK');
  if (flags & 0x20) res.push('URG');
  return res.length > 0 ? res.join('|') : '...';
}
