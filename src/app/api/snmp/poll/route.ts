import { NextResponse } from 'next/server';
import snmp from 'net-snmp';

export const dynamic = 'force-dynamic';

function parseSnmpValue(varbind: any): string | number {
  const val = varbind.value;
  if (val === null || val === undefined) return '';
  if (Buffer.isBuffer(val)) {
    const str = val.toString('utf8');
    if (/^[\x20-\x7E]*$/.test(str)) return str;
    return `0x${val.toString('hex')}`;
  }
  return Number.isFinite(Number(val)) ? Number(val) : String(val);
}

const CHUNK_SIZE = 15;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { host, community, oids } = body;

    if (!host || !community || !Array.isArray(oids) || oids.length === 0) {
      return NextResponse.json({ error: 'Parameter host, community, dan array oids wajib diisi' }, { status: 400 });
    }

    // Limit maximum bulk polling to prevent overload
    const targetOids = oids.slice(0, 300); 

    const results: Record<string, string | number> = {};

    return new Promise<NextResponse>((resolve) => {
      const session = snmp.createSession(host, community, {
        version: snmp.Version2c,
        retries: 1,
        timeout: 2000, // shorter timeout for fast polling
      });

      const chunks = [];
      for (let i = 0; i < targetOids.length; i += CHUNK_SIZE) {
        chunks.push(targetOids.slice(i, i + CHUNK_SIZE));
      }

      let completed = 0;
      let hasError = false;

      if (chunks.length === 0) {
        session.close();
        return resolve(NextResponse.json({ data: results }));
      }

      for (const chunk of chunks) {
        session.get(chunk, (error: any, varbinds: any) => {
          if (hasError) return; // Prevent multiple resolves

          if (error) {
            hasError = true;
            session.close();
            const msg = error.message?.includes('timed out')
              ? 'Timeout saat melakukan batch polling.'
              : error.message;
            return resolve(NextResponse.json({ error: msg }, { status: 500 }));
          }

          if (varbinds && Array.isArray(varbinds)) {
            for (const vb of varbinds) {
              if (!snmp.isVarbindError(vb)) {
                results[vb.oid] = parseSnmpValue(vb);
              }
            }
          }

          completed++;
          if (completed === chunks.length) {
            session.close();
            resolve(NextResponse.json({ data: results }));
          }
        });
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
