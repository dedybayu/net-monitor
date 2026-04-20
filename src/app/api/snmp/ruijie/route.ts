import { NextResponse } from 'next/server';
import snmp from 'net-snmp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/snmp/ruijie
 *
 * Polling metrik utama Ruijie Switch/Router via SNMP Get.
 * OID diambil dari hasil SNMP Walk (lihat /api/snmp/walk untuk discovery).
 *
 * OID yang digunakan:
 *   [0] 1.3.6.1.2.1.1.5.0                          → sysName
 *   [1] 1.3.6.1.4.1.4881.1.1.10.2.36.1.1.2.0       → CPU Usage % (Ruijie Enterprise)
 *   [2] 1.3.6.1.4.1.4881.1.1.10.2.35.1.1.1.3.0     → Memory Usage % (Ruijie Enterprise)
 *   [3] 1.3.6.1.2.1.2.2.1.10.<ifIndex>              → ifInOctets  Rx (32-bit)
 *   [4] 1.3.6.1.2.1.2.2.1.16.<ifIndex>              → ifOutOctets Tx (32-bit)
 *
 * ifIndex default = 10 (port WAN0 Ruijie EG310GH-P-E).
 * Ganti via ?ifindex=<N> atau jalankan SNMP Walk untuk menemukan index yang tepat:
 *   GET /api/snmp/walk?host=<IP>&community=<STR>&oid=1.3.6.1.2.1.2.2.1.2
 *
 * Catatan CPU/Memory OID:
 *   OID enterprise Ruijie bisa berbeda per model. Jika nilainya 0, jalankan walk
 *   pada subtree 1.3.6.1.4.1.4881 untuk menemukan OID yang sesuai model Anda.
 */

function buildOids(ifIndex: string) {
  return [
    '1.3.6.1.2.1.1.5.0',                          // [0] sysName
    '1.3.6.1.4.1.4881.1.1.10.2.36.1.1.2.0',       // [1] CPU %
    '1.3.6.1.4.1.4881.1.1.10.2.35.1.1.1.3.0',     // [2] Memory %
    `1.3.6.1.2.1.2.2.1.10.${ifIndex}`,             // [3] ifInOctets Rx
    `1.3.6.1.2.1.2.2.1.16.${ifIndex}`,             // [4] ifOutOctets Tx
  ];
}

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
  const host      = searchParams.get('ip')        || process.env.SNMP_HOST_RUIJIE      || '';
  const community = searchParams.get('community') || process.env.SNMP_COMMUNITY_RUIJIE || 'public';
  const ifIndex   = searchParams.get('ifindex')   || '10';

  if (!host) {
    return NextResponse.json({ error: 'SNMP_HOST_RUIJIE tidak dikonfigurasi di .env' }, { status: 500 });
  }

  const oids = buildOids(ifIndex);

  return new Promise<NextResponse>((resolve) => {
    const session = snmp.createSession(host, community, {
      version: snmp.Version2c,
      retries: 1,
      timeout: 3000,
    });

    session.get(oids, (error: any, varbinds: any) => {
      session.close();

      if (error) {
        console.error('[SNMP Ruijie] Error:', error.message);
        const msg = error.message?.includes('timed out')
          ? 'Timeout: Ruijie tidak merespons. Cek IP/Community dan pastikan SNMP aktif.'
          : error.message;
        return resolve(NextResponse.json({ error: msg }, { status: 500 }));
      }

      const get = (i: number) => snmp.isVarbindError(varbinds[i]) ? null : varbinds[i].value;

      const sysNameRaw = get(0);
      const cpuRaw     = get(1);
      const memRaw     = get(2);
      const rxRaw      = get(3);
      const txRaw      = get(4);

      resolve(NextResponse.json({
        sysName:   sysNameRaw ? (Buffer.isBuffer(sysNameRaw) ? sysNameRaw.toString() : String(sysNameRaw)) : 'Ruijie',
        cpu:       parseSnmpNumber(cpuRaw),
        memory:    parseSnmpNumber(memRaw),
        rxBytes:   parseSnmpNumber(rxRaw),
        txBytes:   parseSnmpNumber(txRaw),
        timestamp: Date.now(),
        _meta: {
          host,
          ifIndex,
          oidCount: oids.length,
          hint: 'Gunakan GET /api/snmp/walk?host=' + host + '&community=' + community + ' untuk discovery OID lengkap',
        },
      }));
    });
  });
}