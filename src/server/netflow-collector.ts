// ============================================================
// NetFlow v9 Collector
// Listens on UDP port for incoming NetFlow v9 packets
// from MikroTik router and emits parsed flow records
// ============================================================

import { EventEmitter } from 'events';
import type { FlowRecord } from '../types/traffic';

// node-netflowv9 doesn't have type definitions
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NetflowCollector = require('node-netflowv9');

export interface NetflowCollectorOptions {
  ports: number[];
}

export class NetflowListener extends EventEmitter {
  private ports: number[];
  private collectors: Map<number, any> = new Map();
  private flowCount = 0;

  constructor(options: NetflowCollectorOptions) {
    super();
    this.ports = options.ports;
  }

  start(): void {
    console.log(`[NetFlow] Starting UDP collectors on ports: ${this.ports.join(', ')}...`);

    for (const port of this.ports) {
      try {
        const collector = NetflowCollector({ port });
        this.collectors.set(port, collector);

        collector.on('data', (data: NetflowPacket) => {
          try {
            this.processPacket(data, port);
          } catch (err) {
            console.error(`[NetFlow:${port}] Error processing packet:`, err);
          }
        });

        collector.on('template', (template: unknown) => {
          console.log(`[NetFlow:${port}] Template received:`, JSON.stringify(template).substring(0, 200));
        });

        collector.on('error', (err: any) => {
          console.error(`[NetFlow:${port}] Collector error:`, err);
        });

        console.log(`[NetFlow] UDP collector listening on port ${port}`);
      } catch (err) {
        console.error(`[NetFlow] Failed to start collector on port ${port}:`, err);
      }
    }
  }

  /**
   * Process a received NetFlow packet and extract flow records.
   */
  private processPacket(data: NetflowPacket, port: number): void {
    if (!data || !data.flows || !Array.isArray(data.flows)) {
      return;
    }

    const flowRecords: FlowRecord[] = [];

    for (const flow of data.flows) {
      // Skip template records and options
      if (!flow.ipv4_src_addr || !flow.ipv4_dst_addr) {
        continue;
      }

      const routerIp = data.rinfo?.address || 'unknown';
      const record: FlowRecord = {
        routerIp,
        ipv4_src_addr: flow.ipv4_src_addr,
        ipv4_dst_addr: flow.ipv4_dst_addr,
        l4_src_port: flow.l4_src_port || 0,
        l4_dst_port: flow.l4_dst_port || 0,
        protocol: flow.protocol || 0,
        in_bytes: flow.in_bytes || flow.in_octets || 0,
        in_pkts: flow.in_pkts || flow.in_packets || 0,
        first_switched: flow.first_switched,
        last_switched: flow.last_switched,
        tcp_flags: (flow.tcp_flags as number) || 0,
        input_snmp: (flow.input_snmp as number) || (flow.input as number) || 0,
        output_snmp: (flow.output_snmp as number) || (flow.output as number) || 0,
        ip_tos: (flow.ip_tos as number) || (flow.tos as number) || 0,
        ipv4_next_hop: (flow.ipv4_next_hop as string) || (flow.next_hop as string) || '',
        collectorPort: port,
      };

      flowRecords.push(record);
      this.flowCount++;
    }

    if (flowRecords.length > 0) {
      this.emit('flows', flowRecords);
    }
  }

  /** Get total number of flows received */
  getFlowCount(): number {
    return this.flowCount;
  }

  /** Stop all collectors */
  stop(): void {
    for (const [port, collector] of this.collectors.entries()) {
      try {
        if (collector.server) {
          collector.server.close();
          console.log(`[NetFlow] Stopped collector on port ${port}`);
        }
      } catch (err) {
        console.error(`[NetFlow] Error stopping collector on port ${port}:`, err);
      }
    }
    this.collectors.clear();
  }
}

/** Type for the raw packet structure from node-netflowv9 */
interface NetflowPacket {
  header?: {
    version: number;
    count: number;
    uptime: number;
    seconds: number;
    sequence: number;
    sourceId: number;
  };
  rinfo?: {
    address: string;
    family: string;
    port: number;
    size: number;
  };
  flows: Array<{
    ipv4_src_addr?: string;
    ipv4_dst_addr?: string;
    l4_src_port?: number;
    l4_dst_port?: number;
    protocol?: number;
    in_bytes?: number;
    in_octets?: number;
    in_pkts?: number;
    in_packets?: number;
    first_switched?: number;
    last_switched?: number;
    [key: string]: unknown;
  }>;
}
