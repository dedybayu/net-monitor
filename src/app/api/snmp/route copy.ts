import { NextResponse } from 'next/server';
import snmp from 'net-snmp';

// Memaksa Next.js agar selalu fetch ulang (tidak di-cache)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Ganti dengan IP Router dan Community Name Anda sebagai default
//   const targetRouter = searchParams.get('ip') || '192.168.12.1';
//   const community = searchParams.get('community') || 'jagoan_0ffice';
  const targetRouter = searchParams.get('ip') || process.env.SNMP_HOST_RUIJIE;
  const community = searchParams.get('community') || process.env.SNMP_COMMUNITY_RUIJIE;

  // Interface index untuk memonitor trafik jaringan
  // Index 10 adalah port WAN0 pada Ruijie EG310GH-P-E
  // (Port 1 / LAN0 kebetulan sedang tidak ada trafik / 0 berdasarkan walk data)
  const ifIndex = '10';

  // Daftar OID SNMP 
  // Catatan: OID CPU dan Memory bisa berbeda tiap tipe/seri Router Ruijie
  const oids = [
    '1.3.6.1.2.1.1.5.0', // 0: sysName (Nama Router - Standard)
    '1.3.6.1.4.1.4881.1.1.10.2.36.1.1.2.0', // 1: CPU Usage (Ruijie Enterprise OID)
    '1.3.6.1.4.1.4881.1.1.10.2.35.1.1.1.3.0', // 2: Memory Usage (Ruijie Enterprise OID)
    `1.3.6.1.2.1.2.2.1.10.${ifIndex}`, // 3: ifInOctets (Rx Bytes - Total Download)
    `1.3.6.1.2.1.2.2.1.16.${ifIndex}`  // 4: ifOutOctets (Tx Bytes - Total Upload)
  ];

  return new Promise((resolve) => {
    // Membuat session SNMPv2c dengan timeout yang lebih singkat
    // Agar jika router mati/tidak merespons, tidak butuh 10 detik untuk error
    const session = snmp.createSession(targetRouter, community, { 
      version: snmp.Version2c,
      retries: 1,
      timeout: 3000
    });

    session.get(oids, function (error: any, varbinds: any) {
      if (error) {
        console.error('Gagal mengambil data SNMP:', error.message || error);
        session.close();
        let errorMessage = error.message;
        if (error.name === 'RequestFailedError' || error.message?.includes('timed out')) {
            errorMessage = 'Request Timeout: Router tidak merespons. Cek IP, Community, dan pastikan SNMP aktif di router.';
        }
        return resolve(NextResponse.json({ error: errorMessage }, { status: 500 }));
      }

      const result: any = {
        sysName: null,
        cpu: 0,
        memory: 0,
        rxBytes: 0,
        txBytes: 0,
        timestamp: Date.now()
      };

      for (let i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError(varbinds[i])) {
          // OID tidak ditemukan di perangkat (Device tidak support OID ini)
          // Berikan nilai default 0 dan abaikan log agar tidak spamming terminal
          if (i === 1) result.cpu = 0;
          if (i === 2) result.memory = 0;
        } else {
          const val = varbinds[i].value;
          // Parsing nilai Buffer menjadi string jika diperlukan
          const parsedVal = Buffer.isBuffer(val) ? val.toString() : val;

          // Mapping nilai ke object result
          if (i === 0) result.sysName = parsedVal;
          if (i === 1) result.cpu = Number(parsedVal) || 0;
          if (i === 2) result.memory = Number(parsedVal) || 0;
          if (i === 3) result.rxBytes = Number(parsedVal) || 0;
          if (i === 4) result.txBytes = Number(parsedVal) || 0;
        }
      }

      session.close();
      resolve(NextResponse.json(result));
    });
  });
}