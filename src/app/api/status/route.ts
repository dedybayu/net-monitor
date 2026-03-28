import { NextResponse } from 'next/server';
import { getCache, registerAndStart } from '@/lib/monitor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targets } = body; // Mengharapkan { "targets": [{ "ip": "...", "port": 3000 }, ...] }

    if (Array.isArray(targets) && targets.length > 0) {
      targets.forEach((node: { ip: string; port?: number }) => {
        // Daftarkan ke background worker
        // Jika port tidak ada (ICMP), kita kirim 0 atau null sesuai logika lib/monitor Anda
        registerAndStart(node.ip, node.port || 0);
      });
    }

    return NextResponse.json({
      nodes: getCache(),
      serverTimestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}