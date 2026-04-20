import { NextResponse } from 'next/server';
import snmp from 'net-snmp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/snmp/walk
 * Query params:
 *   host       - IP perangkat
 *   community  - community string
 *   device     - "mikrotik" | "ruijie" | "generic" (untuk filter OID label)
 *   oid        - (opsional) root OID untuk walk, default: "1.3.6.1" (semua)
 *
 * Return: { oids: [{oid, label, type, value}], count, durationMs }
 */

// Mapping OID prefix ke nama yang mudah dibaca
const OID_LABELS: Record<string, string> = {
  '1.3.6.1.2.1.1':            'System Info',
  '1.3.6.1.2.1.2':            'Interfaces (IF-MIB)',
  '1.3.6.1.2.1.4':            'IP',
  '1.3.6.1.2.1.6':            'TCP',
  '1.3.6.1.2.1.7':            'UDP',
  '1.3.6.1.2.1.10':           'Transmission',
  '1.3.6.1.2.1.11':           'SNMP Statistics',
  '1.3.6.1.2.1.25':           'Host Resources (CPU/Memory)',
  '1.3.6.1.2.1.31':           'IF-MIB Extended (64-bit counters)',
  '1.3.6.1.4.1.14988':        'MikroTik Enterprise MIB',
  '1.3.6.1.4.1.4881':         'Ruijie Enterprise MIB',
};

function getLabel(oid: string): string {
  for (const prefix of Object.keys(OID_LABELS).sort((a, b) => b.length - a.length)) {
    if (oid.startsWith(prefix)) return OID_LABELS[prefix];
  }
  return 'Other';
}

function parseSnmpValue(varbind: any): string | number {
  const val = varbind.value;
  if (val === null || val === undefined) return '';
  if (Buffer.isBuffer(val)) {
    // Coba parse sebagai UTF-8 string dulu
    const str = val.toString('utf8');
    if (/^[\x20-\x7E]*$/.test(str)) return str; // printable ASCII
    // Kalau bukan, kembalikan sebagai hex
    return `0x${val.toString('hex')}`;
  }
  return Number.isFinite(Number(val)) ? Number(val) : String(val);
}

function getSnmpTypeName(type: number): string {
  // net-snmp ObjectType enum values
  const types: Record<number, string> = {
    1: 'Boolean', 2: 'Integer', 4: 'OctetString', 5: 'Null',
    6: 'OID', 64: 'IpAddress', 65: 'Counter32', 66: 'Gauge32',
    67: 'TimeTicks', 68: 'Opaque', 70: 'Counter64', 128: 'NoSuchObject',
    129: 'NoSuchInstance', 130: 'EndOfMibView',
  };
  return types[type] || `Type(${type})`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host      = searchParams.get('host')      || process.env.SNMP_HOST_MIKROTIK;
  const community = searchParams.get('community') || process.env.SNMP_COMMUNITY_MIKROTIK;
  const rootOid   = searchParams.get('oid')       || '1.3.6.1';
  const maxOids   = Math.min(parseInt(searchParams.get('limit') || '500'), 2000);

  if (!host || !community) {
    return NextResponse.json({ error: 'Parameter host dan community wajib diisi' }, { status: 400 });
  }

  const startTime = Date.now();
  const results: Array<{ oid: string; label: string; type: string; value: string | number }> = [];

  return new Promise<NextResponse>((resolve) => {
    const session = snmp.createSession(host, community, {
      version: snmp.Version2c,
      retries: 0,
      timeout: 5000,
    });

    (session as any).subtree(
      rootOid,
      // feedCallback — dipanggil tiap kali ada varbind masuk
      function (varbinds: any[]) {
        for (const vb of varbinds) {
          if (snmp.isVarbindError(vb)) continue;
          if (results.length >= maxOids) break;

          results.push({
            oid:   vb.oid,
            label: getLabel(vb.oid),
            type:  getSnmpTypeName(vb.type),
            value: parseSnmpValue(vb),
          });
        }
      },
      // doneCallback — dipanggil saat selesai atau error
      function (error: any) {
        session.close();
        if (error && results.length === 0) {
          const msg = error.message?.includes('timed out')
            ? 'Timeout: Perangkat tidak merespons. Pastikan SNMP aktif dan community string benar.'
            : error.message;
          return resolve(NextResponse.json({ error: msg }, { status: 500 }));
        }

        // Kelompokkan berdasarkan label
        const grouped: Record<string, typeof results> = {};
        for (const r of results) {
          if (!grouped[r.label]) grouped[r.label] = [];
          grouped[r.label].push(r);
        }

        resolve(NextResponse.json({
          host,
          rootOid,
          count: results.length,
          durationMs: Date.now() - startTime,
          groups: grouped,
          oids: results,
        }));
      }
    );
  });
}
