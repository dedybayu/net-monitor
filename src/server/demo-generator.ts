// ============================================================
// Demo Traffic Generator
// Generates simulated NetFlow-like traffic data for testing
// the dashboard without a real MikroTik router
// ============================================================

import type { FlowRecord } from '../types/traffic';

/** Simulated destination servers with realistic IPs */
const SIMULATED_DESTINATIONS = [
  // YouTube
  { ip: '142.250.190.78', port: 443, proto: 6, bytesRange: [50000, 2000000] },
  { ip: '172.217.14.110', port: 443, proto: 6, bytesRange: [10000, 500000] },
  // Instagram
  { ip: '157.240.1.174', port: 443, proto: 6, bytesRange: [20000, 800000] },
  { ip: '157.240.13.174', port: 443, proto: 6, bytesRange: [30000, 600000] },
  // Facebook
  { ip: '157.240.1.35', port: 443, proto: 6, bytesRange: [5000, 200000] },
  // TikTok
  { ip: '161.117.197.194', port: 443, proto: 6, bytesRange: [100000, 3000000] },
  { ip: '103.136.220.30', port: 443, proto: 6, bytesRange: [50000, 1500000] },
  // WhatsApp
  { ip: '157.240.1.60', port: 443, proto: 6, bytesRange: [1000, 50000] },
  // Google
  { ip: '142.250.190.46', port: 443, proto: 6, bytesRange: [2000, 100000] },
  { ip: '142.250.190.14', port: 443, proto: 6, bytesRange: [5000, 300000] },
  // Netflix
  { ip: '54.74.73.31', port: 443, proto: 6, bytesRange: [200000, 5000000] },
  // Spotify
  { ip: '35.186.224.25', port: 443, proto: 6, bytesRange: [20000, 200000] },
  // Twitter/X
  { ip: '104.244.42.65', port: 443, proto: 6, bytesRange: [5000, 150000] },
  // Discord
  { ip: '162.159.128.233', port: 443, proto: 6, bytesRange: [3000, 100000] },
  // GitHub
  { ip: '140.82.121.4', port: 443, proto: 6, bytesRange: [2000, 80000] },
  // Telegram
  { ip: '149.154.175.50', port: 443, proto: 6, bytesRange: [1000, 40000] },
  // DNS
  { ip: '8.8.8.8', port: 53, proto: 17, bytesRange: [100, 500] },
  { ip: '1.1.1.1', port: 53, proto: 17, bytesRange: [100, 500] },
  // Shopee
  { ip: '104.18.24.186', port: 443, proto: 6, bytesRange: [10000, 400000] },
  // Tokopedia
  { ip: '13.250.155.62', port: 443, proto: 6, bytesRange: [8000, 350000] },
];

/** Simulated local network source IPs */
const LOCAL_IPS = [
  '192.168.1.100',
  '192.168.1.101',
  '192.168.1.102',
  '192.168.1.103',
  '192.168.1.104',
  '192.168.1.105',
  '192.168.1.106',
  '192.168.1.107',
  '192.168.1.108',
  '192.168.1.109',
  '192.168.1.110',
  '192.168.1.111',
  '192.168.1.112',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a batch of simulated flow records.
 * @param count Number of flow records to generate
 */
export function generateDemoFlows(count: number = 15): FlowRecord[] {
  const flows: FlowRecord[] = [];

  for (let i = 0; i < count; i++) {
    const dest = randomElement(SIMULATED_DESTINATIONS);
    const srcIp = randomElement(LOCAL_IPS);
    const routerIp = randomElement(['10.0.0.1', '10.0.0.2']); // Mock two routers
    const bytes = randomInt(dest.bytesRange[0], dest.bytesRange[1]);
    const packets = Math.max(1, Math.round(bytes / randomInt(500, 1500)));

    flows.push({
      routerIp,
      ipv4_src_addr: srcIp,
      ipv4_dst_addr: dest.ip,
      l4_src_port: randomInt(10000, 65535),
      l4_dst_port: dest.port,
      protocol: dest.proto,
      in_bytes: bytes,
      in_pkts: packets,
      tcp_flags: dest.proto === 6 ? randomElement([2, 16, 18, 24]) : 0, // Mock flags for TCP
      input_snmp: randomInt(1, 10),
      output_snmp: randomInt(1, 10),
      ip_tos: randomElement([0, 32, 46, 184]), // Common TOS values
      ipv4_next_hop: '10.0.0.1',
      collectorPort: 2055,
    });
  }

  return flows;
}

/**
 * Start a demo traffic generator that emits flow records periodically.
 * @param callback Function to call with generated flows
 * @param intervalMs Interval between batches (default 2000ms)
 * @returns Cleanup function to stop the generator
 */
export function startDemoGenerator(
  callback: (flows: FlowRecord[]) => void,
  intervalMs: number = 2000
): () => void {
  console.log('[Demo] Starting demo traffic generator...');

  const timer = setInterval(() => {
    const batchSize = randomInt(5, 25);
    const flows = generateDemoFlows(batchSize);
    callback(flows);
  }, intervalMs);

  return () => {
    clearInterval(timer);
    console.log('[Demo] Demo traffic generator stopped');
  };
}
