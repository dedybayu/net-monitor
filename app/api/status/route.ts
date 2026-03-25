import { NextResponse } from 'next/server';
import { getCache, registerAndStart } from '@/lib/monitor';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip');
  const port = searchParams.get('port');

  if (ip && port) {
    // Daftarkan IP ini ke background worker
    registerAndStart(ip, parseInt(port));
  }

  return NextResponse.json({
    nodes: getCache(),
    serverTimestamp: new Date().toISOString()
  });
}