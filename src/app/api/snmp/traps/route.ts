import { NextResponse } from 'next/server';
import { getTraps, acknowledgeTrap, clearTraps, getTrapStats } from '@/src/lib/snmp/trap-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/snmp/traps
 * Query params:
 *   limit  - jumlah trap yang dikembalikan (default 50)
 *   source - filter berdasarkan IP sumber (opsional)
 *
 * Return: { traps, stats }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit  = parseInt(searchParams.get('limit') || '50');
  const source = searchParams.get('source') || null;

  let traps = getTraps(limit);
  if (source) {
    traps = traps.filter(t => t.sourceIp === source);
  }

  return NextResponse.json({
    traps,
    stats: getTrapStats(),
  });
}

/**
 * PATCH /api/snmp/traps
 * Body: { id: string }  → acknowledge trap
 * Body: { clear: true } → hapus semua trap
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (body.clear === true) {
      clearTraps();
      return NextResponse.json({ ok: true, message: 'Semua trap dihapus' });
    }

    if (body.id) {
      const ok = acknowledgeTrap(body.id);
      return NextResponse.json({ ok, message: ok ? 'Trap di-acknowledge' : 'Trap tidak ditemukan' });
    }

    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
