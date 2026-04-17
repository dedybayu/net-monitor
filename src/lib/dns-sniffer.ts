
/**
 * DNS Sniffer Singleton
 * 
 * Cara kerja:
 * - Membuka UDP socket pada port 53 (DNS) di semua interface
 * - Setiap paket DNS query yang masuk ke server ini diparse menggunakan `dns-packet`
 * - Data query disimpan di ring buffer (maks 500 entri)
 * - Event emitter membroadcast ke semua SSE listener aktif
 * 
 * CATATAN PENTING:
 * Agar dapat menangkap DNS dari seluruh perangkat di jaringan,
 * server Next.js ini harus dikonfigurasi sebagai DNS Forwarder untuk perangkat lain.
 * Caranya: ubah DNS server perangkat klien ke IP server ini.
 * (Atau ubah DNS di DHCP Router jika ingin semua device terpantau sekaligus)
 */

import { createSocket, Socket } from 'dgram';
import { EventEmitter } from 'events';

// Dinamis import agar tidak crash jika dns-packet tidak tersedia
let dnsPacket: any = null;
try {
  dnsPacket = require('dns-packet');
} catch {
  console.warn('[DNS Sniffer] dns-packet tidak ditemukan. Menjalankan mode demo.');
}

export interface DnsQuery {
  id: string;
  timestamp: number;
  clientIp: string;
  domain: string;
  type: string;   // A, AAAA, CNAME, MX, etc.
  category: string; // social, streaming, search, etc.
}

// Kategorisasi sederhana berdasarkan domain
function categorize(domain: string): string {
  const d = domain.toLowerCase();
  if (/youtube\.com|netflix\.com|spotify\.com|twitch\.tv|vimeo\.com|tiktok\.com|disneyplus|hbo/.test(d)) return 'Streaming';
  if (/instagram\.com|facebook\.com|twitter\.com|x\.com|whatsapp\.com|snapchat\.com|threads\.net|linkedin\.com|tiktok\.com/.test(d)) return 'Media Sosial';
  if (/google\.com|google\.co\.id|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.com/.test(d)) return 'Pencarian';
  if (/shopee\.co\.id|tokopedia\.com|lazada\.co\.id|bukalapak\.com|amazon\.com/.test(d)) return 'E-Commerce';
  if (/zoom\.us|meet\.google|teams\.microsoft|webex\.com|discord\.com|slack\.com/.test(d)) return 'Komunikasi';
  if (/github\.com|gitlab\.com|stackoverflow\.com|npmjs\.com|cloudflare\.com/.test(d)) return 'Developer';
  if (/gstatic\.com|googleapis\.com|doubleclick\.net|googlesyndication|adnxs\.com|ads\./.test(d)) return 'Iklan / Analytics';
  if (/windows\.com|microsoft\.com|apple\.com|akamai\.com|cdn\./.test(d)) return 'CDN / Update';
  return 'Lainnya';
}

class DnsSnifferService extends EventEmitter {
  private static instance: DnsSnifferService;
  private socket: Socket | null = null;
  public queries: DnsQuery[] = [];
  public isRunning = false;
  public error: string | null = null;
  private demoInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): DnsSnifferService {
    if (!DnsSnifferService.instance) {
      DnsSnifferService.instance = new DnsSnifferService();
    }
    return DnsSnifferService.instance;
  }

  getStats() {
    const domainCount: Record<string, number> = {};
    const clientCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};

    for (const q of this.queries) {
      domainCount[q.domain] = (domainCount[q.domain] || 0) + 1;
      clientCount[q.clientIp] = (clientCount[q.clientIp] || 0) + 1;
      categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
    }

    const topDomains = Object.entries(domainCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    const topClients = Object.entries(clientCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    const categoryBreakdown = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return { topDomains, topClients, categoryBreakdown, total: this.queries.length };
  }

  start() {
    if (this.isRunning) return;

    if (!dnsPacket) {
      this.startDemoMode();
      return;
    }

    try {
      this.socket = createSocket('udp4');

      this.socket.on('message', (buf: Buffer, rinfo: { address: string }) => {
        try {
          const packet = dnsPacket.decode(buf);
          if (packet.type === 'query' && packet.questions) {
            for (const q of packet.questions) {
              if (!q.name) continue;
              const entry: DnsQuery = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: Date.now(),
                clientIp: rinfo.address,
                domain: q.name,
                type: q.type || 'A',
                category: categorize(q.name),
              };
              this.queries.unshift(entry);
              if (this.queries.length > 500) this.queries.pop();
              this.emit('query', entry);
            }
          }
        } catch {
          // Abaikan paket yang tidak valid
        }
      });

      this.socket.on('error', (err: Error) => {
        if (err.message.includes('EACCES') || err.message.includes('EADDRINUSE')) {
          this.error = `Port 53 tidak bisa dibuka: ${err.message}. Coba jalankan sebagai Administrator, atau ubah DNS klien ke port lain.`;
          this.startDemoMode();
        } else {
          this.error = err.message;
        }
      });

      this.socket.bind(53, () => {
        this.isRunning = true;
        this.error = null;
        console.log('[DNS Sniffer] Listening on UDP port 53');
      });

    } catch (err: any) {
      this.error = err.message;
      this.startDemoMode();
    }
  }

  private startDemoMode() {
    const DEMO_DOMAINS: Array<[string, string]> = [
      ['youtube.com', 'Streaming'],
      ['instagram.com', 'Media Sosial'],
      ['google.com', 'Pencarian'],
      ['shopee.co.id', 'E-Commerce'],
      ['tokopedia.com', 'E-Commerce'],
      ['facebook.com', 'Media Sosial'],
      ['tiktok.com', 'Media Sosial'],
      ['zoom.us', 'Komunikasi'],
      ['github.com', 'Developer'],
      ['netflix.com', 'Streaming'],
      ['spotify.com', 'Streaming'],
      ['gstatic.com', 'CDN / Update'],
      ['discord.com', 'Komunikasi'],
      ['whatsapp.com', 'Komunikasi'],
      ['bing.com', 'Pencarian'],
    ];
    const DEMO_IPS = ['192.168.1.10', '192.168.1.11', '192.168.1.15', '192.168.1.20', '192.168.1.5'];

    this.isRunning = true;
    this.error = this.error
      ? `[MODE DEMO] ${this.error}`
      : '[MODE DEMO] Port 53 tidak aktif. Menampilkan data simulasi. Untuk data nyata, jalankan sebagai Admin dan arahkan DNS klien ke server ini.';

    this.demoInterval = setInterval(() => {
      const [domain, category] = DEMO_DOMAINS[Math.floor(Math.random() * DEMO_DOMAINS.length)];
      const clientIp = DEMO_IPS[Math.floor(Math.random() * DEMO_IPS.length)];
      const types = ['A', 'AAAA', 'A', 'A']; // A lebih sering
      const entry: DnsQuery = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        clientIp,
        domain,
        type: types[Math.floor(Math.random() * types.length)],
        category,
      };
      this.queries.unshift(entry);
      if (this.queries.length > 500) this.queries.pop();
      this.emit('query', entry);
    }, 1500);
  }

  stop() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
    this.isRunning = false;
  }

  clearQueries() {
    this.queries = [];
  }
}

// Export singleton dan auto-start
const dnsSniffer = DnsSnifferService.getInstance();

// Auto-start hanya di server side (bukan build time)
if (typeof window === 'undefined' && !dnsSniffer.isRunning) {
  dnsSniffer.start();
}

export default dnsSniffer;

