import { NextResponse } from 'next/server';
import snmp from 'net-snmp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/snmp/mikrotik
 *
 * Polling metrik utama MikroTik CCR via SNMP Get.
 * OID diambil dari hasil SNMP Walk (lihat /api/snmp/walk untuk discovery).
 *
 * OID yang digunakan:
 *   [0] 1.3.6.1.2.1.1.5.0               → sysName
 *   [1] 1.3.6.1.2.1.25.3.3.1.2.1        → hrProcessorLoad (CPU %)
 *   [2] 1.3.6.1.2.1.25.2.3.1.6.65536    → hrStorageUsed RAM
 *   [3] 1.3.6.1.2.1.25.2.3.1.5.65536    → hrStorageSize RAM
 *   [4] 1.3.6.1.2.1.25.2.3.1.4.65536    → hrStorageAllocationUnits
 *   [5] 1.3.6.1.2.1.31.1.1.1.6.8        → ether6 ifHCInOctets  (Rx 64-bit)
 *   [6] 1.3.6.1.2.1.31.1.1.1.10.8       → ether6 ifHCOutOctets (Tx 64-bit)
 *   [7] 1.3.6.1.2.1.31.1.1.1.6.9        → ether7 ifHCInOctets  (Rx 64-bit)
 *   [8] 1.3.6.1.2.1.31.1.1.1.10.9       → ether7 ifHCOutOctets (Tx 64-bit)
 *
 * Untuk menemukan ifIndex yang tepat untuk interface Anda:
 *   GET /api/snmp/walk?host=<IP>&community=<STR>&oid=1.3.6.1.2.1.2.2
 *   Lihat kolom ifDescr (1.3.6.1.2.1.2.2.1.2.*) → catat index terakhir
 */

const MIKROTIK_OIDS = [
  '1.3.6.1.2.1.1.5.0',                // [0] sysName
  '1.3.6.1.2.1.25.3.3.1.2.1',         // [1] CPU %
  '1.3.6.1.2.1.25.2.3.1.6.65536',     // [2] RAM used (alloc units)
  '1.3.6.1.2.1.25.2.3.1.5.65536',     // [3] RAM total (alloc units)
  '1.3.6.1.2.1.25.2.3.1.4.65536',     // [4] Alloc unit size (bytes)
  '1.3.6.1.2.1.31.1.1.1.6.8',         // [5] ether6 Rx (64-bit)
  '1.3.6.1.2.1.31.1.1.1.10.8',        // [6] ether6 Tx (64-bit)
  '1.3.6.1.2.1.31.1.1.1.6.9',         // [7] ether7 Rx (64-bit)
  '1.3.6.1.2.1.31.1.1.1.10.9',        // [8] ether7 Tx (64-bit)
];

/** Konversi nilai SNMP ke number — mendukung Buffer Counter64 */
function parseSnmpNumber(val: unknown): number {
  if (Buffer.isBuffer(val)) {
    let n = 0;
    for (const byte of val as Buffer) n = n * 256 + byte;
    return n;
  }
  return Number(val) || 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host      = searchParams.get('ip')        || process.env.SNMP_HOST_MIKROTIK      || '';
  const community = searchParams.get('community') || process.env.SNMP_COMMUNITY_MIKROTIK || 'public';

  if (!host) {
    return NextResponse.json({ error: 'SNMP_HOST_MIKROTIK tidak dikonfigurasi di .env' }, { status: 500 });
  }

  return new Promise<NextResponse>((resolve) => {
    const session = snmp.createSession(host, community, {
      version: snmp.Version2c,
      retries: 1,
      timeout: 3000,
    });

    session.get(MIKROTIK_OIDS, (error: any, varbinds: any) => {
      session.close();

      if (error) {
        console.error('[SNMP MikroTik] Error:', error.message);
        const msg = error.message?.includes('timed out')
          ? 'Timeout: MikroTik tidak merespons. Cek IP/Community atau SNMP di IP Services.'
          : error.message;
        return resolve(NextResponse.json({ error: msg }, { status: 500 }));
      }

      const get = (i: number) => snmp.isVarbindError(varbinds[i]) ? null : varbinds[i].value;

      const sysNameRaw  = get(0);
      const cpuRaw      = get(1);
      const ramUsedRaw  = get(2);
      const ramTotalRaw = get(3);
      const ramUnitRaw  = get(4);
      const e6RxRaw     = get(5);
      const e6TxRaw     = get(6);
      const e7RxRaw     = get(7);
      const e7TxRaw     = get(8);

      const ramUsed  = parseSnmpNumber(ramUsedRaw);
      const ramTotal = parseSnmpNumber(ramTotalRaw);
      const ramUnit  = parseSnmpNumber(ramUnitRaw) || 1024;

      const memPct = ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0;

      resolve(NextResponse.json({
        sysName:      sysNameRaw ? (Buffer.isBuffer(sysNameRaw) ? sysNameRaw.toString() : String(sysNameRaw)) : 'MikroTik',
        cpu:          parseSnmpNumber(cpuRaw),
        memory:       memPct,
        ramUsedMB:    Math.round((ramUsed * ramUnit) / 1_048_576),
        ramTotalMB:   Math.round((ramTotal * ramUnit) / 1_048_576),
        eth6RxBytes:  parseSnmpNumber(e6RxRaw),
        eth6TxBytes:  parseSnmpNumber(e6TxRaw),
        eth7RxBytes:  parseSnmpNumber(e7RxRaw),
        eth7TxBytes:  parseSnmpNumber(e7TxRaw),
        timestamp:    Date.now(),
        // Info diagnostik
        _meta: {
          host,
          oidCount: MIKROTIK_OIDS.length,
          hint: 'Gunakan GET /api/snmp/walk?host=' + host + '&community=' + community + ' untuk discovery OID lengkap',
        },
      }));
    });
  });
}