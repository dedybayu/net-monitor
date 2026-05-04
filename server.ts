// ============================================================
// Custom Server for Traffic Monitor
// Runs Next.js + UDP NetFlow Collector + WebSocket Server
// in a single Node.js process
// ============================================================

import { createServer } from 'http';
import next from 'next';
import { NetflowListener } from './src/server/netflow-collector';
import { TrafficClassifier } from './src/server/traffic-classifier';
import { DnsCache } from './src/server/dns-cache';
import { WebSocketManager } from './src/server/websocket-manager';
import { startDemoGenerator } from './src/server/demo-generator';
import type { FlowRecord } from './src/types/traffic';

// ── Configuration ──────────────────────────────────────────
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3090', 10);
const netflowPortsStr = process.env.NETFLOW_PORTS || process.env.NETFLOW_PORT || '2055';
const initialNetflowPorts = netflowPortsStr.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
const demoMode = process.env.DEMO_MODE === 'true';

// ── Bootstrap ──────────────────────────────────────────────
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();
  console.log('[Server] Next.js app prepared');

  // Create HTTP server — let Next.js handle URL parsing internally
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize services
  const dnsCache = new DnsCache(5 * 60 * 1000, 10000);
  const classifier = new TrafficClassifier(dnsCache);
  const wsManager = new WebSocketManager(server, 1000);

  let netflowCollector: NetflowListener | null = null;
  let currentPorts = initialNetflowPorts;

  /**
   * Process incoming flow records:
   * Parse → Classify → Broadcast via WebSocket
   */
  async function processFlows(flows: FlowRecord[]) {
    try {
      const classified = await classifier.classifyBatch(flows);
      wsManager.addFlows(classified);
    } catch (err) {
      console.error('[Server] Error processing flows:', err);
    }
  }

  function startNetflowCollectors(ports: number[]) {
    if (netflowCollector) {
      netflowCollector.stop();
      netflowCollector.removeAllListeners();
    }

    console.log(`[Server] 📡 Starting NetFlow collectors on UDP ports: ${ports.join(', ')}`);
    netflowCollector = new NetflowListener({ ports });
    netflowCollector.on('flows', (flows: FlowRecord[]) => {
      processFlows(flows);
    });
    netflowCollector.start();
    wsManager.updateStatus(ports);
    currentPorts = ports;
  }

  // Handle commands from dashboard
  wsManager.onCommand = (message) => {
    if (message.type === 'change_ports' && Array.isArray(message.ports)) {
      console.log('[Server] Changing NetFlow ports to:', message.ports);
      startNetflowCollectors(message.ports);
    }
  };

  // ── Mode Selection ─────────────────────────────────────
  if (demoMode) {
    // Demo mode: generate fake traffic data
    console.log('[Server] 🎮 Running in DEMO MODE (no MikroTik required)');
    startDemoGenerator((flows) => {
      processFlows(flows);
    }, 2000);
    wsManager.updateStatus([]); // No ports in demo mode
  } else {
    // Production mode: listen for real NetFlow data
    startNetflowCollectors(initialNetflowPorts);
  }

  // ── Start HTTP Server ──────────────────────────────────
  server.listen(port, hostname, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║         🌐 Traffic Monitor Server                ║');
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log(`  ║  Dashboard:  http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}         ║`);
    console.log(`  ║  WebSocket:  ws://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}/ws        ║`);
    if (!demoMode) {
      console.log(`  ║  NetFlow:    UDP ports ${currentPorts.join(', ')}                 ║`);
    }
    console.log(`  ║  Mode:       ${demoMode ? '🎮 DEMO' : '📡 LIVE'}                           ║`);
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
