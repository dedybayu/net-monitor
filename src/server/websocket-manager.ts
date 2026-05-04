// ============================================================
// WebSocket Manager
// Manages WebSocket connections and broadcasts traffic data
// to all connected dashboard clients
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { ClassifiedFlow, DashboardData } from '../types/traffic';

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private pendingFlows: ClassifiedFlow[] = [];
  private broadcastInterval: NodeJS.Timeout | null = null;
  private broadcastIntervalMs: number;
  private totalFlowsProcessed = 0;
  private currentPorts: number[] = [2055];
  
  public onCommand?: (message: any) => void;

  constructor(server: HttpServer, broadcastIntervalMs: number = 1000) {
    this.broadcastIntervalMs = broadcastIntervalMs;

    // Create WebSocket server WITHOUT attaching to HTTP server
    // We'll manually handle upgrades to avoid conflicts with Next.js HMR
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected. Total clients: ${this.clients.size}`);

      // Send initial status
      ws.send(JSON.stringify({
        type: 'collector_status',
        udpListening: true,
        ports: this.currentPorts,
        demo: process.env.DEMO_MODE === 'true',
      }));

      // Listen for messages from client
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          console.log('[WS] Received command:', message.type);
          if (this.onCommand) {
            this.onCommand(message);
          }
        } catch (err) {
          console.error('[WS] Failed to parse client message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected. Total clients: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err.message);
        this.clients.delete(ws);
      });
    });

    // Handle upgrade requests manually, only for /ws path
    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const { pathname } = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

      if (pathname === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
      // Don't destroy the socket for non-/ws paths — let Next.js HMR handle them
    });

    // Start periodic broadcast
    this.startBroadcast();
  }

  /**
   * Queue classified flows for the next broadcast cycle.
   */
  addFlows(flows: ClassifiedFlow[]): void {
    this.pendingFlows.push(...flows);
    this.totalFlowsProcessed += flows.length;
  }

  /**
   * Start the periodic broadcast interval.
   * Batches flows and sends them every `broadcastIntervalMs`.
   */
  private startBroadcast(): void {
    // Sliding window to track bytes over time for accurate bandwidth calc
    const bandwidthWindow: { timestamp: number; bytes: number }[] = [];
    const WINDOW_DURATION_MS = 10_000; // 10-second sliding window

    this.broadcastInterval = setInterval(() => {
      if (this.pendingFlows.length === 0 || this.clients.size === 0) {
        return;
      }

      // Take all pending flows
      const flows = this.pendingFlows.splice(0);
      const now = Date.now();

      // Compute stats
      const totalBytes = flows.reduce((sum, f) => sum + f.bytes, 0);
      const uniqueSrcIps = new Set(flows.map((f) => f.srcIp));

      // Add to sliding window
      bandwidthWindow.push({ timestamp: now, bytes: totalBytes });

      // Remove entries older than the window duration
      while (bandwidthWindow.length > 0 && bandwidthWindow[0].timestamp < now - WINDOW_DURATION_MS) {
        bandwidthWindow.shift();
      }

      // Calculate bytes/second over the sliding window
      const windowBytes = bandwidthWindow.reduce((sum, w) => sum + w.bytes, 0);
      const windowDuration = bandwidthWindow.length > 1
        ? (now - bandwidthWindow[0].timestamp) / 1000
        : this.broadcastIntervalMs / 1000;
      const bytesPerSecond = Math.round(windowBytes / Math.max(windowDuration, 1));

      // Find top application by bytes
      const appBytes: Record<string, number> = {};
      for (const f of flows) {
        appBytes[f.application] = (appBytes[f.application] || 0) + f.bytes;
      }
      const topApp = Object.entries(appBytes).sort((a, b) => b[1] - a[1])[0];

      const message: DashboardData = {
        type: 'traffic_update',
        timestamp: now,
        flows,
        stats: {
          totalBytesPerSecond: bytesPerSecond,
          activeUsers: uniqueSrcIps.size,
          topApplication: topApp ? topApp[0] : 'N/A',
          totalFlows: this.totalFlowsProcessed,
        },
      };

      this.broadcast(JSON.stringify(message));
    }, this.broadcastIntervalMs);
  }

  /**
   * Send a message to all connected clients.
   */
  private broadcast(data: string): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (err) {
          console.error('[WS] Broadcast error:', err);
          this.clients.delete(client);
        }
      }
    }
  }

  /** Update the current listening ports status */
  updateStatus(ports: number[]): void {
    this.currentPorts = ports;
    this.broadcast(JSON.stringify({
      type: 'collector_status',
      udpListening: true,
      ports,
      demo: process.env.DEMO_MODE === 'true',
    }));
  }

  /** Get number of connected clients */
  getClientCount(): number {
    return this.clients.size;
  }

  /** Get total flows processed */
  getTotalFlows(): number {
    return this.totalFlowsProcessed;
  }

  /** Cleanup */
  close(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
    this.wss.close();
  }
}
