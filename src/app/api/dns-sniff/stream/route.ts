import { NextRequest } from 'next/server';
import dnsSniffer, { DnsQuery } from '@/src/lib/dns-sniffer';

export const dynamic = 'force-dynamic';

/**
 * SSE (Server-Sent Events) endpoint untuk streaming DNS query secara real-time.
 * Frontend cukup membuka EventSource('/api/dns-sniff/stream') untuk mendapatkan update live.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Listener untuk setiap DNS query baru
      const onQuery = (query: DnsQuery) => {
        try {
          const data = JSON.stringify(query);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream mungkin sudah ditutup
        }
      };

      dnsSniffer.on('query', onQuery);

      // Heartbeat setiap 15 detik agar koneksi tidak timeout
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup saat koneksi client ditutup
      request.signal.addEventListener('abort', () => {
        dnsSniffer.off('query', onQuery);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* ignore */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
