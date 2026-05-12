// ============================================================
// Net-Monitor Background Worker
// Reads targets from PostgreSQL, pings them, writes to InfluxDB
// Run: node worker.js
// ============================================================

require('dotenv').config();
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const ping = require('ping');
const tcpp = require('tcp-ping');
const { Pool } = require('pg');

// ── InfluxDB Config ────────────────────────────────────────
const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

// ── PostgreSQL Config ──────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;

// ── Intervals ──────────────────────────────────────────────
const PING_INTERVAL_MS = 5000;       // Ping every 5 seconds
const DB_REFRESH_INTERVAL_MS = 30000; // Refresh target list every 30 seconds

// ── Validation ─────────────────────────────────────────────
if (!INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
    console.error('❌ Missing required InfluxDB environment variables (INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET).');
    process.exit(1);
}

if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL environment variable.');
    process.exit(1);
}

// ── Initialize Clients ────────────────────────────────────
const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ms');

const pgPool = new Pool({ connectionString: DATABASE_URL });

// ── Target Registry ───────────────────────────────────────
// Map<string, TargetInfo> where key is a unique identifier
// TargetInfo: { host, port, method, workspace_id, node_id, type, label }
let targets = new Map();

/**
 * Fetch all monitoring targets from the database
 * Includes both nodes and node_services
 */
async function refreshTargets() {
    try {
        const client = await pgPool.connect();

        try {
            // Fetch all nodes
            const nodesResult = await client.query(`
                SELECT 
                    n.node_id,
                    n.workspace_id,
                    n.node_label,
                    n.node_ip_address,
                    n.node_method,
                    n.node_port
                FROM nodes n
                ORDER BY n.node_id
            `);

            // Fetch all node services
            const servicesResult = await client.query(`
                SELECT 
                    ns.node_service_id,
                    ns.node_id,
                    ns.node_service_name,
                    ns.node_service_ip_address,
                    ns.node_service_method,
                    ns.node_service_port,
                    n.workspace_id
                FROM node_services ns
                JOIN nodes n ON ns.node_id = n.node_id
                ORDER BY ns.node_service_id
            `);

            const newTargets = new Map();

            // Add nodes as targets
            for (const row of nodesResult.rows) {
                const method = (row.node_method || 'ICMP').toUpperCase();
                const port = row.node_port || 0;
                const host = row.node_ip_address;

                // Build the target string (used for InfluxDB host tag)
                const targetStr = method === 'TCP' && port > 0 ? `${host}:${port}` : host;
                const key = `node-${row.node_id}`;

                newTargets.set(key, {
                    host,
                    port: method === 'TCP' ? port : 0,
                    method,
                    workspace_id: String(row.workspace_id),
                    node_id: String(row.node_id),
                    type: 'node',
                    label: row.node_label,
                    targetStr,
                });
            }

            // Add services as targets
            for (const row of servicesResult.rows) {
                const method = (row.node_service_method || 'ICMP').toUpperCase();
                const port = row.node_service_port || 0;
                const host = row.node_service_ip_address;

                const targetStr = method === 'TCP' && port > 0 ? `${host}:${port}` : host;
                const key = `service-${row.node_service_id}`;

                newTargets.set(key, {
                    host,
                    port: method === 'TCP' ? port : 0,
                    method,
                    workspace_id: String(row.workspace_id),
                    node_id: String(row.node_id),
                    type: 'service',
                    label: row.node_service_name,
                    targetStr,
                });
            }

            // Detect changes
            const oldCount = targets.size;
            const newCount = newTargets.size;
            targets = newTargets;

            if (oldCount !== newCount) {
                console.log(`[${ts()}] 🔄 Targets refreshed: ${newCount} targets (was ${oldCount})`);
                logTargetList();
            }
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`[${ts()}] ❌ Error refreshing targets from database:`, error.message);
    }
}

/**
 * Log current target list
 */
function logTargetList() {
    if (targets.size === 0) {
        console.log(`[${ts()}]    (no targets)`);
        return;
    }
    for (const [key, t] of targets) {
        console.log(`[${ts()}]    ${key}: ${t.targetStr} (${t.method}) [${t.label}]`);
    }
}

/**
 * Ping all targets and write results to InfluxDB
 */
async function pingAndSave() {
    if (targets.size === 0) return;

    const promises = Array.from(targets.entries()).map(async ([key, target]) => {
        try {
            let latency = null;
            let alive = false;

            if (target.method === 'TCP' && target.port > 0) {
                // TCP Ping
                const result = await new Promise((resolve) => {
                    tcpp.ping(
                        { address: target.host, port: target.port, attempts: 1, timeout: 2000 },
                        (err, data) => {
                            if (err || !data || isNaN(data.avg)) {
                                resolve({ alive: false, latency: null });
                            } else {
                                resolve({ alive: true, latency: data.avg });
                            }
                        }
                    );
                });
                alive = result.alive;
                latency = result.latency;
            } else {
                // ICMP Ping
                const res = await ping.promise.probe(target.host, { timeout: 2 });
                alive = res.alive;
                latency = parseFloat(res.time);
            }

            if (alive && latency !== null && !isNaN(latency)) {
                const point = new Point('network_latency')
                    .tag('host', target.targetStr)
                    .tag('workspace_id', target.workspace_id)
                    .tag('node_id', target.node_id)
                    .tag('type', target.type)
                    .floatField('latency', latency)
                    .booleanField('alive', true);

                writeApi.writePoint(point);
            } else {
                // Write a point with alive=false for tracking downtime
                const point = new Point('network_latency')
                    .tag('host', target.targetStr)
                    .tag('workspace_id', target.workspace_id)
                    .tag('node_id', target.node_id)
                    .tag('type', target.type)
                    .booleanField('alive', false);

                writeApi.writePoint(point);
            }
        } catch (error) {
            console.error(`[${ts()}] ❌ Error pinging ${target.targetStr}:`, error.message);
        }
    });

    await Promise.all(promises);

    try {
        await writeApi.flush();
    } catch (e) {
        console.error(`[${ts()}] ❌ Error flushing data to InfluxDB:`, e.message);
    }
}

/**
 * Timestamp helper
 */
function ts() {
    return new Date().toISOString();
}

// ── Main ───────────────────────────────────────────────────
async function main() {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║       🖥️  Net-Monitor Background Worker         ║');
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log(`  ║  InfluxDB:   ${INFLUX_URL.padEnd(36)}║`);
    console.log(`  ║  Bucket:     ${INFLUX_BUCKET.padEnd(36)}║`);
    console.log(`  ║  Ping:       Every ${PING_INTERVAL_MS / 1000}s${''.padEnd(29)}║`);
    console.log(`  ║  DB Refresh: Every ${DB_REFRESH_INTERVAL_MS / 1000}s${''.padEnd(28)}║`);
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log('');

    // Initial target load
    await refreshTargets();

    // Start ping loop
    pingAndSave();
    setInterval(pingAndSave, PING_INTERVAL_MS);

    // Start DB refresh loop
    setInterval(refreshTargets, DB_REFRESH_INTERVAL_MS);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});

// ── Graceful Shutdown ──────────────────────────────────────
async function shutdown() {
    console.log(`\n[${ts()}] Shutting down worker...`);
    try {
        await writeApi.close();
        console.log(`[${ts()}] InfluxDB write API closed.`);
    } catch (e) {
        console.error(`[${ts()}] Error closing InfluxDB:`, e.message);
    }
    try {
        await pgPool.end();
        console.log(`[${ts()}] PostgreSQL pool closed.`);
    } catch (e) {
        console.error(`[${ts()}] Error closing PostgreSQL:`, e.message);
    }
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
