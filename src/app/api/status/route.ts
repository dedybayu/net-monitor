import { NextResponse } from 'next/server';
import { InfluxDB } from '@influxdata/influxdb-client';

const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targets } = body; // { "targets": [{ "ip": "...", "port": 3000 }, ...] }

    if (!INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
      return NextResponse.json({ error: 'InfluxDB configuration missing' }, { status: 500 });
    }

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ nodes: [], serverTimestamp: new Date().toISOString() });
    }

    // Build host identifiers to match InfluxDB tags
    const hostIdentifiers = targets.map((t: { ip: string; port?: number }) => {
      const port = t.port || 0;
      return port > 0 ? `${t.ip}:${port}` : t.ip;
    });

    const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
    const queryApi = influxDB.getQueryApi(INFLUX_ORG);

    // Build filter for the specific hosts
    const hostFilterParts = hostIdentifiers.map((h: string) => `r.host == "${h}"`);
    const hostFilter = hostFilterParts.join(' or ');

    // Query the most recent data point for each host (last 30 seconds)
    const fluxQuery = `
      from(bucket: "${INFLUX_BUCKET}")
      |> range(start: -30s)
      |> filter(fn: (r) => r._measurement == "network_latency")
      |> filter(fn: (r) => ${hostFilter})
      |> last()
    `;

    // Collect results per host
    const hostData = new Map<string, { latency: number | null; alive: boolean }>();

    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          const host = o.host as string;
          const field = o._field as string;

          if (!hostData.has(host)) {
            hostData.set(host, { latency: null, alive: false });
          }
          const entry = hostData.get(host)!;

          if (field === 'latency') {
            entry.latency = o._value as number;
          }
          if (field === 'alive') {
            entry.alive = o._value as boolean;
          }
        },
        error(error) {
          console.error('InfluxDB status query error:', error);
          reject(error);
        },
        complete() {
          resolve();
        },
      });
    });

    // Build response in the same format as the old API
    const nodes = hostIdentifiers.map((host: string) => {
      const data = hostData.get(host);
      if (data && data.alive && data.latency !== null) {
        return {
          target: host,
          status: 'online' as const,
          latency: `${data.latency.toFixed(2)}ms`,
        };
      }
      return {
        target: host,
        status: 'offline' as const,
        latency: 'N/A',
      };
    });

    return NextResponse.json({
      nodes,
      serverTimestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}