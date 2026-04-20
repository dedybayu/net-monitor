/**
 * SNMP Trap Store
 * ---------------
 * In-memory store yang menyimpan SNMP trap events yang diterima oleh trap-listener.ts
 * Trap-listener menulis ke sini, API /api/snmp/traps membaca dari sini.
 *
 * Menggunakan globalThis agar tidak ter-reset saat Next.js hot-reload di development.
 */

export interface TrapEvent {
  id: string;
  receivedAt: string;       // ISO timestamp
  sourceIp: string;
  community: string;
  trapType: string;          // e.g. "coldStart", "linkDown", "enterpriseSpecific"
  enterprise?: string;       // OID enterprise (jika ada)
  varbinds: Array<{
    oid: string;
    type: string;
    value: string | number;
  }>;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
}

// Simpan di globalThis agar survives hot-reload Next.js
declare global {
  // eslint-disable-next-line no-var
  var __snmpTrapStore: TrapEvent[] | undefined;
}

const MAX_TRAPS = 100; // Simpan maksimal 100 trap terbaru

function getStore(): TrapEvent[] {
  if (!global.__snmpTrapStore) {
    global.__snmpTrapStore = [];
  }
  return global.__snmpTrapStore;
}

export function addTrap(event: Omit<TrapEvent, 'id' | 'receivedAt' | 'acknowledged'>): TrapEvent {
  const store = getStore();
  const trap: TrapEvent = {
    ...event,
    id: `trap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    receivedAt: new Date().toISOString(),
    acknowledged: false,
  };
  store.unshift(trap); // Terbaru di depan
  if (store.length > MAX_TRAPS) store.splice(MAX_TRAPS);
  console.log(`[TrapStore] Trap baru dari ${event.sourceIp}: ${event.trapType} (${event.severity})`);
  return trap;
}

export function getTraps(limit = 50): TrapEvent[] {
  return getStore().slice(0, limit);
}

export function acknowledgeTrap(id: string): boolean {
  const trap = getStore().find(t => t.id === id);
  if (trap) {
    trap.acknowledged = true;
    return true;
  }
  return false;
}

export function clearTraps(): void {
  global.__snmpTrapStore = [];
}

export function getTrapStats() {
  const store = getStore();
  return {
    total: store.length,
    unacknowledged: store.filter(t => !t.acknowledged).length,
    critical: store.filter(t => t.severity === 'critical' && !t.acknowledged).length,
    warning: store.filter(t => t.severity === 'warning' && !t.acknowledged).length,
  };
}
