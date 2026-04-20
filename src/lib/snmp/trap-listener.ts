#!/usr/bin/env tsx
/**
 * SNMP Trap Listener — Standalone Script
 * ----------------------------------------
 * Dijalankan TERPISAH dari Next.js:
 *   npm run trap-listener
 *
 * Membuka UDP server pada port SNMP_TRAP_PORT (default: 1620).
 * Menerima SNMP Trap v1/v2c dari perangkat, lalu menyimpannya
 * ke trap-store.ts yang bisa dibaca oleh /api/snmp/traps.
 *
 * Konfigurasi perangkat:
 *   - MikroTik: /tool snmp-trap add address=<IP_SERVER>:1620 community=public
 *   - Ruijie  : SNMP > Trap Host > IP server, port 1620, community string
 *
 * Catatan: Port 162 (standard SNMP trap) membutuhkan hak akses root/admin.
 * Gunakan port > 1024 (default: 1620) untuk development tanpa sudo.
 */

import * as snmp from 'net-snmp';
import { addTrap, type TrapEvent } from './trap-store';

// ── ENV ──────────────────────────────────────────────────────────────────────
const PORT      = parseInt(process.env.SNMP_TRAP_PORT || '1620', 10);
const BIND_ADDR = process.env.SNMP_TRAP_BIND || '0.0.0.0';

// ── Classifier: tentukan severity berdasarkan trapType / OID ─────────────────
function classifySeverity(trapType: string, varbinds: TrapEvent['varbinds']): TrapEvent['severity'] {
  const t = trapType.toLowerCase();

  // Critical: link down, cold/warm start menunjukkan reboot tidak terduga
  if (t.includes('linkdown') || t.includes('coldstart') || t.includes('warmstart')) {
    return 'critical';
  }

  // Warning: link up setelah down, authentication failure
  if (t.includes('linkup') || t.includes('authenticationfailure')) {
    return 'warning';
  }

  // Cek varbind OID — beberapa enterprise trap mengandung kata kunci
  for (const vb of varbinds) {
    const val = String(vb.value).toLowerCase();
    if (val.includes('critical') || val.includes('down') || val.includes('fail')) return 'critical';
    if (val.includes('warn') || val.includes('high') || val.includes('threshold'))  return 'warning';
  }

  return 'info';
}

// ── Map trapType integer ke nama ──────────────────────────────────────────────
function trapTypeName(type: number): string {
  const names: Record<number, string> = {
    0: 'coldStart',
    1: 'warmStart',
    2: 'linkDown',
    3: 'linkUp',
    4: 'authenticationFailure',
    5: 'egpNeighborLoss',
    6: 'enterpriseSpecific',
  };
  return names[type] ?? `trapType(${type})`;
}

// ── Buat Receiver ────────────────────────────────────────────────────────────
const receiver = snmp.createReceiver(
  {
    port: PORT,
    address: BIND_ADDR,
    // Izinkan semua community agar fleksibel; validasi manual jika perlu
    disableAuthorization: true,
  } as any,
  function callback(error: Error | null, notification: any) {
    if (error) {
      console.error('[TrapListener] Error:', error.message);
      return;
    }

    try {
      const { pdu, rinfo } = notification;
      const sourceIp  = rinfo?.address ?? 'unknown';

      // Parse varbinds
      const varbinds: TrapEvent['varbinds'] = (pdu.varbinds || []).map((vb: any) => {
        let value: string | number = '';
        const v = vb.value;
        if (Buffer.isBuffer(v)) {
          const str = v.toString('utf8');
          value = /^[\x20-\x7E]*$/.test(str) ? str : `0x${v.toString('hex')}`;
        } else if (v !== null && v !== undefined) {
          value = Number.isFinite(Number(v)) ? Number(v) : String(v);
        }
        return { oid: vb.oid ?? '', type: String(vb.type ?? ''), value };
      });

      // Tentukan trapType
      let trapType = 'unknown';
      if (pdu.type === snmp.PduType.TrapV2) {
        // SNMPv2c: cari snmpTrapOID.0 di varbinds
        const trapOidVb = varbinds.find(vb => vb.oid === '1.3.6.1.6.3.1.1.4.1.0');
        trapType = trapOidVb ? String(trapOidVb.value) : 'SNMPv2c Trap';
      } else if (pdu.type === snmp.PduType.Trap) {
        // SNMPv1
        trapType = trapTypeName(pdu.generic ?? 6);
      }

      const severity = classifySeverity(trapType, varbinds);

      addTrap({
        sourceIp,
        community:  notification.pdu?.community ?? 'unknown',
        trapType,
        enterprise: pdu.enterprise,
        varbinds,
        severity,
      });

      console.log(`[TrapListener] ${severity.toUpperCase()} trap dari ${sourceIp}: ${trapType}`);
    } catch (e) {
      console.error('[TrapListener] Parse error:', e);
    }
  }
);

console.log(`✅ SNMP Trap Listener aktif — mendengarkan UDP ${BIND_ADDR}:${PORT}`);
console.log(`   Trap events bisa dibaca via GET http://localhost:3090/api/snmp/traps`);
console.log(`   Tekan Ctrl+C untuk berhenti.\n`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[TrapListener] Menghentikan listener...');
  try { receiver.close(); } catch { /* ignore */ }
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { receiver.close(); } catch { /* ignore */ }
  process.exit(0);
});
