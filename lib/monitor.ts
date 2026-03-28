import ping from 'ping';
import net from 'net';

export interface NodeStatus {
  id: string; // Gunakan string (IP+Port) sebagai ID unik
  name: string;
  target: string;
  method: 'ICMP' | 'TCP';
  status: 'online' | 'offline';
  latency: string;
  lastCheck: string;
}

// Tambahkan registry untuk daftar IP yang harus dipantau
const globalForMonitor = global as unknown as { 
  networkCache: Map<string, NodeStatus>,
  isWorkerRunning: boolean 
};

if (!globalForMonitor.networkCache) {
  globalForMonitor.networkCache = new Map();
  globalForMonitor.isWorkerRunning = false;
}

function checkPort(host: string, port: number): Promise<{ alive: boolean, time: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const startTime = process.hrtime();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      const diff = process.hrtime(startTime);
      const timeMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);
      socket.destroy();
      resolve({ alive: true, time: `${timeMs}ms` });
    });

    const failure = () => { socket.destroy(); resolve({ alive: false, time: 'N/A' }); };
    socket.on('timeout', failure);
    socket.on('error', failure);
    socket.connect(port, host);
  });
}

async function runMonitoring() {
  // Ambil semua target yang sudah didaftarkan oleh user
  const targets = Array.from(globalForMonitor.networkCache.values());
  
  await Promise.all(targets.map(async (node) => {
    if (node.method === 'ICMP') {
      const res = await ping.promise.probe(node.target, { timeout: 2 });
      node.status = res.alive ? 'online' : 'offline';
      node.latency = res.alive ? `${res.time}ms` : 'N/A';
    } else {
      const [host, port] = node.target.split(':');
      const res = await checkPort(host, parseInt(port));
      node.status = res.alive ? 'online' : 'offline';
      node.latency = res.time;
    }
    node.lastCheck = new Date().toLocaleTimeString();
    
    // Update cache
    globalForMonitor.networkCache.set(node.id, node);
  }));
}

export function registerAndStart(ip: string, port: number) {
  const icmpId = `icmp-${ip}`;
  const tcpId = `tcp-${ip}-${port}`;

  // Daftarkan jika belum ada
  if (!globalForMonitor.networkCache.has(icmpId)) {
    globalForMonitor.networkCache.set(icmpId, {
      id: icmpId, name: "Ping Check", target: ip, method: 'ICMP', 
      status: 'offline', latency: '...', lastCheck: 'Waiting...'
    });
  }
  if (!globalForMonitor.networkCache.has(tcpId)) {
    globalForMonitor.networkCache.set(tcpId, {
      id: tcpId, name: "Port Check", target: `${ip}:${port}`, method: 'TCP', 
      status: 'offline', latency: '...', lastCheck: 'Waiting...'
    });
  }

  // Jalankan interval jika belum jalan
  if (!globalForMonitor.isWorkerRunning) {
    globalForMonitor.isWorkerRunning = true;
    setInterval(runMonitoring, 10000);
    runMonitoring(); 
  }
}

export const getCache = () => Array.from(globalForMonitor.networkCache.values());
