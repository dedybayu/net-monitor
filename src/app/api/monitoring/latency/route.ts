import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { InfluxDB } from '@influxdata/influxdb-client';

export const dynamic = 'force-dynamic';

const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

export async function GET(request: NextRequest) {
    if (!INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
        return NextResponse.json({ error: 'InfluxDB configuration missing on server' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const range = searchParams.get('range') || '15m';
    const hostParam = searchParams.get('host'); // single host filter (for node detail chart)
    const typeParam = searchParams.get('type') || 'node'; // 'node' or 'service'

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
    }

    // Determine aggregation interval based on range
    let interval = '5s';
    let startRange = '-15m';

    switch (range) {
        case '15m': interval = '5s'; startRange = '-15m'; break;
        case '30m': interval = '10s'; startRange = '-30m'; break;
        case '1h':  interval = '30s'; startRange = '-1h'; break;
        case '1d':  interval = '5m'; startRange = '-1d'; break;
        case '3d':  interval = '15m'; startRange = '-3d'; break;
        case '7d':  interval = '30m'; startRange = '-7d'; break;
        case '14d': interval = '1h'; startRange = '-14d'; break;
        default:    interval = '5m'; startRange = '-7d';
    }

    // Build host filter
    const hostFilter = hostParam
        ? `|> filter(fn: (r) => ${hostParam.split(',').map(h => `r.host == "${h.trim()}"`).join(' or ')})`
        : '';

    const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
    const queryApi = influxDB.getQueryApi(INFLUX_ORG);

    const fluxQuery = `
        from(bucket: "${INFLUX_BUCKET}")
        |> range(start: ${startRange})
        |> filter(fn: (r) => r._measurement == "network_latency" and r._field == "latency")
        |> filter(fn: (r) => r.workspace_id == "${workspaceId}")
        |> filter(fn: (r) => r.type == "${typeParam}")
        ${hostFilter}
        |> aggregateWindow(every: ${interval}, fn: mean, createEmpty: true)
        |> yield(name: "mean")
    `;

    try {
        const timeMap = new Map<string, Record<string, unknown>>();

        await new Promise<void>((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    const time = o._time as string;
                    const host = o.host as string;
                    const value = o._value;

                    if (!timeMap.has(time)) {
                        timeMap.set(time, { time });
                    }
                    timeMap.get(time)![host] = value;
                },
                error(error) {
                    console.error('InfluxDB query error:', error);
                    reject(error);
                },
                complete() {
                    resolve();
                },
            });
        });

        // Convert Map to array and sort by time
        const results = Array.from(timeMap.values()).sort(
            (a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime()
        );

        return NextResponse.json(results);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error querying InfluxDB:', message);
        return NextResponse.json({ error: 'Failed to fetch data', details: message }, { status: 500 });
    }
}
