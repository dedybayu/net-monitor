import { NextResponse } from 'next/server';
import snmp from 'net-snmp';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Baca dari .env — bisa di-override via query param ?ip=... &community=...
  const targetRouter = searchParams.get('ip') || process.env.SNMP_HOST_MIKROTIK;
  const community = searchParams.get('community') || process.env.SNMP_COMMUNITY_MIKROTIK;

  /**
   * MikroTik CCR — OID yang digunakan:
   *
   * [0] sysName             - Nama router (standard)
   * [1] hrProcessorLoad.1   - CPU % (standard HOST-RESOURCES-MIB)
   * [2] hrStorageUsed.65536 - RAM terpakai
   * [3] hrStorageSize.65536 - RAM total
   *
   * Traffic menggunakan MikroTik Private MIB (mtxrInterfaceStats):
   *   OID: 1.3.6.1.4.1.14988.1.1.14.1.1.[col].[ifIndex]
   *   col 68 = Rx Bytes (bytes masuk / download)
   *   col 69 = Tx Bytes (bytes keluar / upload)
   *
   *   ifIndex di MikroTik = nomor urut interface (ether6=6, ether7=7)
   *   (Terkonfirmasi dari hasil SNMP trap walk)
   */
  const oids = [
    '1.3.6.1.2.1.1.5.0',                        // [0] sysName
    '1.3.6.1.2.1.25.3.3.1.2.1',                 // [1] CPU load %
    '1.3.6.1.2.1.25.2.3.1.6.65536',             // [2] RAM used (allocation units)
    '1.3.6.1.2.1.25.2.3.1.5.65536',             // [3] RAM total (allocation units)
    '1.3.6.1.2.1.25.2.3.1.4.65536',             // [4] RAM allocation unit size (bytes per unit)
    // ifHCInOctets / ifHCOutOctets — standard MIB-II 64-bit byte counters
    // ifDescr mapping: sfp+=1,2 → ether1=3 ... ether6=8, ether7=9
    '1.3.6.1.2.1.31.1.1.1.6.8',                 // [5] ether6 ifHCInOctets  (Rx)
    '1.3.6.1.2.1.31.1.1.1.10.8',                // [6] ether6 ifHCOutOctets (Tx)
    '1.3.6.1.2.1.31.1.1.1.6.9',                 // [7] ether7 ifHCInOctets  (Rx)
    '1.3.6.1.2.1.31.1.1.1.10.9',                // [8] ether7 ifHCOutOctets (Tx)
  ];

  return new Promise((resolve) => {
    const session = snmp.createSession(targetRouter, community, {
      version: snmp.Version2c,
      retries: 1,
      timeout: 3000,
    });

    session.get(oids, function (error: any, varbinds: any) {
      if (error) {
        console.error('[SNMP MikroTik] Error:', error.message || error);
        session.close();
        const msg = error.message?.includes('timed out')
          ? 'Request Timeout: MikroTik tidak merespons. Cek IP, Community, dan pastikan SNMP aktif di IP Services.'
          : error.message;
        return resolve(NextResponse.json({ error: msg }, { status: 500 }));
      }

      const result: any = {
        sysName: null,
        cpu: 0,
        memory: 0,
        eth6RxBytes: 0,
        eth6TxBytes: 0,
        eth7RxBytes: 0,
        eth7TxBytes: 0,
        timestamp: Date.now(),
      };

      // Helper: konversi nilai SNMP ke number
      // Counter64 dikembalikan sebagai Buffer 8-byte big-endian oleh net-snmp
      const parseVal = (val: any): number => {
        if (Buffer.isBuffer(val)) {
          // Konversi Buffer big-endian ke number (aman hingga 2^53)
          let n = 0;
          for (const byte of val) {
            n = n * 256 + byte;
          }
          return n;
        }
        return Number(val) || 0;
      };

      for (let i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError(varbinds[i])) continue;
        const val = varbinds[i].value;

        if (i === 0) result.sysName = Buffer.isBuffer(val) ? val.toString() : String(val);
        if (i === 1) result.cpu = parseVal(val);
        if (i === 2) result.ramUsed = parseVal(val);
        if (i === 3) result.ramTotal = parseVal(val);
        if (i === 4) result.ramAllocUnit = parseVal(val) || 1024;
        if (i === 5) result.eth6RxBytes = parseVal(val);
        if (i === 6) result.eth6TxBytes = parseVal(val);
        if (i === 7) result.eth7RxBytes = parseVal(val);
        if (i === 8) result.eth7TxBytes = parseVal(val);
      }

      // Hitung persentase dan nilai MB memori
      if (result.ramTotal > 0) {
        const unit = result.ramAllocUnit || 1024;
        result.memory = Math.round((result.ramUsed / result.ramTotal) * 100);
        result.ramUsedMB = Math.round((result.ramUsed * unit) / 1024 / 1024);
        result.ramTotalMB = Math.round((result.ramTotal * unit) / 1024 / 1024);
      }

      session.close();
      resolve(NextResponse.json(result));
    });
  });
}