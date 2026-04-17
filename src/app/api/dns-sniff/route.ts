import { NextResponse } from 'next/server';
import dnsSniffer from '@/src/lib/dns-sniffer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = dnsSniffer.getStats();

  return NextResponse.json({
    isRunning: dnsSniffer.isRunning,
    isDemo: dnsSniffer.error?.includes('MODE DEMO') ?? false,
    warning: dnsSniffer.error,
    queries: dnsSniffer.queries.slice(0, 100), // Kirim 100 terbaru ke client
    stats,
  });
}

export async function DELETE() {
  dnsSniffer.clearQueries();
  return NextResponse.json({ success: true, message: 'Riwayat DNS dihapus.' });
}
